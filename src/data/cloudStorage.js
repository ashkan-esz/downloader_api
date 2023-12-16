import config from "../config/index.js";
import axios from "axios";
import {AbortController} from "@aws-sdk/abort-controller";
import {
    CreateBucketCommand,
    DeleteObjectCommand,
    DeleteObjectsCommand,
    GetObjectCommand,
    HeadObjectCommand,
    ListObjectsCommand,
    PutObjectCommand,
    S3Client
} from "@aws-sdk/client-s3";
import {Upload} from "@aws-sdk/lib-storage";
import ytdl from "ytdl-core";
import {compressImage, getImageThumbnail} from "../utils/sharpImageMethods.js";
import {getAllS3CastImageDB, getAllS3PostersDB, getAllS3TrailersDB, getAllS3WidePostersDB} from "./db/s3FilesDB.js";
import {getYoutubeDownloadLink} from "../crawlers/remoteHeadlessBrowser.js";
import {getArrayBufferResponse, getFileSize} from "../crawlers/utils/axiosUtils.js";
import {saveError, saveErrorIfNeeded} from "../error/saveError.js";
import {updateTrailerUploadLimit} from "../crawlers/status/crawlerStatus.js";
import {saveCrawlerWarning} from "./db/serverAnalysisDbMethods.js";
import {getCrawlerWarningMessages} from "../crawlers/status/crawlerWarnings.js";
import {getDecodedLink} from "../crawlers/utils/utils.js";
import {updateCronJobsStatus} from "../utils/cronJobsStatus.js";


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

export const bucketNames = Object.freeze(['serverstatic', 'cast', 'download-subtitle', 'poster', 'download-trailer', 'profile-image', 'download-app', 'downloader-db-backup'].map(item => bucketNamePrefix + item));

export const bucketNamesObject = Object.freeze({
    staticFiles: bucketNamePrefix + 'serverstatic',
    cast: bucketNamePrefix + 'cast',
    downloadSubtitle: bucketNamePrefix + 'download-subtitle',
    poster: bucketNamePrefix + 'poster',
    downloadTrailer: bucketNamePrefix + 'download-trailer',
    profileImage: bucketNamePrefix + 'profile-image',
    downloadApp: bucketNamePrefix + 'download-app',
    backup: bucketNamePrefix + 'downloader-db-backup',
});

export function getS3Client() {
    return s3;
}

export const s3VpnStatus = 'allOk';

export const trailerUploadConcurrency = 7;
export const saveWarningTimeout = 70 * 1000; //70s
const crawlerWarningMessages = getCrawlerWarningMessages(70);
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

export async function uploadCastImageToS3ByURl(name, castType, id, originalUrl) {
    try {
        const fileName = getFileName(name, '', castType, id, 'jpg');
        const fileUrl = `https://${bucketNamesObject.cast}.${bucketsEndpointSuffix}/${fileName}`;
        return await uploadImageToS3(bucketNamesObject.cast, fileName, fileUrl, originalUrl);
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function uploadSubtitleToS3ByURl(fileName, cookie, originalUrl, retryCounter = 0, retryWithSleepCounter = 0) {
    try {
        if (!originalUrl) {
            return null;
        }
        const fileUrl = `https://${bucketNamesObject.downloadSubtitle}.${bucketsEndpointSuffix}/${fileName}`;
        if (retryCounter === 0) {
            let s3Subtitle = await checkFileExist(bucketNamesObject.downloadSubtitle, fileName, fileUrl);
            if (s3Subtitle) {
                return {
                    url: s3Subtitle,
                    originalUrl: "",
                    size: await getFileSize(s3Subtitle),
                    vpnStatus: s3VpnStatus,
                };
            }
        }

        let response = await getArrayBufferResponse(originalUrl, cookie);
        if (response === null) {
            return null;
        }
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
            url: fileUrl,
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

export async function uploadTitlePosterToS3(title, type, year, originalUrl, forceUpload = false, isWide = false) {
    try {
        const extra = isWide ? 'wide' : '';
        const fileName = getFileName(title, type, year, extra, 'jpg');
        const fileUrl = `https://${bucketNamesObject.poster}.${bucketsEndpointSuffix}/${fileName}`;
        return await uploadImageToS3(bucketNamesObject.poster, fileName, fileUrl, originalUrl, forceUpload);
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function uploadProfileImageToS3(userId, type, dataBuffer, retryCounter = 0, retryWithSleepCounter = 0) {
    try {
        if (!dataBuffer) {
            return null;
        }

        const fileName = `user-${userId}-${Date.now()}.${type}`;
        const fileUrl = `https://${bucketNamesObject.profileImage}.${bucketsEndpointSuffix}/${fileName}`;
        const compressedDataBuffer = await compressImage(dataBuffer, 512);

        const params = {
            ContentType: 'image/jpeg',
            ContentLength: compressedDataBuffer.length.toString(),
            Bucket: bucketNamesObject.profileImage,
            Body: compressedDataBuffer,
            Key: fileName,
            ACL: 'public-read',
        };
        let command = new PutObjectCommand(params);
        await s3.send(command);

        let thumbnailData = await getImageThumbnail(compressedDataBuffer);
        return {
            url: fileUrl,
            originalSize: Number(dataBuffer.length),
            size: Number(compressedDataBuffer.length),
            thumbnail: thumbnailData ? thumbnailData.dataURIBase64 : '',
        };
    } catch (error) {
        if (error.code === 'ENOTFOUND' && retryCounter < 2) {
            retryCounter++;
            await new Promise((resolve => setTimeout(resolve, 200)));
            return await uploadProfileImageToS3(userId, type, dataBuffer, retryCounter, retryWithSleepCounter);
        }
        if (checkNeedRetryWithSleep(error, retryWithSleepCounter)) {
            retryWithSleepCounter++;
            await new Promise((resolve => setTimeout(resolve, 1000)));
            return await uploadProfileImageToS3(userId, type, dataBuffer, retryCounter, retryWithSleepCounter);
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
        const fileName = getFileName(title, type, year, '', 'mp4');
        const fileUrl = `https://${bucketNamesObject.downloadTrailer}.${bucketsEndpointSuffix}/${fileName}`;
        if (retryCounter === 0) {
            let s3Trailer = await checkFileExist(bucketNamesObject.downloadTrailer, fileName, fileUrl);
            if (!s3Trailer && year) {
                const fileName2 = getFileName(title, type, '', '', 'mp4');
                s3Trailer = await checkFileExist(bucketNamesObject.downloadTrailer, fileName2, fileUrl);
            }
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
        if (error.name !== "AbortError" && error.message !== 'Video unavailable' && !error.message.includes('This is a private video')) {
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
        const fileName = getFileName(title, type, year, '', 'mp4');
        const fileUrl = `https://${bucketNamesObject.downloadTrailer}.${bucketsEndpointSuffix}/${fileName}`;
        if (retryCounter === 0 && checkTrailerExist) {
            let s3Trailer = await checkFileExist(bucketNamesObject.downloadTrailer, fileName, fileUrl);
            if (!s3Trailer && year) {
                const fileName2 = getFileName(title, type, '', '', 'mp4');
                s3Trailer = await checkFileExist(bucketNamesObject.downloadTrailer, fileName2, fileUrl);
            }
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

export async function uploadImageToS3(bucketName, fileName, fileUrl, originalUrl, forceUpload = false, retryCounter = 0, retryWithSleepCounter = 0) {
    try {
        if (!originalUrl) {
            return null;
        }

        if (retryCounter === 0 && !forceUpload) {
            let s3Image = await checkFileExist(bucketName, fileName, fileUrl);
            if (s3Image) {
                let thumbnailData = await getImageThumbnail(s3Image, true);
                return {
                    url: s3Image,
                    originalUrl: "",
                    originalSize: 0,
                    size: (thumbnailData && thumbnailData.fileSize) ? thumbnailData.fileSize : await getFileSize(s3Image),
                    vpnStatus: s3VpnStatus,
                    thumbnail: thumbnailData ? thumbnailData.dataURIBase64 : '',
                };
            }
        }

        let response = await getArrayBufferResponse(originalUrl);
        if (response === null) {
            return null;
        }
        let dataBuffer = await compressImage(response.data);

        const params = {
            ContentType: 'image/jpeg',
            ContentLength: dataBuffer.length.toString(),
            Bucket: bucketName,
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
        if ((error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') && retryCounter < 2) {
            retryCounter++;
            await new Promise((resolve => setTimeout(resolve, 200)));
            return await uploadImageToS3(bucketName, fileName, fileUrl, originalUrl, forceUpload, retryCounter, retryWithSleepCounter);
        }
        if (checkNeedRetryWithSleep(error, retryWithSleepCounter)) {
            retryWithSleepCounter++;
            await new Promise((resolve => setTimeout(resolve, 1000)));
            return await uploadImageToS3(bucketName, fileName, fileUrl, originalUrl, forceUpload, retryCounter, retryWithSleepCounter);
        }
        if ((error.response && error.response.status === 404) || error.code === 'ERR_UNESCAPED_CHARACTERS') {
            if (decodeURIComponent(originalUrl) === originalUrl && retryCounter < 3) {
                let temp = originalUrl.replace(/\/$/, '').split('/').pop();
                if (temp) {
                    let url = originalUrl.replace(temp, encodeURIComponent(temp));
                    retryCounter++;
                    await new Promise((resolve => setTimeout(resolve, 200)));
                    return await uploadImageToS3(bucketName, fileName, fileUrl, url, forceUpload, retryCounter, retryWithSleepCounter);
                }
            }
            if (error.response?.status !== 404) {
                error.isAxiosError = true;
                error.url = originalUrl;
                error.filePath = 'cloudStorage > uploadImageToS3 > ' + bucketName;
                await saveError(error);
            }
            return null;
        }
        if (error.code !== 'EAI_AGAIN') {
            saveErrorIfNeeded(error);
        }
        return null;
    }
}

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

export async function getDbBackupFilesList() {
    try {
        const params = {
            Bucket: bucketNamesObject.backup,
            MaxKeys: 1000,
        };
        let command = new ListObjectsCommand(params);
        let response = await s3.send(command);
        let files = response.Contents;
        return files || [];
    } catch (error) {
        saveError(error);
        return [];
    }
}

export async function getDbBackupFile(fileName) {
    try {
        const params = {
            Bucket: bucketNamesObject.backup,
            Key: fileName,
        };
        let command = new GetObjectCommand(params);
        let response = await s3.send(command);
        return await new Promise((resolve, reject) => {
            const chunks = [];
            response.Body.on('data', (chunk) => chunks.push(chunk));
            response.Body.on('end', () => resolve(Buffer.concat(chunks)));
            response.Body.on('error', reject);
        });
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function uploadDbBackupFileToS3(file, fileName, retryCounter = 0, retryWithSleepCounter = 0) {
    try {
        const parallelUploads3 = new Upload({
            client: s3,
            params: {
                Bucket: bucketNamesObject.backup,
                Body: file,
                Key: fileName,
                ACL: 'private',
            },
            queueSize: 4, // optional concurrency configuration
            partSize: 1024 * 1024 * 5, // optional size of each part, in bytes, at least 5MB
            leavePartsOnError: false, // optional manually handle dropped parts
        });

        await parallelUploads3.done();

        return 'ok';
    } catch (error) {
        if ((error.code === 'ENOTFOUND' || error.code === 'ECONNRESET') && retryCounter < 2) {
            retryCounter++;
            await new Promise((resolve => setTimeout(resolve, 2000)));
            return await uploadDbBackupFileToS3(file, fileName, retryCounter, retryWithSleepCounter);
        }
        if (checkNeedRetryWithSleep(error, retryWithSleepCounter)) {
            retryWithSleepCounter++;
            await new Promise((resolve => setTimeout(resolve, 2000)));
            return await uploadDbBackupFileToS3(file, fileName, retryCounter, retryWithSleepCounter);
        }
        saveError(error);
        return 'error';
    }
}

export async function removeDbBackupFileFromS3(fileName, retryCounter = 0) {
    fileName = getDecodedLink(fileName);
    let result = await deleteFileFromS3(bucketNamesObject.backup, fileName);
    if (result === 'error' && retryCounter < 2) {
        retryCounter++;
        await new Promise((resolve => setTimeout(resolve, 200)));
        return await removeDbBackupFileFromS3(fileName, retryCounter);
    }
    return result;
}

//------------------------------------------
//------------------------------------------

export async function checkFileExist(bucketName, fileName, fileUrl, retryCounter = 0, retryWithSleepCounter = 0) {
    try {
        const params = {
            Bucket: bucketName,
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
            return await checkFileExist(bucketName, fileName, retryCounter, retryWithSleepCounter);
        }
        if (checkNeedRetryWithSleep(error, retryWithSleepCounter)) {
            retryWithSleepCounter++;
            await new Promise((resolve => setTimeout(resolve, 1000)));
            return await checkFileExist(bucketName, fileName, retryCounter, retryWithSleepCounter);
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
    fileName = getDecodedLink(fileName);
    let result = await deleteFileFromS3(bucketNamesObject.profileImage, fileName);
    if (result === 'error' && retryCounter < 2) {
        retryCounter++;
        await new Promise((resolve => setTimeout(resolve, 200)));
        return await removeProfileImageFromS3(fileName, retryCounter);
    }
    return result;
}

export async function deletePosterFromS3(fileName, retryCounter = 0) {
    let result = await deleteFileFromS3(bucketNamesObject.poster, fileName);
    if (result === 'error' && retryCounter < 2) {
        retryCounter++;
        await new Promise((resolve => setTimeout(resolve, 200)));
        return await deletePosterFromS3(fileName, retryCounter);
    }
    return result === 'ok';
}

export async function deleteTrailerFromS3(fileName, retryCounter = 0) {
    let result = await deleteFileFromS3(bucketNamesObject.downloadTrailer, fileName);
    if (result === 'error' && retryCounter < 2) {
        retryCounter++;
        await new Promise((resolve => setTimeout(resolve, 200)));
        return await deleteTrailerFromS3(fileName, retryCounter);
    }
    return result === 'ok';
}

export async function removeAppFileFromS3(fileName, retryCounter = 0) {
    fileName = getDecodedLink(fileName);
    let result = await deleteFileFromS3(bucketNamesObject.downloadApp, fileName);
    if (result === 'error' && retryCounter < 2) {
        retryCounter++;
        await new Promise((resolve => setTimeout(resolve, 200)));
        return await removeAppFileFromS3(fileName, retryCounter);
    }
    return result;
}

export async function deleteUnusedFiles(retryCounter = 0) {
    try {
        let checkBuckets = [bucketNamesObject.poster, bucketNamesObject.downloadTrailer, bucketNamesObject.cast];

        for (let k = 0; k < checkBuckets.length; k++) {
            updateCronJobsStatus('removeS3UnusedFiles', 'checking bucket ' + checkBuckets[k]);
            let dataBaseFiles = [];
            // files that are in use
            if (checkBuckets[k] === bucketNamesObject.poster) {
                dataBaseFiles = await getAllS3PostersDB();
                let widePosters = await getAllS3WidePostersDB();
                if (!dataBaseFiles && !widePosters) {
                    continue;
                }
                dataBaseFiles = [
                    ...(dataBaseFiles || []).map(item => item.poster_s3.url.split('/').pop()),
                    ...(widePosters || []).map(item => item.poster_wide_s3.url.split('/').pop()),
                ];
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
                dataBaseFiles = dataBaseFiles.map(item => item.url.split('/').pop());
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
                updateCronJobsStatus('removeS3UnusedFiles', `checking bucket ${checkBuckets[k]} deleted ${deleteCounter}`);
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
            ACL: bucketName.includes('backup') ? 'private' : 'public-read', // 'private' | 'public-read'
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
