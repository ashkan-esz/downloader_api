import config from "../config/index.js";
import axios from "axios";
import cheerio from "cheerio";
import {getSourcesObjDB} from "../data/db/crawlerMethodsDB.js";
import {getDecodedLink} from "./utils.js"
import {saveError} from "../error/saveError.js";

let remoteBrowsers = config.remoteBrowser.map(item => {
    item.password = encodeURIComponent(item.password);
    item.apiCallCount = 0;
    return item;
});

let sourcesObject = await getSourcesObjDB();
let sourcesObject_date = Date.now();
let blackListSources = [];

export async function getPageData(url, sourceName, sourceAuthStatus = 'ok', useAxiosFirst = false, cookieOnly = false, retryCount = 0) {
    let decodedUrl = getDecodedLink(url);
    if (decodedUrl === url) {
        url = encodeURIComponent(url);
    }

    let axiosResult = null;
    if (useAxiosFirst && !cookieOnly && !decodedUrl.match(/page([=\/])\d+/i) && !decodedUrl.match(/((\.[a-zA-Z]+)|((?<!-)series?\/?))$/i)) {
        axiosResult = await useAxiosGet(decodedUrl, sourceName, sourceAuthStatus);
        if (axiosResult && axiosResult.pageContent && !axiosResult.isSus) {
            return axiosResult;
        }
    }

    let selectedBrowser;
    try {
        if (remoteBrowsers.length === 0) {
            // no remote browser provided
            return null;
        }

        while (true) {
            selectedBrowser = remoteBrowsers
                //tabsCount - apiCallCount :: server capability
                .sort((a, b) => (b.tabsCount - b.apiCallCount) - (a.tabsCount - a.apiCallCount))
                .find(item => item.apiCallCount < 2 * item.tabsCount);
            if (selectedBrowser) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        selectedBrowser.apiCallCount++;
        let sourceCookies = sourcesObject
            ? sourcesObject[sourceName].cookies.map(item => item.name + '=' + item.value + ';').join(' ')
            : "";
        let response = await axios.get(
            `${selectedBrowser.endpoint}/headlessBrowser/?password=${selectedBrowser.password}&url=${url}&cookieOnly=${cookieOnly}&sourceCookies=${sourceCookies}`
        );
        selectedBrowser.apiCallCount--;

        let data = response.data;
        if (!data || data.error) {
            return null;
        }

        data.isAxiosResult = false;
        data.isAxiosCalled = axiosResult && axiosResult.isAxiosCalled;
        if (axiosResult && axiosResult.pageContent && axiosResult.isSus) {
            let $ = cheerio.load(data.pageContent);
            let links = $('a');
            if (Math.abs(links.length - axiosResult.linksCount) > 2) {
                addSourceToBlackList(sourceName);
            }
        }

        return data;
    } catch (error) {
        if (error.response && error.response.status === 503) {
            if (retryCount < 2) {
                if (selectedBrowser) {
                    selectedBrowser.apiCallCount--;
                }
                retryCount++;
                await new Promise(resolve => setTimeout(resolve, 4000));
                return await getPageData(url, sourceName, sourceAuthStatus, useAxiosFirst, cookieOnly, retryCount);
            }
        }
        if (error.code === 'ERR_UNESCAPED_CHARACTERS') {
            error.isAxiosError = true;
            error.url = url;
            error.filePath = 'remoteHeadlessBrowser';
        }
        await saveError(error);
        return null;
    }
}

export async function getYoutubeDownloadLink(youtubeUrl, retryCount = 0) {
    let decodedUrl = getDecodedLink(youtubeUrl);
    if (decodedUrl === youtubeUrl) {
        youtubeUrl = encodeURIComponent(youtubeUrl);
    }

    let selectedBrowser;
    try {
        if (remoteBrowsers.length === 0) {
            // no remote browser provided
            return null;
        }

        while (true) {
            selectedBrowser = remoteBrowsers
                //tabsCount - apiCallCount :: server capability
                .sort((a, b) => (b.tabsCount - b.apiCallCount) - (a.tabsCount - a.apiCallCount))
                .find(item => item.apiCallCount < 2 * item.tabsCount);
            if (selectedBrowser) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        selectedBrowser.apiCallCount++;
        let response = await axios.get(
            `${selectedBrowser.endpoint}/youtube/getDownloadLink/?password=${selectedBrowser.password}&youtubeUrl=${youtubeUrl}`
        );
        selectedBrowser.apiCallCount--;

        let data = response.data;
        if (!data || data.error) {
            return null;
        }
        //{downloadUrl, youtubeUrl}
        return data.res;
    } catch (error) {
        if (error.response && error.response.status === 503) {
            if (retryCount < 2) {
                if (selectedBrowser) {
                    selectedBrowser.apiCallCount--;
                }
                retryCount++;
                await new Promise(resolve => setTimeout(resolve, 4000));
                return await getYoutubeDownloadLink(youtubeUrl, retryCount);
            }
        }
        if (error.code === 'ERR_UNESCAPED_CHARACTERS') {
            error.isAxiosError = true;
            error.url = youtubeUrl;
            error.filePath = 'remoteHeadlessBrowser';
        }
        await saveError(error);
        return null;
    }
}

//--------------------------------------------------
//--------------------------------------------------

async function useAxiosGet(url, sourceName, sourceAuthStatus) {
    let result = {
        pageContent: null,
        responseUrl: '',
        pageTitle: '',
        cookies: [],
        isAxiosResult: true,
        isAxiosCalled: true,
        isSus: false,
        linksCount: 0,
    };
    try {
        await refreshSourcesObject();
        freeBlackListSources();
        let sourceData = blackListSources.find(item => item.sourceName === sourceName);
        if (sourceData && sourceData.isBlacklisted) {
            result.isAxiosCalled = false;
            return result;
        }
        let sourceCookies = sourcesObject ? sourcesObject[sourceName].cookies : [];
        let timeout = sourceAuthStatus === 'login-cookie' ? 5000 : 3000;
        let response = await axios.get(url, {
            timeout: timeout,
            headers: {
                Cookie: sourceCookies.map(item => item.name + '=' + item.value + ';').join(' '),
            }
        });
        let $ = cheerio.load(response.data);
        let links = $('a');
        result.pageContent = response.data;
        result.responseUrl = response.request.res.responseUrl;
        result.isSus = links.length < 90;
        result.linksCount = links.length;
        return result;
    } catch (error) {
        if (error.code === 'ERR_UNESCAPED_CHARACTERS') {
            if (decodeURIComponent(url) === url) {
                let temp = url.replace(/\/$/, '').split('/').pop();
                if (temp) {
                    url = url.replace(temp, encodeURIComponent(temp));
                    return await useAxiosGet(url, sourceName, sourceAuthStatus);
                }
            }
            error.isAxiosError = true;
            error.url = url;
            error.filePath = 'remoteHeadlessBrowser > useAxiosGet';
        } else if (error.response && error.response.status) {
            addSourceToBlackList(sourceName);
        }
        if (error.message !== 'timeout of 3000ms exceeded') {
            saveError(error);
        }
        return result;
    }
}

//---------------------------------------------
//---------------------------------------------

async function refreshSourcesObject() {
    let now = Date.now();
    if (now - sourcesObject_date > 10 * 60 * 1000) {
        //every 10min
        sourcesObject = await getSourcesObjDB();
        sourcesObject_date = now;
    }
}

function addSourceToBlackList(sourceName) {
    let sourceData = blackListSources.find(item => item.sourceName === sourceName);
    if (sourceData) {
        sourceData.lastError = Date.now();
        sourceData.isBlacklisted = true;
    } else {
        blackListSources.push({
            sourceName: sourceName,
            lastError: Date.now(),
            isBlacklisted: true,
            linksCount: 0,
        });
    }
}

function freeBlackListSources() {
    for (let i = 0; i < blackListSources.length; i++) {
        //free source after 3 hour
        blackListSources[i].isBlacklisted = (Date.now() - blackListSources[i].lastError) < 3 * 60 * 60 * 1000;
    }
}
