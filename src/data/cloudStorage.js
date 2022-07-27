import config from "../config/index.js";
import axios from "axios";
import {AbortController} from "@aws-sdk/abort-controller";
import {
    DeleteObjectCommand,
    DeleteObjectsCommand,
    HeadObjectCommand,
    ListObjectsCommand,
    PutObjectCommand,
    CreateBucketCommand,
    S3Client
} from "@aws-sdk/client-s3";
import ytdl from "ytdl-core";
import sharp from "sharp";
import {getAllS3CastImageDB, getAllS3PostersDB, getAllS3TrailersDB} from "./db/s3FilesDB.js";
import {saveError} from "../error/saveError.js";


const s3 = new S3Client({
    region: 'default',
    forcePathStyle: false,
    endpoint: config.cloudStorage.endpoint,
    credentials: {
        accessKeyId: config.cloudStorage.accessKeyId,
        secretAccessKey: config.cloudStorage.secretAccessKey,
    },
});

// s3 error codes:
// 500: internal error
// 502: gateway error
// 503: too many request to prefix
// 504: gateway timeout

export const bucketsEndpointSuffix = config.cloudStorage.endpoint.replace(/https?:\/\//, '');

const defaultProfileUrl = `https://serverstatic.${bucketsEndpointSuffix}/defaultProfile.png`;
export const defaultProfileImage = (await getFileSize(defaultProfileUrl)) > 0 ? defaultProfileUrl : '';

export const bucketNames = Object.freeze(['serverstatic', 'cast', 'download-subtitle', 'poster', 'download-trailer', 'profile-image']);

export const bucketNamesObject = Object.freeze({
    staticFiles: 'serverstatic',
    cast: 'cast',
    downloadSubtitle: 'download-subtitle',
    poster: 'poster',
    downloadTrailer: 'download-trailer',
    profileImage: 'profile-image',
})

export function getS3Client() {
    return s3;
}

export async function uploadCastImageToS3ByURl(name, tvmazePersonID, jikanPersonID, originalUrl, retryCounter = 0, retryWithSleepCounter = 0) {
    try {
        if (!originalUrl) {
            return null;
        }
        if (retryCounter === 0) {
            let s3CastImage = await checkCastImageExist(name, tvmazePersonID, jikanPersonID);
            if (s3CastImage) {
                return {
                    url: s3CastImage,
                    originalUrl: "",
                    size: await getFileSize(s3CastImage),
                };
            }
        }
        let fileName = getFileName(name, '', tvmazePersonID, jikanPersonID, 'jpg');
        let fileUrl = `https://${bucketNamesObject.cast}.${bucketsEndpointSuffix}/${fileName}`;
        let response = await axios.get(originalUrl, {
            responseType: "arraybuffer",
            responseEncoding: "binary"
        });
        let dataBuffer = await compressImage(response.data);

        const params = {
            ContentType: response.headers["content-type"],
            ContentLength: dataBuffer.length.toString(),
            Bucket: 'cast',
            Body: dataBuffer,
            Key: fileName,
            ACL: 'public-read',
        };
        let command = new PutObjectCommand(params);
        await s3.send(command);
        return {
            url: fileUrl,
            originalUrl: originalUrl,
            size: Number(dataBuffer.length),
        };
    } catch (error) {
        if (error.code === 'ENOTFOUND' && retryCounter < 2) {
            retryCounter++;
            await new Promise((resolve => setTimeout(resolve, 200)));
            return await uploadCastImageToS3ByURl(name, tvmazePersonID, jikanPersonID, originalUrl, retryCounter, retryWithSleepCounter);
        }
        if (error.response && error.response.status >= 500 && retryWithSleepCounter < 2) {
            retryWithSleepCounter++;
            await new Promise((resolve => setTimeout(resolve, 1000)));
            return await uploadCastImageToS3ByURl(name, tvmazePersonID, jikanPersonID, originalUrl, retryCounter, retryWithSleepCounter);
        }
        if (error.code === 'ERR_UNESCAPED_CHARACTERS') {
            if (decodeURIComponent(originalUrl) === originalUrl) {
                let temp = originalUrl.replace(/\/$/, '').split('/').pop();
                if (temp) {
                    let url = originalUrl.replace(temp, encodeURIComponent(temp));
                    retryCounter++;
                    await new Promise((resolve => setTimeout(resolve, 200)));
                    return await uploadCastImageToS3ByURl(name, tvmazePersonID, jikanPersonID, url, retryCounter, retryWithSleepCounter);
                }
            }
            error.isAxiosError = true;
            error.url = originalUrl;
            error.filePath = 'cloudStorage > uploadCastImageToS3ByURl';
            await saveError(error);
            return null;
        }
        if ((!error.response || error.response.status !== 404) || !originalUrl.includes('cdn.myanimelist.')) {
            //do not save myanimelist 404 images errors
            saveError(error);
        }
        return null;
    }
}

export async function uploadSubtitleToS3ByURl(fileName, cookie, originalUrl, retryCounter = 0, retryWithSleepCounter = 0) {
    try {
        if (!originalUrl) {
            return null;
        }
        if (retryCounter === 0) {
            let s3Subtitle = await checkSubtitleExist(fileName);
            if (s3Subtitle) {
                return {
                    url: s3Subtitle,
                    originalUrl: "",
                    size: await getFileSize(s3Subtitle),
                };
            }
        }
        let response = await axios.get(originalUrl, {
            responseType: "arraybuffer",
            responseEncoding: "binary",
            headers: {
                Cookie: cookie,
            }
        });
        const params = {
            ContentType: response.headers["content-type"],
            ContentLength: response.data.length.toString(),
            Bucket: bucketNamesObject.downloadSubtitle,
            Body: response.data,
            Key: fileName,
            ACL: 'public-read',
        };
        let command = new PutObjectCommand(params);
        await s3.send(command);
        return {
            url: `https://${bucketNamesObject.downloadSubtitle}.${bucketsEndpointSuffix}/${fileName}`,
            originalUrl: originalUrl,
            size: Number(response.data.length),
        };
    } catch (error) {
        if (error.code === 'ENOTFOUND' && retryCounter < 2) {
            retryCounter++;
            await new Promise((resolve => setTimeout(resolve, 200)));
            return await uploadSubtitleToS3ByURl(originalUrl, fileName, cookie, retryCounter, retryWithSleepCounter);
        }
        if (error.response && error.response.status >= 500 && retryWithSleepCounter < 2) {
            retryWithSleepCounter++;
            await new Promise((resolve => setTimeout(resolve, 1000)));
            return await uploadSubtitleToS3ByURl(originalUrl, fileName, cookie, retryCounter, retryWithSleepCounter);
        }
        if (error.code === 'ERR_UNESCAPED_CHARACTERS') {
            error.isAxiosError = true;
            error.url = originalUrl;
            error.filePath = 'cloudStorage > uploadSubtitleToS3ByURl';
        }
        saveError(error);
        return null;
    }
}

export async function uploadTitlePosterToS3(title, type, year, originalUrl, retryCounter = 0, forceUpload = false, retryWithSleepCounter = 0) {
    try {
        if (!originalUrl) {
            return null;
        }
        if (retryCounter === 0 && !forceUpload) {
            let s3Poster = await checkTitlePosterExist(title, type, year);
            if (s3Poster) {
                return {
                    url: s3Poster,
                    originalUrl: "",
                    originalSize: 0,
                    size: await getFileSize(s3Poster),
                };
            }
        }

        let fileName = getFileName(title, type, year, '', 'jpg');
        let fileUrl = `https://${bucketNamesObject.poster}.${bucketsEndpointSuffix}/${fileName}`;
        let response = await axios.get(originalUrl, {
            responseType: "arraybuffer",
            responseEncoding: "binary"
        });
        let dataBuffer = await compressImage(response.data);

        const params = {
            ContentType: response.headers["content-type"],
            ContentLength: dataBuffer.length.toString(),
            Bucket: 'poster',
            Body: dataBuffer,
            Key: fileName,
            ACL: 'public-read',
        };
        let command = new PutObjectCommand(params);
        await s3.send(command);
        return {
            url: fileUrl,
            originalUrl: originalUrl,
            originalSize: Number(response.data.length),
            size: Number(dataBuffer.length),
        };
    } catch (error) {
        if (((error.response && error.response.status === 404) || error.code === 'ERR_UNESCAPED_CHARACTERS') &&
            decodeURIComponent(originalUrl) === originalUrl && retryCounter < 3) {
            retryCounter++;
            let fileName = originalUrl.replace(/\/$/, '').split('/').pop();
            originalUrl = originalUrl.replace(fileName, encodeURIComponent(fileName));
            return await uploadTitlePosterToS3(title, type, year, originalUrl, retryCounter, forceUpload, retryWithSleepCounter);
        }
        if (error.code === 'ENOTFOUND' && retryCounter < 2) {
            retryCounter++;
            await new Promise((resolve => setTimeout(resolve, 200)));
            return await uploadTitlePosterToS3(title, type, year, originalUrl, retryCounter, forceUpload, retryWithSleepCounter);
        }
        if (error.response && error.response.status >= 500 && retryWithSleepCounter < 2) {
            retryWithSleepCounter++;
            await new Promise((resolve => setTimeout(resolve, 1000)));
            return await uploadTitlePosterToS3(title, type, year, originalUrl, retryCounter, forceUpload, retryWithSleepCounter);
        }
        if ((!error.response || error.response.status !== 404) && error.code !== 'ENOTFOUND') {
            //do not save 404|ENOTFOUND images errors
            saveError(error);
        }
        return null;
    }
}

export async function uploadTitleTrailerFromYoutubeToS3(title, type, year, originalUrl, retryCounter = 0, retryWithSleepCounter = 0) {
    try {
        if (!originalUrl) {
            return null;
        }
        if (retryCounter === 0) {
            let s3Trailer = await checkTitleTrailerExist(title, type, year);
            if (s3Trailer) {
                return {
                    url: s3Trailer,
                    originalUrl: "",
                    size: await getFileSize(s3Trailer),
                };
            }
        }

        let fileName = getFileName(title, type, year, '', 'mp4');
        let fileUrl = `https://${bucketNamesObject.downloadTrailer}.${bucketsEndpointSuffix}/${fileName}`;
        return await new Promise(async (resolve, reject) => {
            const abortController = new AbortController();
            let videoReadStream = null;
            try {
                videoReadStream = ytdl(originalUrl, {
                    filter: 'audioandvideo',
                    quality: "highestvideo",
                    highWaterMark: 1 << 25,
                });

                videoReadStream.on('error', (err) => {
                    videoReadStream.destroy();
                    videoReadStream.emit('close');
                    abortController.abort();
                    reject(err);
                });

                const params = {
                    Bucket: bucketNamesObject.downloadTrailer,
                    Body: videoReadStream,
                    Key: fileName,
                    ACL: 'public-read',
                };
                let command = new PutObjectCommand(params);
                await s3.send(command, {abortSignal: abortController.signal});
                resolve({
                    url: fileUrl,
                    originalUrl: originalUrl,
                    size: await getFileSize(fileUrl),
                });
            } catch (error2) {
                if (videoReadStream) {
                    videoReadStream.destroy();
                }
                reject(error2);
            }
        });

    } catch (error) {
        if ((error.code === 'ENOTFOUND' || error.code === 'ECONNRESET' || error.statusCode === 410) && retryCounter < 4) {
            retryCounter++;
            await new Promise((resolve => setTimeout(resolve, 2000)));
            return await uploadTitleTrailerFromYoutubeToS3(title, type, year, originalUrl, retryCounter, retryWithSleepCounter);
        }
        if (error.response && (error.response.status === 429 || error.response.status >= 500) && retryWithSleepCounter < 2) {
            retryWithSleepCounter++;
            await new Promise((resolve => setTimeout(resolve, 2000)));
            return await uploadTitleTrailerFromYoutubeToS3(title, type, year, originalUrl, retryCounter, retryWithSleepCounter);
        }
        if (error.name !== "AbortError") {
            saveError(error);
        }
        return null;
    }
}

//------------------------------------------
//------------------------------------------

export async function checkCastImageExist(name, tvmazePersonID, jikanPersonID, retryCounter = 0, retryWithSleepCounter = 0) {
    let fileName = getFileName(name, '', tvmazePersonID, jikanPersonID, 'jpg');
    let fileUrl = `https://${bucketNamesObject.cast}.${bucketsEndpointSuffix}/${fileName}`;
    try {
        const params = {
            Bucket: 'cast',
            Key: fileName,
        };
        let command = new HeadObjectCommand(params);
        let result = await s3.send(command);
        if (result['$metadata'].httpStatusCode === 200) {
            return fileUrl;
        }
        return '';
    } catch (error) {
        if (error.code === 'ENOTFOUND' && retryCounter < 2) {
            retryCounter++;
            await new Promise((resolve => setTimeout(resolve, 200)));
            return await checkCastImageExist(name, tvmazePersonID, jikanPersonID, retryCounter, retryWithSleepCounter);
        }
        if (error.response && error.response.status >= 500 && retryWithSleepCounter < 2) {
            retryWithSleepCounter++;
            await new Promise((resolve => setTimeout(resolve, 1000)));
            return await checkCastImageExist(name, tvmazePersonID, jikanPersonID, retryCounter, retryWithSleepCounter);
        }
        let statusCode = error['$metadata'].httpStatusCode;
        if (statusCode !== 404 && statusCode !== 200) {
            saveError(error);
        }
        return statusCode !== 404 ? fileUrl : '';
    }
}

export async function checkSubtitleExist(fileName, retryCounter = 0, retryWithSleepCounter = 0) {
    let fileUrl = `https://${bucketNamesObject.downloadSubtitle}.${bucketsEndpointSuffix}/${fileName}`;
    try {
        const params = {
            Bucket: bucketNamesObject.downloadSubtitle,
            Key: fileName,
        };
        let command = new HeadObjectCommand(params);
        let result = await s3.send(command);
        if (result['$metadata'].httpStatusCode === 200) {
            return fileUrl;
        }
        return '';
    } catch (error) {
        if (error.code === 'ENOTFOUND' && retryCounter < 2) {
            retryCounter++;
            await new Promise((resolve => setTimeout(resolve, 200)));
            return await checkSubtitleExist(fileName, retryCounter, retryWithSleepCounter);
        }
        if (error.response && error.response.status >= 500 && retryWithSleepCounter < 2) {
            retryWithSleepCounter++;
            await new Promise((resolve => setTimeout(resolve, 1000)));
            return await checkSubtitleExist(fileName, retryCounter, retryWithSleepCounter);
        }
        let statusCode = error['$metadata'].httpStatusCode;
        if (statusCode !== 404 && statusCode !== 200) {
            saveError(error);
        }
        return statusCode !== 404 ? fileUrl : '';
    }
}

export async function checkTitlePosterExist(title, type, year, retryCounter = 0, retryWithSleepCounter = 0) {
    let fileName = getFileName(title, type, year, '', 'jpg');
    let fileUrl = `https://${bucketNamesObject.poster}.${bucketsEndpointSuffix}/${fileName}`;
    try {
        const params = {
            Bucket: 'poster',
            Key: fileName,
        };
        let command = new HeadObjectCommand(params);
        let result = await s3.send(command);
        if (result['$metadata'].httpStatusCode === 200) {
            return fileUrl;
        }
        return '';
    } catch (error) {
        if (error.code === 'ENOTFOUND' && retryCounter < 2) {
            retryCounter++;
            await new Promise((resolve => setTimeout(resolve, 200)));
            return await checkTitlePosterExist(title, type, year, retryCounter, retryWithSleepCounter);
        }
        if (error.response && error.response.status >= 500 && retryWithSleepCounter < 2) {
            retryWithSleepCounter++;
            await new Promise((resolve => setTimeout(resolve, 1000)));
            return await checkTitlePosterExist(title, type, year, retryCounter, retryWithSleepCounter);
        }
        let statusCode = error['$metadata'].httpStatusCode;
        if (statusCode !== 404 && statusCode !== 200) {
            saveError(error);
        }
        return statusCode !== 404 ? fileUrl : '';
    }
}

export async function checkTitleTrailerExist(title, type, year, retryCounter = 0, retryWithSleepCounter = 0) {
    let fileName = getFileName(title, type, year, '', 'mp4');
    let fileUrl = `https://${bucketNamesObject.downloadTrailer}.${bucketsEndpointSuffix}/${fileName}`;
    try {
        const params = {
            Bucket: bucketNamesObject.downloadTrailer,
            Key: fileName,
        };
        let command = new HeadObjectCommand(params);
        let result = await s3.send(command);
        if (result['$metadata'].httpStatusCode === 200) {
            return fileUrl;
        }
        if (year) {
            return await checkTitleTrailerExist(title, type, '');
        }
        return '';
    } catch (error) {
        if (error.code === 'ENOTFOUND' && retryCounter < 2) {
            retryCounter++;
            await new Promise((resolve => setTimeout(resolve, 200)));
            return await checkTitleTrailerExist(title, type, year, retryCounter, retryWithSleepCounter);
        }
        if (error.response && (error.response.status === 429 || error.response.status >= 500) && retryWithSleepCounter < 2) {
            retryWithSleepCounter++;
            await new Promise((resolve => setTimeout(resolve, 1000)));
            return await checkTitleTrailerExist(title, type, year, retryCounter, retryWithSleepCounter);
        }
        let statusCode = error['$metadata'].httpStatusCode;
        if (statusCode !== 404 && statusCode !== 200) {
            saveError(error);
        }
        return statusCode !== 404 ? fileUrl : '';
    }
}

//------------------------------------------
//------------------------------------------

export async function removeProfileImageFromS3(fileName, retryCounter = 0) {
    let result = await deleteFileFromS3(bucketNamesObject.profileImage, fileName);
    if (result === 'error' && retryCounter < 2) {
        retryCounter++;
        await new Promise((resolve => setTimeout(resolve, 200)));
        return await removeProfileImageFromS3(fileName, retryCounter);
    }
    return result;
}

export async function deleteFileFromS3(bucketName, fileName, retryCounter = 0, retryWithSleepCounter = 0) {
    try {
        const params = {
            Bucket: bucketName,
            Key: fileName,
        };
        let command = new DeleteObjectCommand(params);
        await s3.send(command);
        return 'ok';
    } catch (error) {
        if (error.code === 'ENOTFOUND' && retryCounter < 2) {
            retryCounter++;
            await new Promise((resolve => setTimeout(resolve, 200)));
            return await deleteFileFromS3(bucketName, fileName, retryCounter, retryWithSleepCounter);
        }
        if (error.response && error.response.status >= 500 && retryWithSleepCounter < 2) {
            retryWithSleepCounter++;
            await new Promise((resolve => setTimeout(resolve, 1000)));
            return await deleteFileFromS3(bucketName, fileName, retryCounter, retryWithSleepCounter);
        }
        saveError(error);
        return 'error';
    }
}

export async function deleteMultipleFilesFromS3(bucketName, filesNames, retryCounter = 0, retryWithSleepCounter = 0) {
    try {
        const params = {
            Bucket: bucketName,
            Delete: {
                Objects: filesNames.map(item => ({Key: item})),
            },
        };
        let command = new DeleteObjectsCommand(params);
        await s3.send(command);
        return 'ok';
    } catch (error) {
        if (error.code === 'ENOTFOUND' && retryCounter < 2) {
            retryCounter++;
            await new Promise((resolve => setTimeout(resolve, 200)));
            return await deleteMultipleFilesFromS3(bucketName, filesNames, retryCounter, retryWithSleepCounter);
        }
        if (error.response && error.response.status >= 500 && retryWithSleepCounter < 2) {
            retryWithSleepCounter++;
            await new Promise((resolve => setTimeout(resolve, 1000)));
            return await deleteMultipleFilesFromS3(bucketName, filesNames, retryCounter, retryWithSleepCounter);
        }
        saveError(error);
        return 'error';
    }
}

export async function deleteTrailerFromS3(fileName, retryCounter = 0, retryWithSleepCounter = 0) {
    try {
        const params = {
            Bucket: bucketNamesObject.downloadTrailer,
            Key: fileName,
        };
        let command = new DeleteObjectCommand(params);
        await s3.send(command);
        return true;
    } catch (error) {
        if (error.code === 'ENOTFOUND' && retryCounter < 2) {
            retryCounter++;
            await new Promise((resolve => setTimeout(resolve, 200)));
            return await deleteTrailerFromS3(fileName, retryCounter, retryWithSleepCounter);
        }
        if (error.response && error.response.status >= 500 && retryWithSleepCounter < 2) {
            retryWithSleepCounter++;
            await new Promise((resolve => setTimeout(resolve, 1000)));
            return await deleteTrailerFromS3(fileName, retryCounter, retryWithSleepCounter);
        }
        saveError(error);
        return false;
    }
}

export async function deleteUnusedFiles(retryCounter = 0) {
    try {
        let checkBuckets = [bucketNamesObject.poster, bucketNamesObject.downloadTrailer, bucketNamesObject.cast];

        for (let k = 0; k < checkBuckets.length; k++) {
            let dataBaseFiles = [];
            // files that are in use
            if (checkBuckets[k] === bucketNamesObject.poster) {
                dataBaseFiles = await getAllS3PostersDB();
                if (!dataBaseFiles) {
                    continue;
                }
                dataBaseFiles = dataBaseFiles.map(item => item.poster_s3.url.split('/').pop());
            } else if (checkBuckets[k] === bucketNamesObject.downloadTrailer) {
                dataBaseFiles = await getAllS3TrailersDB();
                if (!dataBaseFiles) {
                    continue;
                }
                dataBaseFiles = dataBaseFiles.map(item => item.trailer_s3.url.split('/').pop());
            }
            if (checkBuckets[k] === bucketNamesObject.cast) {
                dataBaseFiles = await getAllS3CastImageDB();
                if (!dataBaseFiles) {
                    continue;
                }
                dataBaseFiles = dataBaseFiles.map(item => item.imageData.url.split('/').pop());
            }

            let lastKey = '';
            let deleteCounter = 0;
            while (true) {
                const params = {
                    Bucket: checkBuckets[k],
                    MaxKeys: 1000,
                };
                if (lastKey) {
                    params.Marker = lastKey;
                }
                let command = new ListObjectsCommand(params);
                let response = await s3.send(command);
                let files = response.Contents;
                if (!files || files.length === 0) {
                    break;
                }
                let promiseArray = [];
                for (let i = 0; i < files.length; i++) {
                    if (dataBaseFiles.includes(files[i].Key)) {
                        lastKey = files[i].Key;
                    } else {
                        deleteCounter++;
                        let deletePromise = deleteFileFromS3(checkBuckets[k], files[i].Key);
                        promiseArray.push(deletePromise);
                    }
                }
                await Promise.allSettled(promiseArray);
            }
        }
        return 'ok';
    } catch (error) {
        if (retryCounter < 2) {
            retryCounter++;
            await new Promise((resolve => setTimeout(resolve, 5000)));
            return deleteUnusedFiles(retryCounter);
        }
        saveError(error);
        return 'error';
    }
}

export async function resetBucket(bucketName) {
    //use with caution
    const params = {
        Bucket: bucketName,
    };
    let command = new ListObjectsCommand(params);
    while (true) {
        try {
            let response = await s3.send(command);
            let files = response.Contents;
            if (!files || files.length === 0) {
                return true;
            }
            let promiseArray = [];
            for (let i = 0; i < files.length; i++) {
                let deleteCommand = new DeleteObjectCommand({
                    Bucket: bucketName,
                    Key: files[i].Key,
                })
                let deletePromise = s3.send(deleteCommand);
                promiseArray.push(deletePromise);
            }
            await Promise.allSettled(promiseArray);
        } catch (error) {
            saveError(error);
            return false;
        }
    }
}

//------------------------------------------
//------------------------------------------

export async function createBuckets() {
    try {
        console.log(`creating s3 buckets (${bucketNames.join(', ')})`);
        let promiseArray = [];
        for (let i = 0; i < bucketNames.length; i++) {
            let prom = createBucket(bucketNames[i]);
            promiseArray.push(prom);
        }
        await Promise.allSettled(promiseArray);
        console.log('creating s3 buckets --done!');
        console.log();
    } catch (error) {
        saveError(error);
    }
}

async function createBucket(bucketName, retryCounter = 0, retryWithSleepCounter = 0) {
    try {
        const params = {
            Bucket: bucketName,
            ACL: 'public-read', // 'private' | 'public-read'
        };
        let command = new CreateBucketCommand(params);
        let result = await s3.send(command);
        return true;
    } catch (error) {
        if (error.code === 'ENOTFOUND' && retryCounter < 2) {
            retryCounter++;
            await new Promise((resolve => setTimeout(resolve, 200)));
            return await createBucket(bucketName, retryCounter, retryWithSleepCounter);
        }
        if (error.response && error.response.status >= 500 && retryWithSleepCounter < 2) {
            retryWithSleepCounter++;
            await new Promise((resolve => setTimeout(resolve, 1000)));
            return await createBucket(bucketName, retryCounter, retryWithSleepCounter);
        }
        if (error.message === 'Cannot read property \'#text\' of undefined') {
            return true;
        }
        saveError(error);
        return false;
    }
}

//------------------------------------------
//------------------------------------------

function getFileName(title, titleType, year, extra, fileType) {
    let fileName = titleType + '-' + title + '-' + year + '-' + extra + '.' + fileType;
    fileName = fileName.trim()
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .replace(/^-/g, '')
        .replace('-.', '.');
    if (year && title.endsWith(year)) {
        fileName = fileName.replace(('-' + year), '');
    }
    return fileName;
}

async function getFileSize(url, retryCounter = 0, retryWithSleepCounter = 0) {
    try {
        let response = await axios.head(url);
        return Number(response.headers['content-length']) || 0;
    } catch (error) {
        if (((error.response && error.response.status === 404) || error.code === 'ERR_UNESCAPED_CHARACTERS') &&
            decodeURIComponent(url) === url && retryCounter < 1) {
            retryCounter++;
            let fileName = url.replace(/\/$/, '').split('/').pop();
            url = url.replace(fileName, encodeURIComponent(fileName));
            return await getFileSize(url, retryCounter, retryWithSleepCounter);
        }
        if (error.response && error.response.status >= 500 && retryWithSleepCounter < 2) {
            retryWithSleepCounter++;
            await new Promise((resolve => setTimeout(resolve, 1000)));
            return await getFileSize(url, retryCounter, retryWithSleepCounter);
        }
        if (!error.response || error.response.status !== 404) {
            saveError(error);
        }
        return 0;
    }
}

async function compressImage(responseData) {
    let dataBuffer = responseData;
    // reduce image size if size > 2MB
    if (responseData.length > 2 * 1024 * 1024) {
        let sharpQuality = (responseData.length > 10 * 1024 * 1024) ? 45 : 65;
        let temp = await sharp(responseData).jpeg({quality: sharpQuality}).toBuffer();
        let counter = 0;
        while ((temp.length / (1024 * 1024)) > 2 && counter < 4 && sharpQuality > 15) {
            counter++;
            if (temp.length > 3 * 1024 * 1024) {
                sharpQuality -= 25;
            } else {
                sharpQuality -= 15;
            }
            if (sharpQuality <= 0) {
                sharpQuality = 5;
            }
            temp = await sharp(responseData).jpeg({quality: sharpQuality}).toBuffer();
        }
        dataBuffer = temp;
    }
    return dataBuffer;
}
