const axios = require('axios').default;
const {uploadSubtitleToS3ByURl, checkSubtitleExist} = require('../data/cloudStorage');
const {saveError} = require('../error/saveError');


export function handleSubtitleUpdate(prevSubtitles, uploadedSubtitles) {
    let mergedSubtitles = [...prevSubtitles];
    for (let i = 0; i < uploadedSubtitles.length; i++) {
        let exist = false;
        for (let j = 0; j < mergedSubtitles.length; j++) {
            if (uploadedSubtitles[i].url === mergedSubtitles[j].url) {
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

export async function getUploadedAnimeListSubtitles(pageLink, subtitles, cookies) {
    if (!pageLink.match(/animelist|anime-list/gi)) {
        return [];
    }
    await setSubtitlesFileName(subtitles, cookies);
    subtitles = await addSubtitleDownloadLinkIfExist(subtitles);
    await uploadNewSubtitlesToCloudStorage(subtitles, cookies);
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
            if (!subtitles[i].url) {
                let promise = uploadSubtitleToS3ByURl(subtitles[i].originalUrl, subtitles[i].fileName, cookiesString).then(subtitleUrl => {
                    if (subtitleUrl) {
                        subtitles[i].originalUrl = subtitles[i].originalUrl.replace(/\?token=.+$/g, '?token=');
                        subtitles[i].url = subtitleUrl;
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
    subtitles = subtitles.filter(item => item.url);
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

async function addSubtitleDownloadLinkIfExist(subtitles) {
    let promiseArray = [];
    for (let i = 0; i < subtitles.length; i++) {
        try {
            let promise = checkSubtitleExist(subtitles[i].fileName).then(checkResult => {
                if (checkResult) {
                    subtitles[i].originalUrl = subtitles[i].originalUrl.replace(/\?token=.+$/g, '?token=');
                    subtitles[i].url = checkResult;
                }
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
