import axios from "axios";
import {CookieJar} from "tough-cookie";
import {wrapper} from "axios-cookiejar-support";
import {saveErrorIfNeeded} from "../../error/saveError.js";

export async function getFileSize(url, retryCounter = 0, retryWithSleepCounter = 0) {
    try {
        const jar = new CookieJar();
        const client = wrapper(axios.create({jar}));
        let response = await client.head(url);
        if (response.headers['content-type'].includes('text/html')) {
            return null;
        }
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

export async function downloadImage(url, retryCounter = 0) {
    try {
        const jar = new CookieJar();
        const client = wrapper(axios.create({jar}));
        let response = await client.get(url, {
            responseType: "arraybuffer",
            responseEncoding: "binary"
        });
        if (response.headers['content-type'].includes('text/html')) {
            return null;
        }
        return response;
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

export async function getResponseWithCookie(url, cookie, timeout = null) {
    const jar = new CookieJar();
    const client = wrapper(axios.create({jar}));
    let config = {
        headers: {
            Cookie: cookie,
        }
    }
    if (timeout) {
        config.timeout = timeout;
    }
    return await client.get(url, config);
}

export async function getArrayBufferResponse(url, cookie = null) {
    const jar = new CookieJar();
    const client = wrapper(axios.create({jar}));
    let config = {
        responseType: "arraybuffer",
        responseEncoding: "binary"
    };
    if (cookie) {
        config.headers = {
            Cookie: cookie,
        }
    }
    return await client.get(url, config);
}

export async function getResponseUrl(url) {
    const jar = new CookieJar();
    const client = wrapper(axios.create({jar}));
    let response = await client.get(url);
    return response.request.res.responseUrl;
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