import config from "../config/index.js";
import axios from "axios";
import * as cheerio from "cheerio";
import {getDecodedLink} from "./utils/utils.js";
import {saveError} from "../error/saveError.js";
import {saveGoogleCacheCall} from "../data/db/serverAnalysisDbMethods.js";
import {removeScriptAndStyle} from "./searchTools.js";

let callCounter = 0;
let error429Time = 0;

export async function getFromGoogleCache(url, retryCounter = 0) {
    try {
        while (callCounter > 4) {
            await new Promise((resolve => setTimeout(resolve, 100)));
        }
        if (Date.now() - error429Time < 20 * 60 * 1000) {
            //prevent call for 20min after getting 429 error
            return {$: null, links: []};
        }
        callCounter++;

        let decodedLink = getDecodedLink(url);
        if (config.nodeEnv === 'dev') {
            console.log('google cache: ', decodedLink);
        }
        await saveGoogleCacheCall(decodedLink);
        let cacheUrl = "http://webcache.googleusercontent.com/search?channel=fs&client=ubuntu&q=cache%3A";
        let webCacheUrl = cacheUrl + decodedLink;
        let response = await axios.get(webCacheUrl);
        await new Promise((resolve => setTimeout(resolve, 200)));
        callCounter--;
        response.data = removeScriptAndStyle(response.data);
        let $ = cheerio.load(response.data);
        let links = $('a');
        return {$, links};
    } catch (error) {
        callCounter--;
        if (error.message === 'Request failed with status code 429') {
            error429Time = Date.now();
        }
        if (error.code === 'ERR_UNESCAPED_CHARACTERS') {
            if (retryCounter === 0) {
                let temp = url.replace(/\/$/, '').split('/').pop();
                if (temp) {
                    let tempEncode = encodeURIComponent(encodeURIComponent(temp));
                    url = url.replace(temp, tempEncode);
                    retryCounter++;
                    return await getFromGoogleCache(url, retryCounter);
                }
            }
            error.isAxiosError = true;
            error.url = getDecodedLink(url);
            error.filePath = 'searchTools';
            await saveError(error);
        } else if (!error.response || (error.response.status !== 404 && error.response.status !== 429)) {
            saveError(error);
        }
        return {$: null, links: []};
    }
}
