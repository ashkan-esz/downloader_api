import config from "../config/index.js";
import axios from "axios";
import sharp from "sharp";
import {saveError, saveErrorIfNeeded} from "../error/saveError.js";

export async function compressImage(responseData) {
    let dataBuffer = responseData;
    // reduce image size if size > 1MB
    if (responseData.length > 1024 * 1024) {
        let tempQuality = 50 - (Math.ceil(responseData.length / (1024 * 1024)) - 2) * 5;
        let sharpQuality = Math.max(Math.min(35, tempQuality), 10);
        let temp = await sharp(responseData).jpeg({quality: sharpQuality, mozjpeg: true}).toBuffer();
        let counter = 0;
        while ((temp.length / (1024 * 1024)) > 1 && counter < 4 && sharpQuality > 10) {
            counter++;
            sharpQuality -= 20;
            if (sharpQuality <= 0) {
                sharpQuality = 10;
            }
            temp = await sharp(responseData).jpeg({quality: sharpQuality, mozjpeg: true}).toBuffer();
        }
        dataBuffer = temp;
    } else {
        let metadata = await sharp(responseData).metadata();
        if (metadata.format !== 'jpg' && metadata.format !== 'jpeg') {
            dataBuffer = await sharp(responseData).jpeg({quality: 75, mozjpeg: true}).toBuffer();
        }
    }
    return dataBuffer;
}

export async function getImageThumbnail(inputImage, downloadFile = false) {
    //copied from https://github.com/transitive-bullshit/lqip-modern
    try {
        if (config.disableThumbnailCreate === 'true') {
            return null;
        }

        let fileSize = 0;
        if (downloadFile) {
            let downloadResult = await downloadImage(inputImage);
            if (!downloadResult) {
                return null;
            }
            inputImage = downloadResult.data;
            fileSize = Number(downloadResult.headers['content-length']) || 0
        }

        const image = sharp(inputImage).rotate();
        const metadata = await image.metadata();

        let size = Math.min(metadata.width, 128);
        let blur = size < 128 ? 16 : 18;

        const resized = image.resize(size, size, {fit: 'inside'});

        let output = resized.webp({
            quality: 20,
            alphaQuality: 20,
            smartSubsample: true,
        })

        const {data, info} = await output.blur(blur).toBuffer({resolveWithObject: true});

        return {
            content: data,
            width: info.width,
            height: info.height,
            type: 'webp',
            fileSize: fileSize,
            dataURIBase64: `data:image/webp;base64,${data.toString('base64')}`,
        };
    } catch (error) {
        if (error.message !== 'Input buffer contains unsupported image format') {
            saveError(error);
        }
        return null;
    }
}

async function downloadImage(url, retryCounter = 0) {
    try {
        return await axios.get(url, {
            responseType: "arraybuffer",
            responseEncoding: "binary"
        });
    } catch (error) {
        if (((error.response && error.response.status === 404) || error.code === 'ERR_UNESCAPED_CHARACTERS') &&
            decodeURIComponent(url) === url && retryCounter < 1) {
            retryCounter++;
            let fileName = url.replace(/\/$/, '').split('/').pop();
            url = url.replace(fileName, encodeURIComponent(fileName));
            return await downloadImage(url, retryCounter);
        }
        saveErrorIfNeeded(error);
        return null;
    }
}
