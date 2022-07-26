import config from "../config/index.js";
import axios from "axios";
import {getDecodedLink} from "./utils.js"
import {saveError} from "../error/saveError.js";

let remoteBrowsers = config.remoteBrowser.map(item => {
    item.password = encodeURIComponent(item.password);
    item.apiCallCount = 0;
    return item;
});

//todo : use normal axios.get on first time

export async function getPageData(url, cookieOnly = false, retryCount = 0) {
    let decodedUrl = getDecodedLink(url);
    if (decodedUrl === url) {
        url = encodeURIComponent(url);
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
                .find(item => item.apiCallCount < 2 * item.tabsCount)
            if (selectedBrowser) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        selectedBrowser.apiCallCount++;
        let response = await axios.get(
            `${selectedBrowser.endpoint}/headlessBrowser/?password=${selectedBrowser.password}&url=${url}&cookieOnly=${cookieOnly}`
        );
        selectedBrowser.apiCallCount--;

        let data = response.data;
        return (!data || data.error) ? null : data;
    } catch (error) {
        if (error.response && error.response.status === 503) {
            if (retryCount < 3) {
                if (selectedBrowser) {
                    selectedBrowser.apiCallCount--;
                }
                retryCount++;
                await new Promise(resolve => setTimeout(resolve, 4000));
                return await getPageData(url, cookieOnly, retryCount);
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
