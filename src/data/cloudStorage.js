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
import {Upload} from "@aws-sdk/lib-storage";
import ytdl from "ytdl-core";
import {compressImage, getImageThumbnail} from "../utils/sharpImageMethods.js";
import {getAllS3CastImageDB, getAllS3PostersDB, getAllS3TrailersDB} from "./db/s3FilesDB.js";
import {getYoutubeDownloadLink} from "../crawlers/remoteHeadlessBrowser.js";
import {CookieJar} from "tough-cookie";
import {wrapper} from "axios-cookiejar-support";
import {saveError, saveErrorIfNeeded} from "../error/saveError.js";
import {updateTrailerUploadLimit} from "../crawlers/crawlerStatus.js";
import {saveCrawlerWarning} from "./db/serverAnalysisDbMethods.js";
import {getCrawlerWarningMessages} from "../crawlers/crawlerWarnings.js";


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

const bucketNamePrefix = config.cloudStorage.bucketNamePrefix;

const defaultProfileUrl = `https://${bucketNamePrefix}serverstatic.${bucketsEndpointSuffix}/defaultProfile.png`;
export const defaultProfileImage = (await getFileSize(defaultProfileUrl)) > 0 ? defaultProfileUrl : '';

export const bucketNames = Object.freeze(['serverstatic', 'cast', 'download-subtitle', 'poster', 'download-trailer', 'profile-image'].map(item => bucketNamePrefix + item));

export const bucketNamesObject = Object.freeze({
    staticFiles: bucketNamePrefix + 'serverstatic',
    cast: bucketNamePrefix + 'cast',
    downloadSubtitle: bucketNamePrefix + 'download-subtitle',
    poster: bucketNamePrefix + 'poster',
    downloadTrailer: bucketNamePrefix + 'download-trailer',
    profileImage: bucketNamePrefix + 'profile-image',
});

export function getS3Client() {
    return s3;
}

export const s3VpnStatus = 'allOk';

export const trailerUploadConcurrency = 5;
export const saveWarningTimeout = 60 * 1000; //60s
const crawlerWarningMessages = getCrawlerWarningMessages(60);
let uploadingTrailer = 0;

async function waitForTrailerUpload() {
    let start = Date.now();
    while (uploadingTrailer >= trailerUploadConcurrency) {
        updateTrailerUploadLimit(uploadingTrailer, trailerUploadConcurrency);
        if (Date.now() - start > saveWarningTimeout) {
            start = Date.now();
            saveCrawlerWarning(crawlerWarningMessages.trailerUploadHighWait);
        }
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    uploadingTrailer++;
    updateTrailerUploadLimit(uploadingTrailer, trailerUploadConcurrency);
}

function decreaseUploadingTrailerNumber() {
    uploadingTrailer--;
    updateTrailerUploadLimit(uploadingTrailer, trailerUploadConcurrency);
}

//------------------------------------------
//------------------------------------------

export async function uploadCastImageToS3ByURl(name, tvmazePersonID, jikanPersonID, originalUrl, retryCounter = 0, retryWithSleepCounter = 0) {
    try {
        if (!originalUrl) {
            return null;
        }
        if (retryCounter === 0) {
            let s3CastImage = await checkCastImageExist(name, tvmazePersonID, jikanPersonID);
            if (s3CastImage) {
                let thumbnailData = await getImageThumbnail(s3CastImage, true);
                return {
                    url: s3CastImage,
                    originalUrl: "",
                    originalSize: 0,
                    size: (thumbnailData && thumbnailData.fileSize) ? thumbnailData.fileSize : await getFileSize(s3CastImage),
                    vpnStatus: s3VpnStatus,
                    thumbnail: thumbnailData ? thumbnailData.dataURIBase64 : '',
                };
            }
        }
        let fileName = getFileName(name, '', tvmazePersonID, jikanPersonID, 'jpg');
        let fileUrl = `https://${bucketNamesObject.cast}.${bucketsEndpointSuffix}/${fileName}`;
        const jar = new CookieJar();
        const client = wrapper(axios.create({jar}));
        let response = await client.get(originalUrl, {
            responseType: "arraybuffer",
            responseEncoding: "binary"
        });
        let dataBuffer = await compressImage(response.data);

        const params = {
            ContentType: 'image/jpeg',
            ContentLength: dataBuffer.length.toString(),
            Bucket: 'cast',
            Body: dataBuffer,
            Key: fileName,
            ACL: 'public-read',
        };
        let command = new PutObjectCommand(params);
        await s3.send(command);

        let thumbnailData = await getImageThumbnail(response.data);
        return {
            url: fileUrl,
            originalUrl: originalUrl,
            originalSize: Number(response.data.length),
            size: Number(dataBuffer.length),
            vpnStatus: s3VpnStatus,
            thumbnail: thumbnailData ? thumbnailData.dataURIBase64 : '',
        };
    } catch (error) {
        if (error.code === 'ENOTFOUND' && retryCounter < 2) {
            retryCounter++;
            await new Promise((resolve => setTimeout(resolve, 200)));
            return await uploadCastImageToS3ByURl(name, tvmazePersonID, jikanPersonID, originalUrl, retryCounter, retryWithSleepCounter);
        }
        if (checkNeedRetryWithSleep(error, retryWithSleepCounter)) {
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
        saveErrorIfNeeded(error);
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
                    vpnStatus: s3VpnStatus,
                };
            }
        }
        const jar = new CookieJar();
        const client = wrapper(axios.create({jar}));
        let response = await client.get(originalUrl, {
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
            vpnStatus: s3VpnStatus,
        };
    } catch (error) {
        if (error.code === 'ENOTFOUND' && retryCounter < 2) {
            retryCounter++;
            await new Promise((resolve => setTimeout(resolve, 200)));
            return await uploadSubtitleToS3ByURl(originalUrl, fileName, cookie, retryCounter, retryWithSleepCounter);
        }
        if (checkNeedRetryWithSleep(error, retryWithSleepCounter)) {
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
                let thumbnailData = await getImageThumbnail(s3Poster, true);
                return {
                    url: s3Poster,
                    originalUrl: "",
                    originalSize: 0,
                    size: (thumbnailData && thumbnailData.fileSize) ? thumbnailData.fileSize : await getFileSize(s3Poster),
                    vpnStatus: s3VpnStatus,
                    thumbnail: thumbnailData ? thumbnailData.dataURIBase64 : '',
                };
            }
        }

        let fileName = getFileName(title, type, year, '', 'jpg');
        let fileUrl = `https://${bucketNamesObject.poster}.${bucketsEndpointSuffix}/${fileName}`;
        const jar = new CookieJar();
        const client = wrapper(axios.create({jar}));
        let response = await client.get(originalUrl, {
            responseType: "arraybuffer",
            responseEncoding: "binary"
        });
        let dataBuffer = await compressImage(response.data);

        const params = {
            ContentType: 'image/jpeg',
            ContentLength: dataBuffer.length.toString(),
            Bucket: 'poster',
            Body: dataBuffer,
            Key: fileName,
            ACL: 'public-read',
        };
        let command = new PutObjectCommand(params);
        await s3.send(command);

        let thumbnailData = await getImageThumbnail(response.data);
        return {
            url: fileUrl,
            originalUrl: originalUrl,
            originalSize: Number(response.data.length),
            size: Number(dataBuffer.length),
            vpnStatus: s3VpnStatus,
            thumbnail: thumbnailData ? thumbnailData.dataURIBase64 : '',
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
        if (checkNeedRetryWithSleep(error, retryWithSleepCounter)) {
            retryWithSleepCounter++;
            await new Promise((resolve => setTimeout(resolve, 1000)));
            return await uploadTitlePosterToS3(title, type, year, originalUrl, retryCounter, forceUpload, retryWithSleepCounter);
        }
        saveErrorIfNeeded(error);
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
                    vpnStatus: s3VpnStatus,
                };
            }
        }

        await waitForTrailerUpload();
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

                let fileSize = await uploadFileToS3(bucketNamesObject.downloadTrailer, videoReadStream, fileName, fileUrl);
                decreaseUploadingTrailerNumber();
                resolve({
                    url: fileUrl,
                    originalUrl: originalUrl,
                    size: fileSize,
                    vpnStatus: s3VpnStatus,
                });
            } catch (error2) {
                decreaseUploadingTrailerNumber();
                if (videoReadStream) {
                    videoReadStream.destroy();
                }
                reject(error2);
            }
        });

    } catch (error) {
        decreaseUploadingTrailerNumber();
        if (
            ((error.code === 'ENOTFOUND' || error.code === 'ECONNRESET') && retryCounter < 4) ||
            (error.statusCode === 410 && retryCounter < 1)
        ) {
            retryCounter++;
            await new Promise((resolve => setTimeout(resolve, 2000)));
            return await uploadTitleTrailerFromYoutubeToS3(title, type, year, originalUrl, retryCounter, retryWithSleepCounter);
        }
        if (checkNeedRetryWithSleep(error, retryWithSleepCounter)) {
            retryWithSleepCounter++;
            await new Promise((resolve => setTimeout(resolve, 2000)));
            return await uploadTitleTrailerFromYoutubeToS3(title, type, year, originalUrl, retryCounter, retryWithSleepCounter);
        }
        if (error.statusCode === 410 || error.statusCode === 403) {
            return await uploadTitleTrailerFromYoutubeToS3_youtubeDownloader(title, type, year, originalUrl, false);
        }
        if (error.name !== "AbortError") {
            saveError(error);
        }
        return null;
    }
}

export async function uploadTitleTrailerFromYoutubeToS3_youtubeDownloader(title, type, year, originalUrl, checkTrailerExist = true,
                                                                          retryCounter = 0, retryWithSleepCounter = 0) {
    try {
        if (!originalUrl) {
            return null;
        }
        if (retryCounter === 0 && checkTrailerExist) {
            let s3Trailer = await checkTitleTrailerExist(title, type, year);
            if (s3Trailer) {
                return {
                    url: s3Trailer,
                    originalUrl: "",
                    size: await getFileSize(s3Trailer),
                    vpnStatus: s3VpnStatus,
                };
            }
        }

        await waitForTrailerUpload();
        let fileName = getFileName(title, type, year, '', 'mp4');
        let fileUrl = `https://${bucketNamesObject.downloadTrailer}.${bucketsEndpointSuffix}/${fileName}`;

        let remoteBrowserData = await getYoutubeDownloadLink(originalUrl);
        if (!remoteBrowserData) {
            decreaseUploadingTrailerNumber();
            return null;
        }

        let response = await axios.get(remoteBrowserData.downloadUrl, {
            responseType: "arraybuffer",
            responseEncoding: "binary"
        });

        let fileSize = await uploadFileToS3(bucketNamesObject.downloadTrailer, response.data, fileName, fileUrl);
        decreaseUploadingTrailerNumber();
        return ({
            url: fileUrl,
            originalUrl: originalUrl,
            size: fileSize,
            vpnStatus: s3VpnStatus,
        });
    } catch (error) {
        decreaseUploadingTrailerNumber();
        if ((error.code === 'ENOTFOUND' || error.code === 'ECONNRESET') && retryCounter < 2) {
            retryCounter++;
            await new Promise((resolve => setTimeout(resolve, 2000)));
            return await uploadTitleTrailerFromYoutubeToS3_youtubeDownloader(title, type, year, originalUrl, checkTrailerExist, retryCounter, retryWithSleepCounter);
        }
        if (checkNeedRetryWithSleep(error, retryWithSleepCounter)) {
            retryWithSleepCounter++;
            await new Promise((resolve => setTimeout(resolve, 2000)));
            return await uploadTitleTrailerFromYoutubeToS3_youtubeDownloader(title, type, year, originalUrl, checkTrailerExist, retryCounter, retryWithSleepCounter);
        }
        saveError(error);
        return null;
    }
}

//------------------------------------------
//------------------------------------------

async function uploadFileToS3(bucketName, file, fileName, fileUrl, extraCheckFileSize = true) {
    const parallelUploads3 = new Upload({
        client: s3,
        params: {
            Bucket: bucketName,
            Body: file,
            Key: fileName,
            ACL: 'public-read',
        },
        queueSize: 4, // optional concurrency configuration
        partSize: 1024 * 1024 * 5, // optional size of each part, in bytes, at least 5MB
        leavePartsOnError: false, // optional manually handle dropped parts
    });

    let fileSize = 0;
    parallelUploads3.on("httpUploadProgress", (progress) => {
        fileSize = progress.total;
    });

    let uploadResult = await parallelUploads3.done();

    if (!fileSize && extraCheckFileSize) {
        fileSize = await getFileSize(fileUrl);
    }
    return fileSize;
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
        if (checkNeedRetryWithSleep(error, retryWithSleepCounter)) {
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
        if (checkNeedRetryWithSleep(error, retryWithSleepCounter)) {
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
        if (checkNeedRetryWithSleep(error, retryWithSleepCounter)) {
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
        if (checkNeedRetryWithSleep(error, retryWithSleepCounter)) {
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
        if (checkNeedRetryWithSleep(error, retryWithSleepCounter)) {
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
        if (checkNeedRetryWithSleep(error, retryWithSleepCounter)) {
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
        if (checkNeedRetryWithSleep(error, retryWithSleepCounter)) {
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
        if (checkNeedRetryWithSleep(error, retryWithSleepCounter)) {
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

function checkNeedRetryWithSleep(error, retryWithSleepCounter) {
    return (
        retryWithSleepCounter < 2 && (
            error.message === 'S3ServiceException: UnknownError' ||
            error.message === '403: UnknownError' ||
            error.message === '504: UnknownError' ||
            error.message === 'RequestTimeTooSkewed: UnknownError' ||
            (error.response && (error.response.status === 429 || error.response.status >= 500))
        )
    );
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
        const jar = new CookieJar();
        const client = wrapper(axios.create({jar}));
        let response = await client.head(url);
        return Number(response.headers['content-length']) || 0;
    } catch (error) {
        if (((error.response && error.response.status === 404) || error.code === 'ERR_UNESCAPED_CHARACTERS') &&
            decodeURIComponent(url) === url && retryCounter < 1) {
            retryCounter++;
            let fileName = url.replace(/\/$/, '').split('/').pop();
            url = url.replace(fileName, encodeURIComponent(fileName));
            return await getFileSize(url, retryCounter, retryWithSleepCounter);
        }
        if (checkNeedRetryWithSleep(error, retryWithSleepCounter)) {
            retryWithSleepCounter++;
            await new Promise((resolve => setTimeout(resolve, 1000)));
            return await getFileSize(url, retryCounter, retryWithSleepCounter);
        }
        saveErrorIfNeeded(error);
        return 0;
    }
}
