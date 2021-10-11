const axios = require('axios').default;
const {replaceSpecialCharacters, getDatesBetween} = require("../utils");
const {
    getStatusObjDB,
    updateStatusObjDB,
    searchTitleDB,
    updateByIdDB,
    insertToDB,
    updateMovieCollectionDB
} = require("../../dbMethods");
const {uploadTitlePosterToS3, uploadTitleTrailerFromYoutubeToS3} = require("../../cloudStorage");
const {getTitleModel} = require("../models/title");
const {default: pQueue} = require('p-queue');
const {saveError} = require("../../saveError");
const Sentry = require('@sentry/node');

let imdbApiKeys = [];
let apiKeyCounter = 0;

export async function updateImdbData() {
    imdbApiKeys = process.env.IMDB_API_KEY
        .split('-')
        .map(item => ({apikey: item.trim(), reachedMax: false}));
    let checkApiLimit = await checkReachedMaxAllKeys(true);
    if (checkApiLimit) {
        return;
    }

    let states = await getStatusObjDB();
    if (!states) {
        return;
    }
    //update data each 12 hour
    let now = new Date();
    let imdbDataUpdateDate = new Date(states.imdbDataUpdateDate);
    if (getDatesBetween(now, imdbDataUpdateDate).hours < 12) {
        return;
    }
    states.imdbDataUpdateDate = now;

    //reset rank
    await updateMovieCollectionDB({
        'rank.comingSoon': -1,
        'rank.inTheaters': -1,
        'rank.top': -1,
        'rank.popular': -1,
    });

    await add_Top_popular('movie', 'top');
    await add_Top_popular('serial', 'top');
    await add_Top_popular('movie', 'popular');
    await add_Top_popular('serial', 'popular');

    await add_inTheaters_comingSoon('movie', 'inTheaters');
    await add_inTheaters_comingSoon('movie', 'comingSoon');

    states.boxOffice = await getBoxOfficeData();

    await updateStatusObjDB(states);
}

async function add_Top_popular(type, mode) {
    let url = '';
    if (mode === 'top') {
        url = type === 'movie'
            ? `https://imdb-api.com/en/API/Top250Movies/$apikey$`
            : `https://imdb-api.com/en/API/Top250TVs/$apikey$`;
    } else if (mode === 'popular') {
        url = type === 'movie'
            ? `https://imdb-api.com/en/API/MostPopularMovies/$apikey$`
            : `https://imdb-api.com/en/API/MostPopularTVs/$apikey$`;
    }

    let apiResult = await handleApiCall(url);
    if (!apiResult) {
        return;
    }

    let top_popular = apiResult.items;
    const promiseQueue = new pQueue({concurrency: 2});
    for (let i = 0; i < top_popular.length; i++) {
        let titleDataFromDB = await getTitleDataFromDB(top_popular[i].title, top_popular[i].year, type);
        if (titleDataFromDB) {
            await update_top_popular_title(titleDataFromDB, top_popular[i], type, mode, Number(top_popular[i].rank));
        } else {
            //title doesnt exist in db , add it
            let titleDataFromIMDB = await getTitleDataFromIMDB(top_popular[i].id);
            if (titleDataFromIMDB) {
                let status = type.includes('movie') ? 'ended' : 'unknown';
                promiseQueue.add(() => addImdbTitleToDB(titleDataFromIMDB, type, status, 'waiting', mode, Number(top_popular[i].rank)));
            }
        }
    }
    await promiseQueue.onEmpty();
    await promiseQueue.onIdle();
}

async function update_top_popular_title(titleDataFromDB, semiImdbData, type, mode, rank) {
    let updateFields = {};

    if (mode === 'top') {
        titleDataFromDB.rank.top = rank;
    } else {
        titleDataFromDB.rank.popular = rank;
    }
    updateFields.rank = titleDataFromDB.rank;

    //title exist in db , fix imdbID and imdb rating if needed
    if (!titleDataFromDB.imdbID) {
        updateFields.imdbID = semiImdbData.id;
    }
    if (Number(semiImdbData.imDbRating) !== titleDataFromDB.rating.imdb) {
        titleDataFromDB.rating.imdb = Number(semiImdbData.imDbRating);
        updateFields.rating = titleDataFromDB.rating;
    }
    if (Object.keys(updateFields).length > 0) {
        await updateByIdDB('movies', titleDataFromDB._id, updateFields);
    }
}

async function add_inTheaters_comingSoon(type, mode) {
    let url = mode === 'inTheaters'
        ? `https://imdb-api.com/en/API/InTheaters/$apikey$`
        : `https://imdb-api.com/en/API/ComingSoon/$apikey$`;

    let apiResult = await handleApiCall(url);
    if (!apiResult) {
        return;
    }
    let theatres_soon = apiResult.items;
    const promiseQueue = new pQueue({concurrency: 2});
    for (let i = 0; i < theatres_soon.length; i++) {
        let titleDataFromDB = await getTitleDataFromDB(theatres_soon[i].title, theatres_soon[i].year, type);
        if (titleDataFromDB) {
            await update_inTheaters_comingSoon_title(titleDataFromDB, theatres_soon[i], type, mode, (i + 1));
        } else {
            //title doesnt exist in db , add it
            let titleDataFromIMDB = theatres_soon[i];
            promiseQueue.add(() => addImdbTitleToDB(titleDataFromIMDB, type, mode, mode, mode, (i + 1)));
        }
    }
    await promiseQueue.onEmpty();
    await promiseQueue.onIdle();
}

async function update_inTheaters_comingSoon_title(titleDataFromDB, semiImdbData, type, mode, rank) {
    let updateFields = {};

    if (mode === 'inTheaters') {
        titleDataFromDB.rank.inTheaters = rank;
    } else {
        titleDataFromDB.rank.comingSoon = rank;
    }
    updateFields.rank = titleDataFromDB.rank;

    //title exist in db , fix imdbID and imdb rating if needed
    if (!titleDataFromDB.imdbID) {
        updateFields.imdbID = semiImdbData.id;
    }
    if (Number(semiImdbData.imDbRating) !== titleDataFromDB.rating.imdb) {
        titleDataFromDB.rating.imdb = Number(semiImdbData.imDbRating);
        updateFields.rating = titleDataFromDB.rating;
    }
    if (titleDataFromDB.releaseState !== mode) {
        updateFields.releaseState = mode;
    }

    if (!titleDataFromDB.trailers) {
        let s3Trailer = await uploadTrailer(semiImdbData.title, semiImdbData.year, type, semiImdbData.id);
        if (s3Trailer) {
            updateFields.trailer_s3 = s3Trailer;
            updateFields.trailers = [{
                link: s3Trailer,
                info: 's3Trailer-720p'
            }];
        }
    }

    if (Object.keys(updateFields).length > 0) {
        await updateByIdDB('movies', titleDataFromDB._id, updateFields);
    }
}

async function addImdbTitleToDB(imdbData, type, status, releaseState = 'waiting', mode, rank) {
    let titleObj = {
        title: replaceSpecialCharacters(imdbData.title.toLowerCase()),
        rawTitle: imdbData.title,
        alternateTitles: [],
        titleSynonyms: [],
    }
    let titleModel = getTitleModel(
        titleObj, '', type, [],
        imdbData.year, '', '',
        [], [], []
    );
    titleModel.sources = [];
    titleModel.posters = [];
    titleModel.insert_date = 0;
    titleModel.apiUpdateDate = 0;
    titleModel.status = status;
    titleModel.releaseState = releaseState;
    if (mode === 'top') {
        titleModel.rank.top = rank;
    } else if (mode === 'popular') {
        titleModel.rank.popular = rank;
    } else if (mode === 'inTheaters') {
        titleModel.rank.inTheaters = rank;
    } else {
        titleModel.rank.comingSoon = rank;
    }

    await uploadPosterAndTrailer(titleModel, imdbData, releaseState);

    titleModel.imdbID = imdbData.id;
    if (imdbData.releaseDate) {
        titleModel.premiered = imdbData.releaseDate;
        titleModel.year = imdbData.releaseDate.split('-')[0];
    }
    titleModel.duration = imdbData.runtimeMins ? imdbData.runtimeMins + ' min' : '0 min';
    titleModel.summary.english = imdbData.plot;
    titleModel.awards = imdbData.awards || '';
    titleModel.genres = imdbData.genres ? imdbData.genres.toLowerCase().split(',').map(item => item.trim()) : [];
    titleModel.country = imdbData.countries ? imdbData.countries.toLowerCase() : '';
    titleModel.movieLang = imdbData.languages ? imdbData.languages.toLowerCase() : '';
    titleModel.rated = imdbData.contentRating;
    titleModel.rating.imdb = Number(imdbData.imDbRating);
    titleModel.rating.metacritic = Number(imdbData.metacriticRating);
    titleModel.rating.rottenTomatoes = imdbData.ratings ? Number(imdbData.ratings.rottenTomatoes) : 0;
    if (status === 'unknown' && imdbData.tvSeriesInfo && imdbData.tvSeriesInfo.yearEnd) {
        titleModel.endYear = imdbData.tvSeriesInfo.yearEnd.split('-')[0];
        titleModel.status = 'ended';
    }

    await insertToDB('movies', titleModel);
}

async function getBoxOfficeData() {
    let url = 'https://imdb-api.com/en/API/BoxOffice/$apikey$';
    let boxOfficeData = await handleApiCall(url);
    return boxOfficeData ? boxOfficeData.items.map(item => {
        delete item.image;
        return item;
    }) : [];
}

async function uploadPosterAndTrailer(titleModel, imdbData, releaseState) {
    let imdbPoster = imdbData.image.replace(/\.*_v1.*al_/gi, '');
    let s3poster = await uploadTitlePosterToS3(titleModel.title, titleModel.type, imdbData.year, [imdbPoster]);
    if (s3poster) {
        titleModel.posters = [s3poster];
        titleModel.poster_s3 = s3poster;
    }

    if (releaseState !== 'waiting') {
        let s3Trailer = await uploadTrailer(titleModel.title, titleModel.year, titleModel.type, imdbData.id);
        if (s3Trailer) {
            titleModel.trailer_s3 = s3Trailer;
            titleModel.trailers = [{
                link: s3Trailer,
                info: 's3Trailer-720p'
            }];
        }
    }
}

async function getTitleDataFromIMDB(id) {
    let url = `https://imdb-api.com/en/API/Title/$apikey$/${id}/Ratings`;
    return await handleApiCall(url);
}

async function getTitleDataFromDB(title, year, type) {
    title = replaceSpecialCharacters(title.toLowerCase());
    let titleObj = {
        title: title,
        alternateTitles: [],
        titleSynonyms: [],
    }
    let temp = await searchTitleDB(titleObj, [type], year, {
        rank: 1,
        imdbID: 1,
        rating: 1,
        releaseState: 1,
        trailers: 1,
    });
    return temp.length > 0 ? temp[0] : null;
}

async function uploadTrailer(title, year, type, imdbID) {
    title = replaceSpecialCharacters(title.toLowerCase());
    let trailerDataUrl = `https://imdb-api.com/en/API/YouTubeTrailer/$apikey$/${imdbID}`;
    let trailerData = await handleApiCall(trailerDataUrl);
    if (trailerData) {
        let youtubeTrailer = trailerData.videoUrl;
        if (youtubeTrailer) {
            return await uploadTitleTrailerFromYoutubeToS3(title, type, year, [youtubeTrailer]);
        }
    }
    return '';
}

async function handleApiCall(url) {
    let checkApiLimit = await checkReachedMaxAllKeys();
    if (!url || checkApiLimit) {
        return null;
    }
    let waitCounter = 0;
    while (waitCounter < 10) {
        try {
            let temp = url.replace('$apikey$', imdbApiKeys[apiKeyCounter].apikey);
            let response = await axios.get(temp);
            let data = response.data;
            if (data.errorMessage &&
                (
                    data.errorMessage.includes('Maximum usage') ||
                    data.errorMessage.includes('Invalid API Key')
                )) {
                imdbApiKeys[apiKeyCounter].reachedMax = true;
                let index = -1;
                for (let i = 0; i < imdbApiKeys.length; i++) {
                    if (!imdbApiKeys[i].reachedMax) {
                        index = i;
                        break;
                    }
                }
                if (index !== -1) {
                    apiKeyCounter = index;
                    return await handleApiCall(url);
                } else {
                    Sentry.captureMessage(`need more imdb api key: ${url}`);
                    return null;
                }
            }
            return data;
        } catch (error) {
            if (error.response && error.response.status === 429) {
                //too much request
                await new Promise((resolve => setTimeout(resolve, 1000)));
                waitCounter++;
            } else {
                if (error.response && error.response.status !== 404) {
                    await saveError(error);
                }
                return null;
            }
        }
    }
    Sentry.captureMessage(`lots of imdb api call: ${url}`);
    return null;
}

async function checkReachedMaxAllKeys(force = false) {
    for (let i = 0; i < imdbApiKeys.length; i++) {
        if (!imdbApiKeys[i].reachedMax) {
            if (force) {
                let testResult = await handleApiCall('https://imdb-api.com/en/API/Top250Movies/$apikey$');
                if (testResult) {
                    return false;
                }
            } else {
                return false;
            }
        }
    }
    return true;
}
