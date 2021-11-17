import config from "../config";
import axios from "axios";
import axiosRetry from "axios-retry";
import {AbortController} from "@aws-sdk/abort-controller";
import {
    S3Client,
    PutObjectCommand,
    HeadObjectCommand,
    DeleteObjectCommand,
    ListObjectsCommand
} from "@aws-sdk/client-s3";
import ytdl from "ytdl-core";
import {saveError} from "../error/saveError";

axiosRetry(axios, {
    retries: 3, // number of retries
    retryDelay: (retryCount) => {
        return retryCount * 1000; // time interval between retries
    },
    retryCondition: (error) => (
        error.code === 'ECONNRESET' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNABORTED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'SlowDown' ||
        (error.response &&
            error.response.status !== 429 &&
            error.response.status !== 404 &&
            error.response.status !== 403)
    ),
});

const s3 = new S3Client({
    region: 'default',
    forcePathStyle: false,
    endpoint: config.cloudStorage.endpoint,
    credentials: {
        accessKeyId: config.cloudStorage.accessKeyId,
        secretAccessKey: config.cloudStorage.secretAccessKey,
    },
});

export async function uploadCastImageToS3ByURl(name, gender, tvmazePersonID, jikanPersonID, originalUrl, retryCounter = 0) {
    try {
        if (!originalUrl) {
            return null;
        }
        if (retryCounter === 0) {
            let s3CastImage = await checkCastImageExist(name, gender, tvmazePersonID, jikanPersonID);
            if (s3CastImage) {
                return {
                    url: s3CastImage,
                    originalUrl: "",
                    size: await getFileSize(s3CastImage),
                };
            }
        }
        let response = await axios.get(originalUrl, {
            responseType: "arraybuffer",
            responseEncoding: "binary"
        });
        let fileName = getFileName(name, gender, tvmazePersonID, jikanPersonID, 'jpg');
        let fileUrl = `https://cast.${config.cloudStorage.websiteEndPoint}/${fileName}`;
        const params = {
            ContentType: response.headers["content-type"],
            ContentLength: response.data.length.toString(),
            Bucket: 'cast',
            Body: response.data,
            Key: fileName,
            ACL: 'public-read',
        };
        let command = new PutObjectCommand(params);
        await s3.send(command);
        return {
            url: fileUrl,
            originalUrl: originalUrl,
            size: Number(response.data.length.toString()),
        };
    } catch (error) {
        if (error.code === 'ENOTFOUND' && retryCounter < 2) {
            retryCounter++;
            await new Promise((resolve => setTimeout(resolve, 200)));
            return await uploadCastImageToS3ByURl(name, gender, tvmazePersonID, jikanPersonID, retryCounter);
        }
        saveError(error);
        return null;
    }
}

export async function uploadSubtitleToS3ByURl(fileName, cookie, originalUrl, retryCounter = 0) {
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
            Bucket: 'download-subtitle',
            Body: response.data,
            Key: fileName,
            ACL: 'public-read',
        };
        let command = new PutObjectCommand(params);
        await s3.send(command);
        return {
            url: `https://download-subtitle.${config.cloudStorage.websiteEndPoint}/${fileName}`,
            originalUrl: originalUrl,
            size: Number(response.data.length.toString()),
        };
    } catch (error) {
        if (error.code === 'ENOTFOUND' && retryCounter < 2) {
            retryCounter++;
            await new Promise((resolve => setTimeout(resolve, 200)));
            return await uploadSubtitleToS3ByURl(originalUrl, fileName, cookie, retryCounter);
        }
        saveError(error);
        return null;
    }
}

export async function uploadTitlePosterToS3(title, type, year, originalUrl, retryCounter = 0, forceUpload = false) {
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
                    size: await getFileSize(s3Poster),
                };
            }
        }

        let fileName = getFileName(title, type, year, '', 'jpg');
        let fileUrl = `https://poster.${config.cloudStorage.websiteEndPoint}/${fileName}`;
        let response = await axios.get(originalUrl, {
            responseType: "arraybuffer",
            responseEncoding: "binary"
        });
        const params = {
            ContentType: response.headers["content-type"],
            ContentLength: response.data.length.toString(),
            Bucket: 'poster',
            Body: response.data,
            Key: fileName,
            ACL: 'public-read',
        };
        let command = new PutObjectCommand(params);
        await s3.send(command);
        return {
            url: fileUrl,
            originalUrl: originalUrl,
            size: Number(response.data.length.toString()),
        };
    } catch (error) {
        if (error.code === 'ENOTFOUND' && retryCounter < 2) {
            retryCounter++;
            await new Promise((resolve => setTimeout(resolve, 200)));
            return await uploadTitlePosterToS3(title, type, year, originalUrl, retryCounter, forceUpload);
        }
        saveError(error);
        return null;
    }
}

export async function uploadTitleTrailerFromYoutubeToS3(title, type, year, originalUrl, retryCounter = 0) {
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
        let fileUrl = `https://download-trailer.${config.cloudStorage.websiteEndPoint}/${fileName}`;
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
                    Bucket: 'download-trailer',
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
            return await uploadTitleTrailerFromYoutubeToS3(title, type, year, originalUrl, retryCounter);
        }
        if (error.name !== "AbortError") {
            saveError(error);
        }
        return null;
    }
}

export async function checkCastImageExist(name, gender, tvmazePersonID, jikanPersonID, retryCounter = 0) {
    let fileName = getFileName(name, gender, tvmazePersonID, jikanPersonID, 'jpg');
    let fileUrl = `https://cast.${config.cloudStorage.websiteEndPoint}/${fileName}`;
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
            return await checkCastImageExist(name, gender, tvmazePersonID, jikanPersonID, retryCounter);
        }
        let statusCode = error['$metadata'].httpStatusCode;
        if (statusCode !== 404 && statusCode !== 200) {
            saveError(error);
        }
        return statusCode !== 404 ? fileUrl : '';
    }
}

export async function checkSubtitleExist(fileName, retryCounter = 0) {
    let fileUrl = `https://download-subtitle.${config.cloudStorage.websiteEndPoint}/${fileName}`;
    try {
        const params = {
            Bucket: 'download-subtitle',
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
            return await checkSubtitleExist(fileName, retryCounter);
        }
        let statusCode = error['$metadata'].httpStatusCode;
        if (statusCode !== 404 && statusCode !== 200) {
            saveError(error);
        }
        return statusCode !== 404 ? fileUrl : '';
    }
}

export async function checkTitlePosterExist(title, type, year, retryCounter = 0) {
    let fileName = getFileName(title, type, year, '', 'jpg');
    let fileUrl = `https://poster.${config.cloudStorage.websiteEndPoint}/${fileName}`;
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
            return await checkTitlePosterExist(title, type, year, retryCounter);
        }
        let statusCode = error['$metadata'].httpStatusCode;
        if (statusCode !== 404 && statusCode !== 200) {
            saveError(error);
        }
        return statusCode !== 404 ? fileUrl : '';
    }
}

export async function checkTitleTrailerExist(title, type, year, retryCounter = 0) {
    let fileName = getFileName(title, type, year, '', 'mp4');
    let fileUrl = `https://download-trailer.${config.cloudStorage.websiteEndPoint}/${fileName}`;
    try {
        const params = {
            Bucket: 'download-trailer',
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
            return await checkTitleTrailerExist(title, type, year, retryCounter);
        }
        let statusCode = error['$metadata'].httpStatusCode;
        if (statusCode !== 404 && statusCode !== 200) {
            saveError(error);
        }
        return statusCode !== 404 ? fileUrl : '';
    }
}

export async function deletePosterFromS3(fileName, retryCounter = 0) {
    try {
        const params = {
            Bucket: 'poster',
            Key: fileName,
        };
        let command = new DeleteObjectCommand(params);
        await s3.send(command);
        return true;
    } catch (error) {
        if (error.code === 'ENOTFOUND' && retryCounter < 2) {
            retryCounter++;
            await new Promise((resolve => setTimeout(resolve, 200)));
            return await deletePosterFromS3(fileName, retryCounter);
        }
        saveError(error);
        return false;
    }
}

export async function deleteTrailerFromS3(fileName, retryCounter = 0) {
    try {
        const params = {
            Bucket: 'download-trailer',
            Key: fileName,
        };
        let command = new DeleteObjectCommand(params);
        await s3.send(command);
        return true;
    } catch (error) {
        if (error.code === 'ENOTFOUND' && retryCounter < 2) {
            retryCounter++;
            await new Promise((resolve => setTimeout(resolve, 200)));
            return await deleteTrailerFromS3(fileName, retryCounter);
        }
        saveError(error);
        return false;
    }
}

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

export async function resetBucket(bucketName) {
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

async function getFileSize(url) {
    try {
        let response = await axios.head(url);
        return Number(response.headers['content-length']) || 0;
    } catch (error) {
        saveError(error);
        return 0;
    }
}
