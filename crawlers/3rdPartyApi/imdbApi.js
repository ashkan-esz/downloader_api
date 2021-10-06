const axios = require('axios').default;
const {replaceSpecialCharacters, getDatesBetween} = require("../utils");
const {getStatusObjDB, updateStatusObjDB, searchTitleDB, updateByIdDB, insertToDB} = require("../../dbMethods");
const {
    checkTitlePosterExist,
    uploadTitlePosterToS3,
    checkTitleTrailerExist,
    uploadTitleTrailerToS3
} = require("../../cloudStorage");
const {getTitleModel} = require("../models/title");
const {saveError} = require("../../saveError");
const Sentry = require('@sentry/node');

let imdbApiKeys = process.env.IMDB_API_KEY.split('-');
let apiKeyCounter = 0;

export async function updateImdbData() {
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

    await add_Top_popular('movie', 'top', states.prevTop250_movie);
    await add_Top_popular('serial', 'top', states.prevTop250_serial);
    await add_Top_popular('movie', 'popular', states.popular100_movie);
    await add_Top_popular('serial', 'popular', states.popular100_serial);

    await add_inTheaters_comingSoon('movie', 'inTheaters');
    await add_inTheaters_comingSoon('movie', 'comingSoon');

    states.boxOffice = await getBoxOfficeData();

    await updateStatusObjDB(states);
}

async function add_Top_popular(type, mode, prevTopPopular) {
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
    let top_popular = apiResult.items.map(item => {
        delete item.fullTitle;
        delete item.image;
        delete item.crew;
        delete item.imDbRatingCount;
        return item;
    });
    for (let i = 0; i < top_popular.length; i++) {
        if (prevTopPopular.length <= i) {
            prevTopPopular.push(top_popular[i]);
        } else if (
            top_popular[i].title !== prevTopPopular[i].title ||
            top_popular[i].imDbRating !== prevTopPopular[i].imDbRating
        ) {
            prevTopPopular[i] = top_popular[i];
        } else {
            continue;
        }
        let titleDataFromDB = await getTitleDataFromDB(top_popular[i].title, top_popular[i].year, type);
        if (titleDataFromDB) {
            //title exist in db , fix imdbID and imdb rating if needed
            let updateFields = {};
            if (!titleDataFromDB.imdbID) {
                updateFields.imdbID = top_popular[i].id;
            }
            if (Number(top_popular[i].imDbRating) !== titleDataFromDB.rating.imdb) {
                titleDataFromDB.rating.imdb = Number(top_popular[i].imDbRating);
                updateFields.rating = titleDataFromDB.rating;
            }
            if (Object.keys(updateFields).length > 0) {
                await updateByIdDB('movies', titleDataFromDB._id, updateFields);
            }
        } else {
            //title doesnt exist in db , add it
            let titleDataFromIMDB = await getTitleDataFromIMDB(top_popular[i].id);
            let status = type.includes('movie') ? 'ended' : 'unknown';
            await addImdbTitleToDB(titleDataFromIMDB, type, status);
        }
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
    for (let i = 0; i < theatres_soon.length; i++) {
        let titleDataFromDB = await getTitleDataFromDB(theatres_soon[i].title, theatres_soon[i].year, type);
        if (titleDataFromDB) {
            //title exist in db , fix imdbID and imdb rating if needed
            let updateFields = {};
            if (!titleDataFromDB.imdbID) {
                updateFields.imdbID = theatres_soon[i].id;
            }
            if (Number(theatres_soon[i].imDbRating) !== titleDataFromDB.rating.imdb) {
                titleDataFromDB.rating.imdb = Number(theatres_soon[i].imDbRating);
                updateFields.rating = titleDataFromDB.rating;
            }
            if (titleDataFromDB.releaseState !== mode) {
                updateFields.releaseState = mode;
            }
            let s3Trailer = await uploadTrailer(theatres_soon[i].title, theatres_soon[i].year, type, theatres_soon[i].id);
            if (s3Trailer) {
                updateFields.trailer_s3 = s3Trailer;
                if (titleDataFromDB.trailers) {
                    updateFields.trailers = [...titleDataFromDB.trailers, s3Trailer];
                } else {
                    updateFields.trailers = [s3Trailer];
                }
            }
            if (Object.keys(updateFields).length > 0) {
                await updateByIdDB('movies', titleDataFromDB._id, updateFields);
            }
        } else {
            //title doesnt exist in db , add it
            let titleDataFromIMDB = theatres_soon[i];
            await addImdbTitleToDB(titleDataFromIMDB, type, 'unknown', mode);
        }
    }
}

async function getBoxOfficeData() {
    let url = 'https://imdb-api.com/en/API/BoxOffice/$apikey$';
    let boxOfficeData = await handleApiCall(url);
    return boxOfficeData ? boxOfficeData.items.map(item => {
        delete item.image;
        return item;
    }) : [];
}

async function addImdbTitleToDB(imdbData, type, status, releaseState = 'waiting') {
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

    let imdbDataPoster = imdbData.image.replace(/\.*_v1.*al_/gi, '');
    let s3poster = await checkTitlePosterExist(titleModel.title, type, titleModel.year);
    if (!s3poster) {
        s3poster = await uploadTitlePosterToS3(titleModel.title, type, imdbData.year, [imdbDataPoster]);
    }
    if (s3poster) {
        titleModel.posters = [s3poster];
        titleModel.poster_s3 = s3poster;
    }

    let s3Trailer = await uploadTrailer(titleModel.title, titleModel.year, type, titleModel.imdbID);
    if (s3Trailer) {
        titleModel.trailer_s3 = s3Trailer;
        titleModel.trailers = [s3Trailer];
    }

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
        let s3Trailer = await checkTitleTrailerExist(title, type, year);
        if (!s3Trailer) {
            s3Trailer = await uploadTitleTrailerToS3(title, type, year, [youtubeTrailer]);
        }
        return s3Trailer;
    } else {
        return '';
    }
}

async function handleApiCall(url, retryCount = 0) {
    if (!url) {
        return null;
    }
    let waitCounter = 0;
    while (waitCounter < 10) {
        try {
            let temp = url.replace('$apikey$', imdbApiKeys[apiKeyCounter]);
            let response = await axios.get(temp);
            let data = response.data;
            if (data.errorMessage && data.errorMessage.includes('Maximum usage')) {
                if (retryCount < 3 && imdbApiKeys.length > 1) {
                    retryCount++;
                    apiKeyCounter++;
                    apiKeyCounter = apiKeyCounter % imdbApiKeys.length;
                    return await handleApiCall(url, retryCount);
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
