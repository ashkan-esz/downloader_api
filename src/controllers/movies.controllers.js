import {moviesServices} from '../services';

export async function getNews(req, res) {
    let types = JSON.parse(req.params.types);
    let dataLevel = req.params.dataLevel;
    let page = Number(req.params.page);

    let news = await moviesServices.getNews(types, dataLevel, page);

    return res.json(news);
}

export async function getUpdates(req, res) {
    let types = JSON.parse(req.params.types);
    let dataLevel = req.params.dataLevel;
    let page = Number(req.params.page);

    let updates = await moviesServices.getUpdates(types, dataLevel, page);

    return res.json(updates);
}

export async function getTopsByLikes(req, res) {
    let types = JSON.parse(req.params.types);
    let dataLevel = req.params.dataLevel;
    let page = Number(req.params.page);

    let topsbyLikes = await moviesServices.getTopsByLikes(types, dataLevel, page);

    return res.json(topsbyLikes);
}

export async function getTrailers(req, res) {
    let types = JSON.parse(req.params.types);
    let dataLevel = req.params.dataLevel;
    let page = Number(req.params.page);

    let trailers = await moviesServices.getTrailers(types, dataLevel, page);
    if (trailers.length > 0) {
        return res.json(trailers);
    }
    return res.sendStatus(404);
}

export async function getSeriesOfDay(req, res) {
    let types = JSON.parse(req.params.types);
    let page = Number(req.params.page);
    let dayNumber = Number(req.params.dayNumber);

    let seriesOfDay = await moviesServices.getSeriesOfDay(dayNumber, types, page);
    return res.json(seriesOfDay);
}

export async function searchByTitle(req, res) {
    let types = JSON.parse(req.params.types);
    let title = req.params.title;
    let dataLevel = req.params.dataLevel;
    let page = Number(req.params.page);

    let titles = await moviesServices.searchByTitle(title, types, dataLevel, page);
    if (titles.length > 0) {
        return res.json(titles);
    }
    return res.sendStatus(404);
}

export async function searchById(req, res) {
    let {id, dataLevel} = req.params;

    let titleData = await moviesServices.searchById(id, dataLevel);
    if (titleData) {
        return res.json(titleData);
    }
    return res.sendStatus(404);
}
