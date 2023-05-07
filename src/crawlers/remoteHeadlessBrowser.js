import config from "../config/index.js";
import axios from "axios";
import cheerio from "cheerio";
import {getSourcesObjDB} from "../data/db/crawlerMethodsDB.js";
import {getDecodedLink} from "./utils.js"
import {getResponseWithCookie} from "./axiosUtils.js";
import {saveError} from "../error/saveError.js";

export const remoteBrowsers = config.remoteBrowser.map(item => {
    item.password = encodeURIComponent(item.password);
    item.apiCallCount = 0;
    item.urls = [];
    item.sourcesData = [];
    item.disabledTime = 0;
    item.disabled = false;
    return item;
});

let sourcesObject = await getSourcesObjDB();
let sourcesObject_date = Date.now();
let blackListSources = [];

let errorsAndTimes = [];

export async function getPageData(url, sourceName, sourceAuthStatus = 'ok', useAxiosFirst = false, cookieOnly = false, prevUsedBrowsers = []) {
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
            return axiosResult;
        }

        while (true) {
            freeBlockedSourcesFromBrowserServers();
            reactivateDisabledServers();
            if (!checkAnyBrowserServerCanHandleSource(sourceName)) {
                //this source is blocked on all browsers
                return axiosResult;
            }

            let notUsedBrowsers = remoteBrowsers
                .filter(item => !item.disabled)
                .filter(item => !prevUsedBrowsers.includes(item.endpoint));
            if (notUsedBrowsers.length === 0) {
                //if there is only 1 browser, retry the same browser
                if (remoteBrowsers.length === 1 && prevUsedBrowsers.length === 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    notUsedBrowsers = remoteBrowsers;
                } else {
                    return axiosResult;
                }
            }

            selectedBrowser = notUsedBrowsers
                //tabsCount - apiCallCount :: server capability
                .sort((a, b) => (b.tabsCount - b.apiCallCount) - (a.tabsCount - a.apiCallCount))
                .filter(item => item.apiCallCount < 2 * item.tabsCount)
                .find(item => {
                    let source = item.sourcesData.find(s => s.sourceName === sourceName);
                    return !source || !source.isBlocked;
                });
            if (selectedBrowser) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        selectedBrowser.apiCallCount++;
        selectedBrowser.urls.push(decodedUrl);
        let sourceCookies = sourcesObject
            ? sourcesObject[sourceName].cookies.map(item => item.name + '=' + item.value + ';').join(' ')
            : "";
        sourceCookies = sourceCookies ? ("&sourceCookies=" + sourceCookies) : "";
        let response = await axios.get(
            `${selectedBrowser.endpoint}/headlessBrowser/?password=${selectedBrowser.password}&url=${url}&cookieOnly=${cookieOnly}` + sourceCookies,
            {
                timeout: 50 * 1000, //50s timeout
            },
        );
        selectedBrowser.apiCallCount--;
        selectedBrowser.urls = selectedBrowser.urls.filter(item => item !== decodedUrl);

        let data = response.data;
        if (!data || !data.pageContent || data.error) {
            addSourceErrorToBrowserServer(selectedBrowser, sourceName);
            prevUsedBrowsers.push(selectedBrowser.endpoint);
            await new Promise(resolve => setTimeout(resolve, 2000));
            return await getPageData(url, sourceName, sourceAuthStatus, useAxiosFirst, cookieOnly, prevUsedBrowsers);
        } else {
            resetSourceErrorOfBrowserServer(selectedBrowser, sourceName);
        }

        data.isAxiosResult = false;
        data.isAxiosCalled = axiosResult ? axiosResult.isAxiosCalled : false;
        if (axiosResult && axiosResult.pageContent && axiosResult.isSus) {
            let $ = cheerio.load(data.pageContent);
            let links = $('a');
            if (Math.abs(links.length - axiosResult.linksCount) > 2) {
                addSourceToAxiosBlackList(sourceName);
            }
        }

        return data;
    } catch (error) {
        let handleErrorResult = await handleBrowserCallErrors(error, selectedBrowser, url, prevUsedBrowsers, sourceName);
        if (handleErrorResult === "retry") {
            return await getPageData(url, sourceName, sourceAuthStatus, useAxiosFirst, cookieOnly, prevUsedBrowsers);
        }
        return null;
    }
}

export async function getYoutubeDownloadLink(youtubeUrl, prevUsedBrowsers = []) {
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
            let notUsedBrowsers = remoteBrowsers
                .filter(item => !item.disabled)
                .filter(item => !prevUsedBrowsers.includes(item.endpoint));
            if (notUsedBrowsers.length === 0) {
                //if there is only 1 browser, retry the same browser
                if (remoteBrowsers.length === 1 && prevUsedBrowsers.length === 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    notUsedBrowsers = remoteBrowsers;
                } else {
                    return null;
                }
            }
            selectedBrowser = notUsedBrowsers
                //tabsCount - apiCallCount :: server capability
                .sort((a, b) => (b.tabsCount - b.apiCallCount) - (a.tabsCount - a.apiCallCount))
                .find(item => item.apiCallCount < 2 * item.tabsCount);
            if (selectedBrowser) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        selectedBrowser.apiCallCount++;
        selectedBrowser.urls.push(decodedUrl);
        let response = await axios.get(
            `${selectedBrowser.endpoint}/youtube/getDownloadLink/?password=${selectedBrowser.password}&youtubeUrl=${youtubeUrl}`,
            {
                timeout: 70 * 1000, //70s timeout
            },
        );
        selectedBrowser.apiCallCount--;
        selectedBrowser.urls = selectedBrowser.urls.filter(item => item !== decodedUrl);

        let data = response.data;
        if (!data || data.error) {
            prevUsedBrowsers.push(selectedBrowser.endpoint);
            await new Promise(resolve => setTimeout(resolve, 2000));
            return await getYoutubeDownloadLink(youtubeUrl, prevUsedBrowsers);
        }
        //{downloadUrl, youtubeUrl}
        return data.res;
    } catch (error) {
        let handleErrorResult = await handleBrowserCallErrors(error, selectedBrowser, youtubeUrl, prevUsedBrowsers, "");
        if (handleErrorResult === "retry") {
            return await getYoutubeDownloadLink(youtubeUrl, prevUsedBrowsers);
        }
        return null;
    }
}

async function handleBrowserCallErrors(error, selectedBrowser, url, prevUsedBrowsers, sourceName) {
    if (error.code === 'ERR_UNESCAPED_CHARACTERS') {
        error.isAxiosError = true;
        error.url = url;
        error.filePath = 'remoteHeadlessBrowser';
    }
    if (selectedBrowser && (error.message === "timeout of 50000ms exceeded" || error.message === "timeout of 70000ms exceeded")) {
        selectedBrowser.apiCallCount--;
        selectedBrowser.urls = selectedBrowser.urls.filter(item => item !== getDecodedLink(url));
        if (sourceName) {
            addSourceErrorToBrowserServer(selectedBrowser, sourceName);
        }
        if (checkErrorNeedToSave(error, selectedBrowser.endpoint)) {
            error.url = url;
            error.browserServer = selectedBrowser.endpoint;
            error.prevUsedBrowsers = prevUsedBrowsers;
            await saveError(error);
        }
        prevUsedBrowsers.push(selectedBrowser.endpoint);
        await new Promise(resolve => setTimeout(resolve, 3000));
        return "retry";
    }
    if (selectedBrowser && error.response && (error.response.status === 404 || error.response.status >= 500)) {
        try {
            let r = await axios.get(selectedBrowser.endpoint);
            selectedBrowser.apiCallCount--;
            selectedBrowser.urls = selectedBrowser.urls.filter(item => item !== getDecodedLink(url));
            if (sourceName) {
                addSourceErrorToBrowserServer(selectedBrowser, sourceName);
            }
            if (checkErrorNeedToSave(error, selectedBrowser.endpoint)) {
                error.url = url;
                error.browserServer = selectedBrowser.endpoint;
                error.prevUsedBrowsers = prevUsedBrowsers;
                await saveError(error);
            }
            prevUsedBrowsers.push(selectedBrowser.endpoint);
            await new Promise(resolve => setTimeout(resolve, 3000));
            return "retry";
        } catch (err) {
            selectedBrowser.apiCallCount--;
            selectedBrowser.urls = selectedBrowser.urls.filter(item => item !== getDecodedLink(url));
            if (selectedBrowser && error.response && (error.response.status === 404 || error.response.status >= 500)) {
                //remote server got deactivated or removed from server
                if (selectedBrowser.disabled) {
                    return "retry";
                }
                selectedBrowser.disabled = true;
                selectedBrowser.disabledTime = Date.now();
                if (checkErrorNeedToSave(error, selectedBrowser.endpoint)) {
                    error.url = url;
                    error.browserServer = selectedBrowser.endpoint;
                    error.prevUsedBrowsers = prevUsedBrowsers;
                    await saveError(error);
                }
                prevUsedBrowsers.push(selectedBrowser.endpoint);
                await new Promise(resolve => setTimeout(resolve, 3000));
                return "retry";
            }
        }
    }
    selectedBrowser.apiCallCount--;
    selectedBrowser.urls = selectedBrowser.urls.filter(item => item !== getDecodedLink(url));
    await saveError(error);
    return "return null";
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
        await refreshAxiosSourcesObject();
        freeAxiosBlackListSources();
        let sourceData = blackListSources.find(item => item.sourceName === sourceName);
        if (sourceData && sourceData.isBlocked) {
            result.isAxiosCalled = false;
            return result;
        }
        let sourceCookies = sourcesObject ? sourcesObject[sourceName].cookies : [];
        const cookie = sourceCookies.map(item => item.name + '=' + item.value + ';').join(' ');
        let timeout = sourceAuthStatus === 'login-cookie' ? 6000 : 3000;
        let response = await getResponseWithCookie(url, cookie, timeout);
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
            addSourceToAxiosBlackList(sourceName);
        }
        if (error.message !== 'timeout of 3000ms exceeded') {
            if (Object.isExtensible(error) && !Object.isFrozen(error) && !Object.isSealed(error)) {
                error.isAxiosError2 = true;
                error.url = url;
                error.filePath = 'remoteHeadlessBrowser > useAxiosGet 2';
            } else {
                //sometimes error object is read-only
                let temp = error;
                error = new Error(temp.message);
                Object.assign(error, temp);
                error.stack0 = temp.stack;
                error.message0 = temp.message;
                error.isAxiosError2 = true;
                error.url = url;
                error.filePath = 'remoteHeadlessBrowser > useAxiosGet 2';
            }
            saveError(error);
        }
        return result;
    }
}

//---------------------------------------------
//---------------------------------------------

function checkAnyBrowserServerCanHandleSource(sourceName) {
    for (let i = 0; i < remoteBrowsers.length; i++) {
        let sources = remoteBrowsers[i].sourcesData;
        let foundSource = false;
        for (let j = 0; j < sources.length; j++) {
            if (sources[j].sourceName === sourceName) {
                foundSource = true;
                if (!sources[j].isBlocked) {
                    return true;
                }
                if (Date.now() - sources[j].lastErrorTime > 29 * 60 * 1000) {
                    //the source is near to get free, (1min left)
                    return true;
                }
            }
        }
        if (!foundSource) {
            return true;
        }
    }
    return false;
}

function addSourceErrorToBrowserServer(selectedBrowser, sourceName) {
    let sourceData = selectedBrowser.sourcesData.find(item => item.sourceName === sourceName);
    if (sourceData) {
        sourceData.errorCounter++;
        sourceData.lastErrorTime = Date.now();
        if (sourceData.errorCounter >= 5) {
            sourceData.isBlocked = true;
        }
    } else {
        selectedBrowser.sourcesData.push({
            sourceName: sourceName,
            errorCounter: 1,
            lastErrorTime: Date.now(),
            isBlocked: false,
        });
    }
}

function resetSourceErrorOfBrowserServer(selectedBrowser, sourceName) {
    let sourceData = selectedBrowser.sourcesData.find(item => item.sourceName === sourceName);
    if (sourceData) {
        sourceData.errorCounter = 0;
        sourceData.lastErrorTime = 0;
        sourceData.isBlocked = false;
    }
}

function freeBlockedSourcesFromBrowserServers() {
    for (let i = 0; i < remoteBrowsers.length; i++) {
        let sources = remoteBrowsers[i].sourcesData;
        for (let j = 0; j < sources.length; j++) {
            if (Date.now() - sources[j].lastErrorTime > 30 * 60 * 1000) {
                sources[j].errorCounter = 0;
                sources[j].lastErrorTime = 0;
                sources[j].isBlocked = false;
            }
        }
    }
}

//---------------------------------------------
//---------------------------------------------

async function refreshAxiosSourcesObject() {
    let now = Date.now();
    if (now - sourcesObject_date > 10 * 60 * 1000) {
        //every 10min
        sourcesObject = await getSourcesObjDB();
        sourcesObject_date = now;
    }
}

export async function getAxiosSourcesObject() {
    await refreshAxiosSourcesObject();
    return sourcesObject;
}

function addSourceToAxiosBlackList(sourceName) {
    let sourceData = blackListSources.find(item => item.sourceName === sourceName);
    if (sourceData) {
        sourceData.lastErrorTime = Date.now();
        sourceData.isBlocked = true;
    } else {
        blackListSources.push({
            sourceName: sourceName,
            lastErrorTime: Date.now(),
            isBlocked: true,
            linksCount: 0,
        });
    }
}

function freeAxiosBlackListSources() {
    for (let i = 0; i < blackListSources.length; i++) {
        //free source after 3 hour
        blackListSources[i].isBlocked = (Date.now() - blackListSources[i].lastErrorTime) < 3 * 60 * 60 * 1000; //3h
    }
}

function reactivateDisabledServers() {
    for (let i = 0; i < remoteBrowsers.length; i++) {
        //reActivate browser server after 2 hour
        if (remoteBrowsers[i].disabled) {
            remoteBrowsers[i].disabled = (Date.now() - remoteBrowsers[i].disabledTime) < 2 * 60 * 60 * 1000; //2h
            if (!remoteBrowsers[i].disabled) {
                remoteBrowsers[i].disabledTime = 0;
            }
        }
    }
}

//---------------------------------------------
//---------------------------------------------

function checkErrorNeedToSave(error, serverUrl) {
    let errorMessage = error.message + '|' + error.code + '|' + error.response?.status + '|' + serverUrl;
    let errDataTime = errorsAndTimes.find(item => item.errorMessage === errorMessage);
    if (errDataTime) {
        if (Date.now() - errDataTime.savedTime > 20 * 60 * 1000) {
            //save errors every 20min, dont save duplicate errors
            errDataTime.savedTime = Date.now();
            return true;
        }
        return false;
    } else {
        errorsAndTimes.push({
            errorMessage: errorMessage,
            savedTime: Date.now(),
        });
        return true;
    }
}
