import config from "../../config/index.js";
import {google} from "googleapis";
import {saveError} from "../../error/saveError.js";
import {replaceSpecialCharacters} from "../utils/utils.js";


export async function getTrailerFromYoutube(title, year) {
    try {
        let searchResult = await google.youtube('v3').search.list({
            auth: config.apiKeys.googleApiKey,
            maxResults: 10,
            part: 'snippet',
            type: 'video',
            q: `${title} | Official Trailer`,
        });
        title = replaceSpecialCharacters(title.toLowerCase());
        let items = searchResult.data.items.filter(item => replaceSpecialCharacters(item.snippet.title.toLowerCase()).includes(title))
            .map(data => {
                data.snippet.title = data.snippet.title.toLowerCase().replace(/\s\(\d\d\d\d\)$/, '');
                return data;
            });

        const trailerTexts = ['Official Trailer', 'Official Anime Trailer', 'TRAILER OFFICIEL', 'Trailer', 'Official Teaser'].map(i => i.toLowerCase());
        year = Number(year);
        const years = [year, year - 1, year + 1];

        for (let i = 0; i < trailerTexts.length; i++) {
            for (let j = 0; j < years.length; j++) {
                let temp = items.find(item => item.snippet.title.endsWith(trailerTexts[i]) && item.snippet.publishTime.startsWith(years[j] + '-'));
                if (temp) {
                    return 'https://www.youtube.com/watch?v=' + temp.id.videoId;
                }
            }
        }
        for (let i = 0; i < trailerTexts.length; i++) {
            for (let j = 0; j < years.length; j++) {
                let temp = items.find(item => item.snippet.title.includes(trailerTexts[i]) && item.snippet.publishTime.startsWith(years[j] + '-'));
                if (temp) {
                    return 'https://www.youtube.com/watch?v=' + temp.id.videoId;
                }
            }
        }

    } catch (error) {
        if (!error.errors?.[0]?.message?.includes('exceeded')) {
            saveError(error);
        }
        return null;
    }
}