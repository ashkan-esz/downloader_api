import https from "https";
import axios from "axios";
import {CookieJar} from "tough-cookie";
import {wrapper} from "axios-cookiejar-support";
import {saveErrorIfNeeded} from "../../error/saveError.js";

export async function getFileSize(url, retryCounter = 0, retryWithSleepCounter = 0, ignoreError = false) {
    try {
        const jar = new CookieJar();
        const client = wrapper(axios.create({jar}));
        let response = await client.head(url, {timeout: 5000});
        if (response.headers['content-type'].includes('text/html')) {
            return 0;
        }
        return Number(response.headers['content-length']) || 0;
    } catch (error) {
        if (error.message === 'timeout of 5000ms exceeded' || error.message === 'socket hang up' || error.code === 'EAI_AGAIN') {
            return 0;
        }
        if (((error.response && error.response.status === 404) || error.code === 'ERR_UNESCAPED_CHARACTERS') &&
            decodeURIComponent(url) === url && retryCounter < 1) {
            retryCounter++;
            let fileName = url.replace(/\/$/, '').split('/').pop();
            url = url.replace(fileName, encodeURIComponent(fileName));
            return await getFileSize(url, retryCounter, retryWithSleepCounter, ignoreError);
        }
        if (checkNeedRetryWithSleep(error, retryWithSleepCounter)) {
            retryWithSleepCounter++;
            await new Promise((resolve => setTimeout(resolve, 1000)));
            return await getFileSize(url, retryCounter, retryWithSleepCounter, ignoreError);
        }
        if (!ignoreError) {
            saveErrorIfNeeded(error);
        }
        return 0;
    }
}

export async function downloadImage(url, retryCounter = 0) {
    try {
        const jar = new CookieJar();
        const client = wrapper(axios.create({jar}));
        let timeout = url.includes(".s3.") ? 8000 : 5000;
        let response = await client.get(url, {
            responseType: "arraybuffer",
            responseEncoding: "binary",
            timeout: timeout,
        });
        if (response.headers['content-type'].includes('text/html')) {
            return null;
        }
        return response;
    } catch (error) {
        if (error.response?.statusText === "Forbidden") {
            return null;
        }
        if ((error.response?.status === 404 || error.code === 'ERR_UNESCAPED_CHARACTERS' || error.message === 'socket hang up' || error.code === 'EAI_AGAIN') &&
            decodeURIComponent(url) === url && retryCounter < 1) {
            retryCounter++;
            let fileName = url.replace(/\/$/, '').split('/').pop();
            url = url.replace(fileName, encodeURIComponent(fileName));
            return await downloadImage(url, retryCounter);
        }
        if ((error.message === 'timeout of 8000ms exceeded' || error.message === 'timeout of 5000ms exceeded') && retryCounter < 1) {
            retryCounter++;
            return await downloadImage(url, retryCounter);
        }
        if (error.code !== 'EAI_AGAIN') {
            saveErrorIfNeeded(error);
        }
        return null;
    }
}

export async function getResponseWithCookie(url, cookie, timeout = null) {
    let config = {
        headers: {
            Cookie: cookie,
        }
    }
    if (timeout) {
        config.timeout = timeout;
    }
    try {
        const jar = new CookieJar();
        const client = wrapper(axios.create({jar}));
        return await client.get(url, config);
    } catch (error) {
        if (error.message === 'certificate has expired' || error.code === "ERR_TLS_CERT_ALTNAME_INVALID") {
            const agent = new https.Agent({
                rejectUnauthorized: false,
            });
            return await axios.get(url, {
                ...config,
                httpsAgent: agent,
            });
        } else {
            throw error;
        }
    }
}

export async function getArrayBufferResponse(url, cookie = null) {
    try {
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
        let result = await client.get(url, config);
        if (result.headers['content-type'] === "text/html") {
            return null;
        }
        return result;
    } catch (error) {
        if (error.message === 'certificate has expired' || error.code === "ERR_TLS_CERT_ALTNAME_INVALID") {
            return null;
        } else {
            throw error;
        }
    }
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