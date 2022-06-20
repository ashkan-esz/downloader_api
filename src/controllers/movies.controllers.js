import {moviesServices} from '../services/index.js';

export async function getNews(req, res) {
    let userId = req.jwtUserData.userId;
    let types = req.params.types.split('-').map(item => item.toLowerCase().trim());
    let dataLevel = req.params.dataLevel.toLowerCase().trim();
    let imdbScores = req.params.imdbScores.split('-').map(item => Number(item));
    let malScores = req.params.malScores.split('-').map(item => Number(item));
    let page = Number(req.params.page) || 1;
    let news = await moviesServices.getNews(userId, types, dataLevel, imdbScores, malScores, page);

    return res.status(news.responseData.code).json(news.responseData);
}

export async function getUpdates(req, res) {
    let userId = req.jwtUserData.userId;
    let types = req.params.types.split('-').map(item => item.toLowerCase().trim());
    let dataLevel = req.params.dataLevel.toLowerCase().trim();
    let imdbScores = req.params.imdbScores.split('-').map(item => Number(item));
    let malScores = req.params.malScores.split('-').map(item => Number(item));
    let page = Number(req.params.page) || 1;
    let updates = await moviesServices.getUpdates(userId, types, dataLevel, imdbScores, malScores, page);

    return res.status(updates.responseData.code).json(updates.responseData);
}

export async function getTopsByLikes(req, res) {
    let userId = req.jwtUserData.userId;
    let types = req.params.types.split('-').map(item => item.toLowerCase().trim());
    let dataLevel = req.params.dataLevel.toLowerCase().trim();
    let imdbScores = req.params.imdbScores.split('-').map(item => Number(item));
    let malScores = req.params.malScores.split('-').map(item => Number(item));
    let page = Number(req.params.page) || 1;
    let topsByLikes = await moviesServices.getTopsByLikes(userId, types, dataLevel, imdbScores, malScores, page);

    return res.status(topsByLikes.responseData.code).json(topsByLikes.responseData);
}

export async function getTrailers(req, res) {
    let userId = req.jwtUserData.userId;
    let types = req.params.types.split('-').map(item => item.toLowerCase().trim());
    let dataLevel = req.params.dataLevel.toLowerCase().trim();
    let imdbScores = req.params.imdbScores.split('-').map(item => Number(item));
    let malScores = req.params.malScores.split('-').map(item => Number(item));
    let page = Number(req.params.page) || 1;
    let trailers = await moviesServices.getTrailers(userId, types, dataLevel, imdbScores, malScores, page);

    return res.status(trailers.responseData.code).json(trailers.responseData);
}

export async function getSortedMovies(req, res) {
    let userId = req.jwtUserData.userId;
    let sortBase = req.params.sortBase.toLowerCase().trim();
    let types = req.params.types.split('-').map(item => item.toLowerCase().trim());
    let dataLevel = req.params.dataLevel.toLowerCase().trim();
    let imdbScores = req.params.imdbScores.split('-').map(item => Number(item));
    let malScores = req.params.malScores.split('-').map(item => Number(item));
    let page = Number(req.params.page) || 1;
    let sortedMovies = await moviesServices.getSortedMovies(userId, sortBase, types, dataLevel, imdbScores, malScores, page);

    return res.status(sortedMovies.responseData.code).json(sortedMovies.responseData);
}

export async function getSeriesOfDay(req, res) {
    let userId = req.jwtUserData.userId;
    let dayNumber = Number(req.params.dayNumber);
    let types = req.params.types.split('-').map(item => item.toLowerCase().trim());
    let imdbScores = req.params.imdbScores.split('-').map(item => Number(item));
    let malScores = req.params.malScores.split('-').map(item => Number(item));
    let page = Number(req.params.page) || 1;
    let seriesOfDay = await moviesServices.getSeriesOfDay(userId, dayNumber, types, imdbScores, malScores, page);

    return res.status(seriesOfDay.responseData.code).json(seriesOfDay.responseData);
}

export async function getMultipleStatus(req, res) {
    let userId = req.jwtUserData.userId;
    let types = req.params.types.split('-').map(item => item.toLowerCase().trim());
    let dataLevel = req.params.dataLevel.toLowerCase().trim();
    let imdbScores = req.params.imdbScores.split('-').map(item => Number(item));
    let malScores = req.params.malScores.split('-').map(item => Number(item));
    let page = Number(req.params.page) || 1;
    let count = Number(req.params.count) || 1;
    let multipleStatus = await moviesServices.getMultipleStatus(userId, types, dataLevel, imdbScores, malScores, page, count);

    return res.status(multipleStatus.responseData.code).json(multipleStatus.responseData);
}

export async function searchByTitle(req, res) {
    let userId = req.jwtUserData.userId;
    let title = req.params.title;
    let types = req.params.types.split('-').map(item => item.toLowerCase().trim());
    let dataLevel = req.params.dataLevel.toLowerCase().trim();
    let years = req.params.years.split('-');
    let imdbScores = req.params.imdbScores.split('-').map(item => Number(item));
    let malScores = req.params.malScores.split('-').map(item => Number(item));
    let page = Number(req.params.page) || 1;
    let genres = req.query.genres ?
        req.query.genres.split('-').map(item => item.toLowerCase().trim())
        : [];
    let result = await moviesServices.searchByTitle(userId, title, types, dataLevel, years, genres, imdbScores, malScores, page);

    return res.status(result.responseData.code).json(result.responseData);
}

export async function searchMovieById(req, res) {
    let userId = req.jwtUserData.userId;
    let id = req.params.id;
    let dataLevel = req.params.dataLevel.toLowerCase().trim();
    let titleData = await moviesServices.searchMovieById(userId, id, dataLevel);

    return res.status(titleData.responseData.code).json(titleData.responseData);
}

export async function searchStaffById(req, res) {
    let userId = req.jwtUserData.userId;
    let id = req.params.id;
    let titleData = await moviesServices.searchStaffById(userId, id);

    return res.status(titleData.responseData.code).json(titleData.responseData);
}

export async function searchCharacterById(req, res) {
    let userId = req.jwtUserData.userId;
    let id = req.params.id;
    let titleData = await moviesServices.searchCharacterById(userId, id);

    return res.status(titleData.responseData.code).json(titleData.responseData);
}

export async function userStatsService(req, res) {
    let userId = req.jwtUserData.userId;
    let statType = req.params.statType.toLowerCase();
    let movieId = req.params.id;
    let isRemove = req.query.remove === 'true';
    let userStatsResult = await moviesServices.userStatsService(userId, statType, movieId, isRemove);

    return res.status(userStatsResult.responseData.code).json(userStatsResult.responseData);
}

export async function getUserStatsList(req, res) {
    let userId = req.jwtUserData.userId;
    let statType = req.params.statType.toLowerCase();
    let dataLevel = req.params.dataLevel.toLowerCase().trim();
    let page = Number(req.params.page) || 1;
    let userStatsListResult = await moviesServices.getUserStatsList(userId, statType, dataLevel, page);

    return res.status(userStatsListResult.responseData.code).json(userStatsListResult.responseData);
}

export async function getGenresStatus(req, res) {
    let result = await moviesServices.getGenresStatus(req.url);

    return res.status(result.responseData.code).json(result.responseData);
}

export async function getMovieSources(req, res) {
    let result = await moviesServices.getMovieSources(req.url);

    return res.status(result.responseData.code).json(result.responseData);
}

export async function getGenresMovies(req, res) {
    let userId = req.jwtUserData.userId;
    let dataLevel = req.params.dataLevel.toLowerCase().trim();
    let genres = req.params.genres.split('-').map(item => item.replace('_', '-').toLowerCase().trim());
    let types = req.params.types.split('-').map(item => item.toLowerCase().trim());
    let imdbScores = req.params.imdbScores.split('-').map(item => Number(item));
    let malScores = req.params.malScores.split('-').map(item => Number(item));
    let page = Number(req.params.page) || 1;
    let result = await moviesServices.getGenresMovies(userId, genres, types, imdbScores, malScores, dataLevel, page);

    return res.status(result.responseData.code).json(result.responseData);
}
