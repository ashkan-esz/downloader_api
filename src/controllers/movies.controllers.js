import {moviesServices} from '../services';

export async function getNews(req, res) {
    let types = req.params.types.split('-').map(item => item.toLowerCase().trim());
    let dataLevel = req.params.dataLevel.toLowerCase().trim();
    let imdbScores = req.params.imdbScores.split('-').map(item => Number(item));
    let malScores = req.params.malScores.split('-').map(item => Number(item));
    let page = Number(req.params.page);

    let news = await moviesServices.getNews(types, dataLevel, imdbScores, malScores, page, req.url);

    return res.json(news);
}

export async function getUpdates(req, res) {
    let types = req.params.types.split('-').map(item => item.toLowerCase().trim());
    let dataLevel = req.params.dataLevel.toLowerCase().trim();
    let imdbScores = req.params.imdbScores.split('-').map(item => Number(item));
    let malScores = req.params.malScores.split('-').map(item => Number(item));
    let page = Number(req.params.page);

    let updates = await moviesServices.getUpdates(types, dataLevel, imdbScores, malScores, page, req.url);

    return res.json(updates);
}

export async function getTopsByLikes(req, res) {
    let types = req.params.types.split('-').map(item => item.toLowerCase().trim());
    let dataLevel = req.params.dataLevel.toLowerCase().trim();
    let imdbScores = req.params.imdbScores.split('-').map(item => Number(item));
    let malScores = req.params.malScores.split('-').map(item => Number(item));
    let page = Number(req.params.page);

    let topsByLikes = await moviesServices.getTopsByLikes(types, dataLevel, imdbScores, malScores, page, req.url);

    return res.json(topsByLikes);
}

export async function getTrailers(req, res) {
    let types = req.params.types.split('-').map(item => item.toLowerCase().trim());
    let dataLevel = req.params.dataLevel.toLowerCase().trim();
    let imdbScores = req.params.imdbScores.split('-').map(item => Number(item));
    let malScores = req.params.malScores.split('-').map(item => Number(item));
    let page = Number(req.params.page);

    let trailers = await moviesServices.getTrailers(types, dataLevel, imdbScores, malScores, page, req.url);
    if (trailers.length > 0) {
        return res.json(trailers);
    }
    return res.sendStatus(404);
}

export async function getSortedMovies(req, res) {
    let sortBase = req.params.sortBase.toLowerCase().trim();
    let types = req.params.types.split('-').map(item => item.toLowerCase().trim());
    let dataLevel = req.params.dataLevel.toLowerCase().trim();
    let imdbScores = req.params.imdbScores.split('-').map(item => Number(item));
    let malScores = req.params.malScores.split('-').map(item => Number(item));
    let page = Number(req.params.page);

    let trailers = await moviesServices.getSortedMovies(sortBase, types, dataLevel, imdbScores, malScores, page, req.url);
    if (trailers.length > 0) {
        return res.json(trailers);
    }
    return res.sendStatus(404);
}

export async function getSeriesOfDay(req, res) {
    let dayNumber = Number(req.params.dayNumber);
    let types = req.params.types.split('-').map(item => item.toLowerCase().trim());
    let imdbScores = req.params.imdbScores.split('-').map(item => Number(item));
    let malScores = req.params.malScores.split('-').map(item => Number(item));
    let page = Number(req.params.page);

    let seriesOfDay = await moviesServices.getSeriesOfDay(dayNumber, types, imdbScores, malScores, page, req.url);
    return res.json(seriesOfDay);
}

export async function searchByTitle(req, res) {
    let title = req.params.title;
    let types = req.params.types.split('-').map(item => item.toLowerCase().trim());
    let dataLevel = req.params.dataLevel.toLowerCase().trim();
    let years = req.params.years.split('-');
    let imdbScores = req.params.imdbScores.split('-').map(item => Number(item));
    let malScores = req.params.malScores.split('-').map(item => Number(item));
    let page = Number(req.params.page);

    let titles = await moviesServices.searchByTitle(title, types, dataLevel, years, imdbScores, malScores, page, req.url);
    if (titles.length > 0) {
        return res.json(titles);
    }
    return res.sendStatus(404);
}

export async function searchMovieById(req, res) {
    let id = req.params.id;
    let dataLevel = req.params.dataLevel.toLowerCase().trim();
    let titleData = await moviesServices.searchMovieById(id, dataLevel, req.url);
    if (titleData) {
        return res.json(titleData);
    }
    return res.sendStatus(404);
}

export async function searchStaffById(req, res) {
    let id = req.params.id;

    let titleData = await moviesServices.searchStaffById(id, req.url);
    if (titleData) {
        return res.json(titleData);
    }
    return res.sendStatus(404);
}

export async function searchCharacterById(req, res) {
    let id = req.params.id;

    let titleData = await moviesServices.searchCharacterById(id, req.url);
    if (titleData) {
        return res.json(titleData);
    }
    return res.sendStatus(404);
}
