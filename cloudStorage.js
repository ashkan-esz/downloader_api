const axios = require('axios').default;
const {S3Client, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand} = require('@aws-sdk/client-s3');
const ytdl = require('ytdl-core');
const {saveError} = require("./saveError");

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
        if (posters.length === 0 || posters[0] === '') {
            return '';
        }
        let fileName = type + '-' + title + '-' + year;
        fileName = fileName.replace(/-$/g, '').trim().replace(/\s+/g, '-');
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

export async function uploadTitleTrailerToS3(title, type, year, trailers, retryCounter = 0) {
    try {
        if (trailers.length === 0 || trailers[0] === '') {
            return '';
        }
        let fileName = type + '-' + title + '-' + year + '.mp4';
        fileName = fileName
            .replace(/-$/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .replace('-.', '.');

        let videoReadStream = ytdl(trailers[0], {filter: 'audioandvideo', quality: "highestvideo"});
        const params = {
            Bucket: 'download-trailer',
            Body: videoReadStream,
            Key: fileName,
            ACL: 'public-read',
        };
        let command = new PutObjectCommand(params);
        await s3.send(command);
        return `https://download-trailer.${process.env.CLOUAD_STORAGE_WEBSITE_ENDPOINT}/${fileName}`;
    } catch (error) {
        if (error.code === 'ENOTFOUND' && retryCounter < 2) {
            retryCounter++;
            await new Promise((resolve => setTimeout(resolve, 200)));
            return await uploadTitleTrailerToS3(title, type, year, trailers, retryCounter);
        }
        saveError(error);
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
        let fileName = type + '-' + title + '-' + year;
        fileName = fileName.replace(/-$/g, '').trim().replace(/\s+/g, '-');
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
        let fileName = type + '-' + title + '-' + year + '.mp4';
        fileName = fileName
            .replace(/-$/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .replace('-.', '.');
        const params = {
            Bucket: 'download-trailer',
            Key: fileName,
        };
        let command = new HeadObjectCommand(params);
        let result = await s3.send(command);
        if (result['$metadata'].httpStatusCode === 200) {
            return `https://download-trailer.${process.env.CLOUAD_STORAGE_WEBSITE_ENDPOINT}/${fileName}`;
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

export async function deleteTrailerFromS3(title, type, year, retryCounter = 0) {
    try {
        let fileName = type + '-' + title + '-' + year + '.mp4';
        fileName = fileName
            .replace(/-$/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .replace('-.', '.');
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
            return await deleteTrailerFromS3(title, type, year, retryCounter);
        }
        saveError(error);
        return false;
    }
}
