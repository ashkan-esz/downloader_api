import config from "../config/index.js";
import axios from "axios";
import {getDecodedLink} from "./utils.js"
import {saveError} from "../error/saveError.js";

let apiCallCount = 0;

//todo : use axios on remote browser error

export async function getPageData(url, retryCount = 0) {
    try {
        let decodedUrl = getDecodedLink(url);
        if (decodedUrl === url) {
            url = encodeURIComponent(url);
        }
        let remoteBrowserPassword = encodeURIComponent(config.remoteBrowser.password);
        let remoteBrowserEndPoint = config.remoteBrowser.endpoint;
        if (!remoteBrowserEndPoint) {
            return null;
        }
        while (apiCallCount > 4) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        if (retryCount === 0) {
            apiCallCount++;
        }
        let response = await axios.get(
            `${remoteBrowserEndPoint}/headlessBrowser/?password=${remoteBrowserPassword}&url=${url}`
        );
        apiCallCount--;
        let data = response.data;
        return (!data || data.error) ? null : data;
    } catch (error) {
        if (error.response && error.response.status === 503) {
            if (retryCount < 3) {
                retryCount++;
                await new Promise(resolve => setTimeout(resolve, 4000));
                return await getPageData(url, retryCount);
            }
        }
        apiCallCount--;
        await saveError(error);
        return null;
    }
}
