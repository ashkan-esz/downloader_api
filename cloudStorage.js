const axios = require('axios').default;
const axiosRetry = require("axios-retry");
const {AbortController} = require("@aws-sdk/abort-controller");
const {S3Client, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand} = require('@aws-sdk/client-s3');
const ytdl = require('ytdl-core');
const {saveError} = require("./saveError");

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
    endpoint: process.env.CLOUAD_STORAGE_ENDPOINT,
    credentials: {
        accessKeyId: process.env.CLOUAD_STORAGE_ACCESS_KEY,
        secretAccessKey: process.env.CLOUAD_STORAGE_SECRET_ACCESS_KEY,
    },
});

export async function uploadCastImageToS3ByURl(url, fileName, retryCounter = 0) {
    try {
        if (!url) {
            return ''
        }
        if (retryCounter === 0) {
            let s3CastImage = await checkCastImageExist(fileName);
            if (s3CastImage) {
                return s3CastImage;
            }
        }
        let response = await axios.get(url, {
            responseType: "arraybuffer",
            responseEncoding: "binary"
        });
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
        return `https://cast.${process.env.CLOUAD_STORAGE_WEBSITE_ENDPOINT}/${fileName}`;
    } catch (error) {
        if (error.code === 'ENOTFOUND' && retryCounter < 2) {
            retryCounter++;
            await new Promise((resolve => setTimeout(resolve, 200)));
            return await uploadCastImageToS3ByURl(url, fileName, retryCounter);
        }
        saveError(error);
        return '';
    }
}

export async function uploadSubtitleToS3ByURl(url, fileName, cookie, retryCounter = 0) {
    try {
        if (!url) {
            return ''
        }
        if (retryCounter === 0) {
            let s3Subtitle = await checkSubtitleExist(fileName);
            if (s3Subtitle) {
                return s3Subtitle;
            }
        }
        let response = await axios.get(url, {
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
        return `https://download-subtitle.${process.env.CLOUAD_STORAGE_WEBSITE_ENDPOINT}/${fileName}`;
    } catch (error) {
        if (error.code === 'ENOTFOUND' && retryCounter < 2) {
            retryCounter++;
            await new Promise((resolve => setTimeout(resolve, 200)));
            return await uploadSubtitleToS3ByURl(url, fileName, cookie, retryCounter);
        }
        saveError(error);
        return '';
    }
}

export async function uploadTitlePosterToS3(title, type, year, posters, retryCounter = 0) {
    try {
        if (posters.length === 0 || !posters[0]) {
            return '';
        }
        if (retryCounter === 0) {
            let s3Poster = await checkTitlePosterExist(title, type, year);
            if (s3Poster) {
                return s3Poster;
            }
        }

        let fileName = getFileName(title, type, year, 'jpg');
        let response = await axios.get(posters[0], {
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
        return `https://poster.${process.env.CLOUAD_STORAGE_WEBSITE_ENDPOINT}/${fileName}`;
    } catch (error) {
        if (error.code === 'ENOTFOUND' && retryCounter < 2) {
            retryCounter++;
            await new Promise((resolve => setTimeout(resolve, 200)));
            return await uploadTitlePosterToS3(title, type, year, posters, retryCounter);
        }
        saveError(error);
        return '';
    }
}

export async function uploadTitleTrailerFromYoutubeToS3(title, type, year, trailers, retryCounter = 0) {
    try {
        if (trailers.length === 0 || !trailers[0]) {
            return '';
        }
        if (retryCounter === 0) {
            let s3Trailer = await checkTitleTrailerExist(title, type, year);
            if (s3Trailer) {
                return s3Trailer;
            }
        }

        let fileName = getFileName(title, type, year, 'mp4');
        return await new Promise(async (resolve, reject) => {
            const abortController = new AbortController();
            let videoReadStream = null;
            try {
                videoReadStream = ytdl(trailers[0], {
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
                let uploadedTrailerLink = `https://download-trailer.${process.env.CLOUAD_STORAGE_WEBSITE_ENDPOINT}/${fileName}`;
                resolve(uploadedTrailerLink);
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
            return await uploadTitleTrailerFromYoutubeToS3(title, type, year, trailers, retryCounter);
        }
        if (error.name !== "AbortError") {
            saveError(error);
        }
        return '';
    }
}

export async function checkCastImageExist(fileName, retryCounter = 0) {
    try {
        const params = {
            Bucket: 'cast',
            Key: fileName,
        };
        let command = new HeadObjectCommand(params);
        let result = await s3.send(command);
        if (result['$metadata'].httpStatusCode === 200) {
            return `https://cast.${process.env.CLOUAD_STORAGE_WEBSITE_ENDPOINT}/${fileName}`;
        }
        return false;
    } catch (error) {
        if (error.code === 'ENOTFOUND' && retryCounter < 2) {
            retryCounter++;
            await new Promise((resolve => setTimeout(resolve, 200)));
            return await checkCastImageExist(fileName, retryCounter);
        }
        let statusCode = error['$metadata'].httpStatusCode;
        if (statusCode !== 404 && statusCode !== 200) {
            saveError(error);
        }
        return statusCode !== 404;
    }
}

export async function checkSubtitleExist(fileName, retryCounter = 0) {
    try {
        const params = {
            Bucket: 'download-subtitle',
            Key: fileName,
        };
        let command = new HeadObjectCommand(params);
        let result = await s3.send(command);
        if (result['$metadata'].httpStatusCode === 200) {
            return `https://download-subtitle.${process.env.CLOUAD_STORAGE_WEBSITE_ENDPOINT}/${fileName}`;
        }
        return false;
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
        return statusCode !== 404;
    }
}

export async function checkTitlePosterExist(title, type, year, retryCounter = 0) {
    try {
        let fileName = getFileName(title, type, year, 'jpg');
        const params = {
            Bucket: 'poster',
            Key: fileName,
        };
        let command = new HeadObjectCommand(params);
        let result = await s3.send(command);
        if (result['$metadata'].httpStatusCode === 200) {
            return `https://poster.${process.env.CLOUAD_STORAGE_WEBSITE_ENDPOINT}/${fileName}`;
        }
        return false;
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
        return statusCode !== 404;
    }
}

export async function checkTitleTrailerExist(title, type, year, retryCounter = 0) {
    try {
        let fileName = getFileName(title, type, year, 'mp4');
        const params = {
            Bucket: 'download-trailer',
            Key: fileName,
        };
        let command = new HeadObjectCommand(params);
        let result = await s3.send(command);
        if (result['$metadata'].httpStatusCode === 200) {
            return `https://download-trailer.${process.env.CLOUAD_STORAGE_WEBSITE_ENDPOINT}/${fileName}`;
        }
        if (year) {
            return await checkTitleTrailerExist(title, type, '');
        }
        return false;
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
        return statusCode !== 404;
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

function getFileName(title, titleType, year, fileType) {
    let fileName = titleType + '-' + title + '-' + year + '.' + fileType;
    fileName = fileName.trim()
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .replace('-.', '.');
    if (year && title.endsWith(year)) {
        fileName = fileName.replace(('-' + year), '');
    }
    return fileName;
}
