import config from "../../config";
import axios from "axios";
import * as dbMethods from "../../data/dbMethods";
import * as utils from "../utils";
import * as cloudStorage from "../../data/cloudStorage";
import {getMovieModel} from "../../models/movie";
import {default as pQueue} from "p-queue";
import * as Sentry from "@sentry/node";
import {saveError} from "../../error/saveError";

let imdbApiKey = {apikey: '', reachedMax: true};

export async function updateImdbData() {
    imdbApiKey = {apikey: config.imdbApiKey.trim(), reachedMax: false};

    // check reached daily limit
    let testApiLimit = await handleApiCall('https://imdb-api.com/en/API/Top250Movies/$apikey$');
    if (testApiLimit === null) {
        return;
    }

    //todo : fix delay between reset and set

    //top
    if (!imdbApiKey.reachedMax) {
        await dbMethods.updateMovieCollectionDB({'rank.top': -1});
        await add_Top_popular('movie', 'top');
        await add_Top_popular('serial', 'top');
    }

    //popular
    if (!imdbApiKey.reachedMax) {
        await dbMethods.updateMovieCollectionDB({'rank.popular': -1});
        await add_Top_popular('movie', 'popular');
        await add_Top_popular('serial', 'popular');
    }

    //inTheaters
    if (!imdbApiKey.reachedMax) {
        await dbMethods.updateMovieCollectionDB({'rank.inTheaters': -1});
        await add_inTheaters_comingSoon('movie', 'inTheaters');
    }

    //comingSoon
    if (!imdbApiKey.reachedMax) {
        await dbMethods.updateMovieCollectionDB({'rank.comingSoon': -1});
        await add_inTheaters_comingSoon('movie', 'comingSoon');
    }

    //box office
    if (!imdbApiKey.reachedMax) {
        await dbMethods.updateMovieCollectionDB({'rank.boxOffice': -1});
        await addBoxOfficeData();
    }
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
    const updatePromiseQueue = new pQueue.default({concurrency: 20});
    const insertPromiseQueue = new pQueue.default({concurrency: 5});

    for (let i = 0; i < top_popular.length; i++) {
        let titleDataFromDB = await getTitleDataFromDB(top_popular[i].title, top_popular[i].year, type);
        if (titleDataFromDB) {
            updatePromiseQueue.add(() => update_top_popular_title(titleDataFromDB, top_popular[i], type, mode, Number(top_popular[i].rank)));
        } else {
            //title doesnt exist in db , add it
            let titleDataFromIMDB = await getTitleDataFromIMDB(top_popular[i].id);
            if (titleDataFromIMDB) {
                let status = type.includes('movie') ? 'ended' : 'unknown';
                insertPromiseQueue.add(() => addImdbTitleToDB(titleDataFromIMDB, type, status, 'waiting', mode, Number(top_popular[i].rank), top_popular[i]));
            }
        }
    }

    await updatePromiseQueue.onIdle();
    await insertPromiseQueue.onIdle();
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

    if (titleDataFromDB.posters.length === 0) {
        let imdbPoster = semiImdbData.image.replace(/\.*_v1.*al_/gi, '');
        if (imdbPoster) {
            let s3poster = await cloudStorage.uploadTitlePosterToS3(titleDataFromDB.title, titleDataFromDB.type, titleDataFromDB.year, imdbPoster);
            if (s3poster) {
                updateFields.poster_s3 = s3poster;
                updateFields.posters = [{
                    url: s3poster.url,
                    info: 's3Poster',
                    size: s3poster.size,
                }];
            }
        }
    }

    await dbMethods.updateByIdDB('movies', titleDataFromDB._id, updateFields);
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
    const updatePromiseQueue = new pQueue.default({concurrency: 20});
    const insertPromiseQueue = new pQueue.default({concurrency: 5});

    for (let i = 0; i < theatres_soon.length; i++) {
        let titleDataFromDB = await getTitleDataFromDB(theatres_soon[i].title, theatres_soon[i].year, type);
        if (titleDataFromDB) {
            updatePromiseQueue.add(() => update_inTheaters_comingSoon_title(titleDataFromDB, theatres_soon[i], type, mode, (i + 1)));
        } else {
            //title doesnt exist in db , add it
            let titleDataFromIMDB = theatres_soon[i];
            insertPromiseQueue.add(() => addImdbTitleToDB(titleDataFromIMDB, type, 'unknown', mode, mode, (i + 1), theatres_soon[i]));
        }
    }

    await updatePromiseQueue.onIdle();
    await insertPromiseQueue.onIdle();
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
    if (titleDataFromDB.releaseState !== "done" && titleDataFromDB.releaseState !== mode) {
        updateFields.releaseState = mode;
    }

    if (semiImdbData.releaseState) {
        let monthAndDay = semiImdbData.releaseState.split('-').pop().trim().split(' ');
        let monthNumber = utils.getMonthNumberByMonthName(monthAndDay[0].trim());
        let temp = titleDataFromDB.year + '-' + monthNumber + '-' + monthAndDay[1].trim();
        if (titleDataFromDB.premiered !== temp) {
            updateFields.premiered = temp;
        }
    }

    if (titleDataFromDB.posters.length === 0) {
        let imdbPoster = semiImdbData.image.replace(/\.*_v1.*al_/gi, '');
        if (imdbPoster) {
            let s3poster = await cloudStorage.uploadTitlePosterToS3(titleDataFromDB.title, titleDataFromDB.type, titleDataFromDB.year, imdbPoster);
            if (s3poster) {
                updateFields.poster_s3 = s3poster;
                updateFields.posters = [{
                    url: s3poster.url,
                    info: 's3Poster',
                    size: s3poster.size,
                }];
            }
        }
    }

    if (!titleDataFromDB.trailers) {
        let s3Trailer = await uploadTrailer(semiImdbData.title, semiImdbData.year, type, semiImdbData.id);
        if (s3Trailer) {
            updateFields.trailer_s3 = s3Trailer;
            updateFields.trailers = [{
                url: s3Trailer.url,
                info: 's3Trailer-720p'
            }];
        }
    }

    await dbMethods.updateByIdDB('movies', titleDataFromDB._id, updateFields);
}

async function addImdbTitleToDB(imdbData, type, status, releaseState, mode, rank, semiImdbData) {
    let titleObj = {
        title: utils.replaceSpecialCharacters(semiImdbData.title.toLowerCase()),
        rawTitle: imdbData.title,
        alternateTitles: [imdbData.title, imdbData.originalTitle].filter(value => value && value !== semiImdbData.title),
        titleSynonyms: [],
    }
    let titleModel = getMovieModel(
        titleObj, '', type, [],
        '', imdbData.year, '', '',
        [], [], []
    );
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
    }
    if (imdbData.releaseState) {
        let monthAndDay = imdbData.releaseState.split('-').pop().trim().split(' ');
        let monthNumber = utils.getMonthNumberByMonthName(monthAndDay[0].trim());
        titleModel.premiered = titleModel.year + '-' + monthNumber + '-' + monthAndDay[1].trim();
    }
    titleModel.duration = imdbData.runtimeMins ? imdbData.runtimeMins + ' min' : '0 min';
    titleModel.summary.english = imdbData.plot.replace(/([.…])+$/, '');
    titleModel.awards = imdbData.awards || '';
    titleModel.genres = imdbData.genres ? imdbData.genres.toLowerCase().split(',').map(item => item.trim()).filter(item => item !== 'n/a') : [];
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

    await dbMethods.insertToDB('movies', titleModel);
}

async function addBoxOfficeData() {
    let url = 'https://imdb-api.com/en/API/BoxOffice/$apikey$';
    let boxOfficeData = await handleApiCall(url);
    if (!boxOfficeData) {
        return;
    }
    let promiseArray = [];
    for (let i = 0; i < boxOfficeData.items.length; i++) {
        let updateFields = {
            'rank.boxOffice': Number(boxOfficeData.items[i].rank),
            boxOfficeData: {
                weekend: boxOfficeData.items[i].weekend || '',
                gross: boxOfficeData.items[i].gross || '',
                weeks: Number(boxOfficeData.items[i].weeks),
            }
        };
        let updatePromise = dbMethods.findOneAndUpdateMovieCollection(
            {imdbID: boxOfficeData.items[i].id},
            updateFields
        );
        promiseArray.push(updatePromise);
    }
    await Promise.allSettled(promiseArray);
}

async function uploadPosterAndTrailer(titleModel, imdbData, releaseState) {
    let imdbPoster = imdbData.image.replace(/\.*_v1.*al_/gi, '');
    if (imdbPoster) {
        let s3poster = await cloudStorage.uploadTitlePosterToS3(titleModel.title, titleModel.type, imdbData.year, imdbPoster);
        if (s3poster) {
            titleModel.poster_s3 = s3poster;
            titleModel.posters = [{
                url: s3poster.url,
                info: 's3Poster',
                size: s3poster.size,
            }];
        }
    }

    if (releaseState !== 'waiting') {
        let s3Trailer = await uploadTrailer(titleModel.title, titleModel.year, titleModel.type, imdbData.id);
        if (s3Trailer) {
            titleModel.trailer_s3 = s3Trailer;
            titleModel.trailers = [{
                url: s3Trailer.url,
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
    title = utils.replaceSpecialCharacters(title.toLowerCase());
    let titleObj = {
        title: title,
        alternateTitles: [],
        titleSynonyms: [],
    }
    let dataConfig = {
        title: 1,
        type: 1,
        premiered: 1,
        year: 1,
        rank: 1,
        imdbID: 1,
        rating: 1,
        releaseState: 1,
        trailers: 1,
        posters: 1,
    }

    let temp = await dbMethods.searchTitleDB(titleObj, [type], year, dataConfig);
    if (temp.length === 0) {
        let minusYear = (Number(year) - 1).toString();
        temp = await dbMethods.searchTitleDB(titleObj, [type], minusYear, dataConfig);
    }

    return temp.length > 0 ? temp[0] : null;
}

async function uploadTrailer(title, year, type, imdbID) {
    title = utils.replaceSpecialCharacters(title.toLowerCase());
    let trailerDataUrl = `https://imdb-api.com/en/API/YouTubeTrailer/$apikey$/${imdbID}`;
    let trailerData = await handleApiCall(trailerDataUrl);
    if (trailerData) {
        let youtubeTrailer = trailerData.videoUrl;
        if (youtubeTrailer) {
            return await cloudStorage.uploadTitleTrailerFromYoutubeToS3(title, type, year, youtubeTrailer);
        }
    }
    return '';
}

async function handleApiCall(url) {
    if (!url || imdbApiKey.reachedMax) {
        return null;
    }
    let waitCounter = 0;
    while (waitCounter < 10) {
        try {
            let temp = url.replace('$apikey$', imdbApiKey.apikey);
            let response = await axios.get(temp);
            let data = response.data;
            if (data.errorMessage &&
                (
                    data.errorMessage.includes('Maximum usage') ||
                    data.errorMessage.includes('Invalid API Key')
                )) {
                imdbApiKey.reachedMax = true;
                Sentry.captureMessage(`reached imdb api maximum daily usage`);
                return null;
            }
            if (data.errorMessage) {
                return null;
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
