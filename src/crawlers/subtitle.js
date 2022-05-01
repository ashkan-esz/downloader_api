import axios from "axios";
import {uploadSubtitleToS3ByURl} from "../data/cloudStorage.js";
import {saveError} from "../error/saveError.js";


export function handleSubtitleUpdate(prevSubtitles, uploadedSubtitles) {
    let mergedSubtitles = [...prevSubtitles];
    for (let i = 0; i < uploadedSubtitles.length; i++) {
        let exist = false;
        for (let j = 0; j < mergedSubtitles.length; j++) {
            if (
                uploadedSubtitles[i].urlData && mergedSubtitles[j].urlData &&
                uploadedSubtitles[i].urlData.url === mergedSubtitles[j].urlData.url
            ) {
                exist = true;
                break;
            }
        }
        if (!exist) {
            mergedSubtitles.push(uploadedSubtitles[i]);
        }
    }
    mergedSubtitles = mergedSubtitles.sort((a, b) =>
        Number(b.episode.split('-').pop()) - Number(a.episode.split('-').pop())
    );
    return mergedSubtitles;
}

export async function getUploadedAnimeListSubtitles(subtitles, cookies) {
    await setSubtitlesFileName(subtitles, cookies);
    subtitles = await uploadNewSubtitlesToCloudStorage(subtitles, cookies);
    subtitles = subtitles.sort((a, b) =>
        Number(b.episode.split('-').pop()) - Number(a.episode.split('-').pop())
    );
    return subtitles;
}

async function uploadNewSubtitlesToCloudStorage(subtitles, cookies) {
    const cookiesString = cookies.map(ck => ck.name + '=' + ck.value).join(';');
    let promiseArray = [];
    for (let i = 0; i < subtitles.length; i++) {
        try {
            if (!subtitles[i].urlData) {
                let promise = uploadSubtitleToS3ByURl(subtitles[i].fileName, cookiesString, subtitles[i].originalUrl).then(subtitleUrlData => {
                    if (subtitleUrlData) {
                        subtitles[i].originalUrl = subtitles[i].originalUrl.replace(/\?token=.+$/g, '?token=');
                        subtitles[i].urlData = subtitleUrlData;
                    }
                });
                promiseArray.push(promise);
                if (promiseArray.length > 5) {
                    await Promise.allSettled(promiseArray);
                    promiseArray = [];
                }
            }
        } catch (error) {
            saveError(error);
        }
    }
    await Promise.allSettled(promiseArray);
    subtitles = subtitles.filter(item => item.urlData);
    return subtitles;
}

async function setSubtitlesFileName(subtitles, cookies) {
    const cookiesString = cookies.map(ck => ck.name + '=' + ck.value).join(';');
    let promiseArray = [];
    for (let i = 0; i < subtitles.length; i++) {
        try {
            let promise = axios.head(subtitles[i].originalUrl, {
                responseType: 'stream',
                headers: {
                    Cookie: cookiesString
                }
            }).then(response => {
                let fileName = response.headers['content-disposition'].replace('attachment; filename=', '').replace(/["']/g, '');
                subtitles[i].fileName = `animelist-${fileName}`;
            });
            promiseArray.push(promise);
            if (promiseArray.length > 10) {
                await Promise.allSettled(promiseArray);
                promiseArray = [];
            }
        } catch (error) {
            saveError(error);
        }
    }
    await Promise.allSettled(promiseArray);
    return subtitles;
}
