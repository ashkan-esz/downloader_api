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

export async function getTimelineDay(req, res) {
    let types = JSON.parse(req.params.types);
    let page = Number(req.params.page);
    let spacing = Number(req.params.spacing);

    let timelineDay = await moviesServices.getTimelineDay(spacing, types, page);
    if (timelineDay.length > 0) {
        return res.json(timelineDay);
    }
    return res.sendStatus(404);
}

export async function getTimelineWeek(req, res) {
    let types = JSON.parse(req.params.types);
    let weekCounter = Number(req.params.weekCounter);

    let timelineWeek = await moviesServices.getTimelineWeek(weekCounter, types);
    if (timelineWeek.length > 0) {
        let groupSearchResult = timelineWeek.reduce((r, a) => {
            r[a.releaseDay] = [...r[a.releaseDay] || [], a];
            return r;
        }, {});
        return res.json(groupSearchResult);
    }
    return res.sendStatus(404);
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
