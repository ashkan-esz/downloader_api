import {moviesServices} from '../services';

export async function getNews(req, res) {
    let userId = req.jwtUserData.userId;
    let types = req.params.types.split('-').map(item => item.toLowerCase().trim());
    let dataLevel = req.params.dataLevel.toLowerCase().trim();
    let imdbScores = req.params.imdbScores.split('-').map(item => Number(item));
    let malScores = req.params.malScores.split('-').map(item => Number(item));
    let page = Number(req.params.page) || 1;

    let news = await moviesServices.getNews(userId, types, dataLevel, imdbScores, malScores, page);

    return res.json(news);
}

export async function getUpdates(req, res) {
    let userId = req.jwtUserData.userId;
    let types = req.params.types.split('-').map(item => item.toLowerCase().trim());
    let dataLevel = req.params.dataLevel.toLowerCase().trim();
    let imdbScores = req.params.imdbScores.split('-').map(item => Number(item));
    let malScores = req.params.malScores.split('-').map(item => Number(item));
    let page = Number(req.params.page) || 1;

    let updates = await moviesServices.getUpdates(userId, types, dataLevel, imdbScores, malScores, page);

    return res.json(updates);
}

export async function getTopsByLikes(req, res) {
    let userId = req.jwtUserData.userId;
    let types = req.params.types.split('-').map(item => item.toLowerCase().trim());
    let dataLevel = req.params.dataLevel.toLowerCase().trim();
    let imdbScores = req.params.imdbScores.split('-').map(item => Number(item));
    let malScores = req.params.malScores.split('-').map(item => Number(item));
    let page = Number(req.params.page) || 1;

    let topsByLikes = await moviesServices.getTopsByLikes(userId, types, dataLevel, imdbScores, malScores, page);

    return res.json(topsByLikes);
}

export async function getTrailers(req, res) {
    let userId = req.jwtUserData.userId;
    let types = req.params.types.split('-').map(item => item.toLowerCase().trim());
    let dataLevel = req.params.dataLevel.toLowerCase().trim();
    let imdbScores = req.params.imdbScores.split('-').map(item => Number(item));
    let malScores = req.params.malScores.split('-').map(item => Number(item));
    let page = Number(req.params.page) || 1;

    let trailers = await moviesServices.getTrailers(userId, types, dataLevel, imdbScores, malScores, page);
    if (trailers.length > 0) {
        return res.json(trailers);
    }
    return res.sendStatus(404);
}

export async function getSortedMovies(req, res) {
    let userId = req.jwtUserData.userId;
    let sortBase = req.params.sortBase.toLowerCase().trim();
    let types = req.params.types.split('-').map(item => item.toLowerCase().trim());
    let dataLevel = req.params.dataLevel.toLowerCase().trim();
    let imdbScores = req.params.imdbScores.split('-').map(item => Number(item));
    let malScores = req.params.malScores.split('-').map(item => Number(item));
    let page = Number(req.params.page) || 1;

    let trailers = await moviesServices.getSortedMovies(userId, sortBase, types, dataLevel, imdbScores, malScores, page);
    if (trailers.length > 0) {
        return res.json(trailers);
    }
    return res.sendStatus(404);
}

export async function getSeriesOfDay(req, res) {
    let userId = req.jwtUserData.userId;
    let dayNumber = Number(req.params.dayNumber);
    let types = req.params.types.split('-').map(item => item.toLowerCase().trim());
    let imdbScores = req.params.imdbScores.split('-').map(item => Number(item));
    let malScores = req.params.malScores.split('-').map(item => Number(item));
    let page = Number(req.params.page) || 1;

    let seriesOfDay = await moviesServices.getSeriesOfDay(userId, dayNumber, types, imdbScores, malScores, page);
    return res.json(seriesOfDay);
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

    return res.json(multipleStatus);
}

export async function searchByTitle(req, res) {
    let userId = req.jwtUserData.userId;
    let title = req.params.title;
    let genres = req.params.genres ?
        req.params.genres.split('-').map(item => item.toLowerCase().trim())
        : [];
    let types = req.params.types.split('-').map(item => item.toLowerCase().trim());
    let dataLevel = req.params.dataLevel.toLowerCase().trim();
    let years = req.params.years.split('-');
    let imdbScores = req.params.imdbScores.split('-').map(item => Number(item));
    let malScores = req.params.malScores.split('-').map(item => Number(item));
    let page = Number(req.params.page) || 1;

    let titles = await moviesServices.searchByTitle(userId, title, types, dataLevel, years, genres, imdbScores, malScores, page);
    if (titles.movies.length > 0 || titles.staff.length > 0 || titles.characters.length > 0) {
        return res.json(titles);
    }
    return res.sendStatus(404);
}

export async function searchMovieById(req, res) {
    let userId = req.jwtUserData.userId;
    let id = req.params.id;
    let dataLevel = req.params.dataLevel.toLowerCase().trim();
    let titleData = await moviesServices.searchMovieById(userId, id, dataLevel);
    if (titleData) {
        return res.json(titleData);
    }
    return res.sendStatus(404);
}

export async function searchStaffById(req, res) {
    let userId = req.jwtUserData.userId;
    let id = req.params.id;

    let titleData = await moviesServices.searchStaffById(userId, id);
    if (titleData) {
        return res.json(titleData);
    }
    return res.sendStatus(404);
}

export async function searchCharacterById(req, res) {
    let userId = req.jwtUserData.userId;
    let id = req.params.id;

    let titleData = await moviesServices.searchCharacterById(userId, id);
    if (titleData) {
        return res.json(titleData);
    }
    return res.sendStatus(404);
}

export async function likeMovie(req, res) {
    let userId = req.jwtUserData.userId;
    let type = req.params.type; //like|dislike
    let movieId = req.params.id;
    let isRemove = req.query.remove === 'true';
    let likeResult = await moviesServices.likeOrDislikeService(userId, 'movies', movieId, type, isRemove);

    res.statusCode = likeResult.data.code;
    return res.json(likeResult.data);
}

export async function likeStaff(req, res) {
    let userId = req.jwtUserData.userId;
    let type = req.params.type; //like|dislike
    let movieId = req.params.id;
    let isRemove = req.query.remove === 'true';
    let likeResult = await moviesServices.likeOrDislikeService(userId, 'staff', movieId, type, isRemove);

    res.statusCode = likeResult.data.code;
    return res.json(likeResult.data);
}

export async function likeCharacter(req, res) {
    let userId = req.jwtUserData.userId;
    let type = req.params.type; //like|dislike
    let movieId = req.params.id;
    let isRemove = req.query.remove === 'true';
    let likeResult = await moviesServices.likeOrDislikeService(userId, 'characters', movieId, type, isRemove);

    res.statusCode = likeResult.data.code;
    return res.json(likeResult.data);
}

export async function getGenresStatus(req, res) {
    let result = await moviesServices.getGenresStatus();

    res.statusCode = result.data.code;
    return res.json(result.data);
}

export async function getGenresMovies(req, res) {
    let userId = req.jwtUserData.userId;
    let dataLevel = req.params.dataLevel.toLowerCase().trim();
    let genres = req.params.genres.split('-').map(item => item.toLowerCase().trim());
    let types = req.params.types.split('-').map(item => item.toLowerCase().trim());
    let imdbScores = req.params.imdbScores.split('-').map(item => Number(item));
    let malScores = req.params.malScores.split('-').map(item => Number(item));
    let page = Number(req.params.page) || 1;
    let result = await moviesServices.getGenresMovies(userId, genres, types, imdbScores, malScores, dataLevel, page);

    res.statusCode = result.data.code;
    return res.json(result.data);
}
