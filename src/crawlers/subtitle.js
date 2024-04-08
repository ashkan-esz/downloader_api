import {updateSerialLinks} from "./link.js";
import {saveError} from "../error/saveError.js";

export const subtitleFormatsRegex = /\.(srt|ssa|ttml|sbv|dfxp|vtt|txt|zip|rar)$/i;

export function handleSubtitlesUpdate(db_subtitles, currentGroupedSubtitles, sourceName) {
    try {
        let updateFlag = false;
        for (let i = 0; i < currentGroupedSubtitles.length; i++) {
            let checkSeason = db_subtitles.find(item => item.seasonNumber === currentGroupedSubtitles[i].seasonNumber);
            if (checkSeason) {
                //season exist
                checkSeason.checked = true;
                let prevLinks = checkSeason.links.filter(item => item.sourceName === sourceName);
                let currentLinks = currentGroupedSubtitles[i].links;
                let linkUpdateResult = updateSerialLinks(checkSeason, prevLinks, [], [], currentLinks, [], []);
                updateFlag = linkUpdateResult || updateFlag;
            } else {
                //new season
                currentGroupedSubtitles[i].checked = true;
                db_subtitles.push(currentGroupedSubtitles[i]);
                updateFlag = true;
            }
        }

        //handle removed subtitles
        for (let i = 0; i < db_subtitles.length; i++) {
            if (!db_subtitles[i].checked) {
                let prevLength = db_subtitles[i].links.length;
                db_subtitles[i].links = db_subtitles[i].links.filter(link => link.sourceName !== sourceName);
                let newLength = db_subtitles[i].links.length;
                if (prevLength !== newLength) {
                    updateFlag = true;
                }
            }
            delete db_subtitles[i].checked;
        }

        if (updateFlag) {
            db_subtitles = db_subtitles.sort((a, b) => a.seasonNumber - b.seasonNumber);
            for (let i = 0; i < db_subtitles.length; i++) {
                db_subtitles[i].links = db_subtitles[i].links.sort((a, b) => a.episode - b.episode);
            }
        }

        return updateFlag;
    } catch (error) {
        saveError(error);
        return false;
    }
}

export function groupSubtitles(subtitles) {
    let result = [];

    for (let i = 0; i < subtitles.length; i++) {
        let seasonExist = false;
        for (let j = 0; j < result.length; j++) {
            if (result[j].seasonNumber === subtitles[i].season) {
                seasonExist = true;
                result[j].links.push(subtitles[i]);
                break;
            }
        }
        if (!seasonExist) {
            result.push({
                seasonNumber: subtitles[i].season,
                links: [subtitles[i]],
            });
        }
    }

    result = result.sort((a, b) => a.seasonNumber - b.seasonNumber);
    for (let i = 0; i < result.length; i++) {
        result[i].links = result[i].links.sort((a, b) => a.episode - b.episode);
    }
    return result;
}
