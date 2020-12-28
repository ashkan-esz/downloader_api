const {sort_Serial_links, checkSources, getYear} = require('./utils');
const {get_OMDB_Api_Data, get_OMDB_Api_Fields, get_OMDB_Api_nullFields} = require('./omdb_api');
import getCollection from '../mongoDB';
import {saveError} from "../saveError";

module.exports = async function save(title_array, page_link, site_links, persian_summary, poster, trailers, mode) {
    try {
        let year = (mode === 'movie') ? getYear(page_link, site_links) : '';
        let title = title_array.join(' ').trim();
        let result = {
            title: title,
            sources: [{
                url: page_link,
                links: mode === 'movie' ? site_links : sort_Serial_links(site_links)
            }],
            year: year,
            like: 0,
            dislike: 0,
            insert_date: new Date(),
            update_date: 0,
            poster: [poster],
            summary: {persian: persian_summary},
            trailers: trailers,
            type: mode
        };

        let {collection, db_data} = await searchOnCollection(title, year, mode);

        if (db_data === null) {//new title
            let newResult = await getInfoFromAPI(result, mode);
            await collection.insertOne(newResult);
            return;
        }

        let posterChange = handlePosterUpdate(db_data, poster);
        let trailerChange = handleTrailerUpdate(db_data, trailers);

        for (let j = 0; j < db_data.sources.length; j++) {//check source exist
            if (checkSources(db_data.sources[j].url, page_link)) { // this source exist
                let update = false;
                if (mode === 'movie') { //movie
                    update = check_movieLinks_changed(site_links, db_data.sources[j].links);
                    if (update) {
                        db_data.sources[j].links = site_links;
                    }
                } else { //serial
                    update = check_serialLinks_changed(site_links, db_data.sources[j].links);
                    if (update) {
                        db_data.sources[j].links = sort_Serial_links(site_links);
                    }
                }
                if (update || posterChange || trailerChange) {
                    await handle_update(collection, db_data, update, persian_summary, posterChange, trailerChange, mode, null);
                }
                return;
            }
        }

        await handle_update(collection, db_data, false, persian_summary, posterChange, trailerChange, mode, result);

    } catch (error) {
        saveError(error);
    }
}

async function searchOnCollection(title, year, mode) {
    let collection_name = (mode === 'serial') ? 'serials' : 'movies';
    let collection = await getCollection(collection_name);
    let db_data;
    let lowDataConfig = {
        title: 1,
        year: 1,
        sources: 1,
        summary: 1,
        poster: 1,
        trailers: 1,
    }
    if (mode === 'serial') {
        db_data = await collection.findOne({title: title}, {projection: lowDataConfig});
    } else {
        let YEAR = Number(year);
        let cases = [year, (YEAR + 1).toString(), (YEAR - 1).toString()];
        db_data = await collection.findOne({title: title, year: cases[0]}, {projection: lowDataConfig});
        if (db_data === null) {
            db_data = await collection.findOne({title: title, year: cases[1]}, {projection: lowDataConfig});
        }
        if (db_data === null) {
            db_data = await collection.findOne({title: title, year: cases[2]}, {projection: lowDataConfig});
        }
    }
    return {collection, db_data};
}

async function handle_update(collection, db_data, update, site_persian_summary, posterChange, trailerChange, mode, result) {
    try {
        let updateFields = {
            update_date: new Date()
        };

        if (update) {
            updateFields.sources = db_data.sources;
        } else if (result !== null) {
            db_data.sources.push(result.sources[0]);
            updateFields.sources = db_data.sources;
        }

        if (db_data.summary.persian === '') {
            db_data.summary.persian = site_persian_summary;
            updateFields.summary = db_data.summary;
        }

        if (posterChange) {
            updateFields.poster = db_data.poster;
        }
        if (trailerChange) {
            updateFields.trailers = db_data.trailers;
        }

        if (update || result !== null) {
            let omdb_data = await get_OMDB_Api_Data(db_data.title, db_data.year, mode);
            if (omdb_data !== null) {
                let apiFields = get_OMDB_Api_Fields(omdb_data, db_data.summary, mode);
                updateFields = {...updateFields, ...apiFields};
            }
        }

        await collection.findOneAndUpdate({_id: db_data._id}, {
            $set: updateFields
        });

    } catch (error) {
        saveError(error);
    }
}

function check_movieLinks_changed(site_links, db_links) {
    if (site_links.length !== db_links.length) {
        return true;
    }

    for (let i = 0; i < site_links.length; i++) {
        if (site_links[i].link !== db_links[i].link) {
            return true;
        }
    }
    return false;
}

function check_serialLinks_changed(site_links, db_links) {
    db_links = [].concat.apply([], db_links);

    if (site_links.length !== db_links.length) {
        return true;
    }

    for (let i = 0; i < site_links.length; i++) {//check links exist
        let link_exist = false;
        for (let j = 0; j < db_links.length; j++) {
            if (site_links[i].link === db_links[j].link) { //this link exist
                link_exist = true;
            }
        }
        if (!link_exist) { //new link
            return true;
        }
    }
    return false;
}

async function getInfoFromAPI(result, mode) {
    let omdb_data = await get_OMDB_Api_Data(result.title, result.year, mode);
    let apiFields = (omdb_data === null) ?
        get_OMDB_Api_nullFields(result.summary, mode) :
        get_OMDB_Api_Fields(omdb_data, result.summary, mode);
    return {...result, ...apiFields};
}

function handlePosterUpdate(db_data, poster) {
    if (poster === '') {
        return false;
    }

    for (let i = 0; i < db_data.poster.length; i++) {
        if (checkSources(db_data.poster[i], poster)) {//this poster exist
            if (db_data.poster[i] !== poster) { //replace link
                db_data.poster[i] = poster;
                return true;
            } else {
                return false;
            }
        }
    }

    db_data.poster.push(poster); //new poster
    return true;
}

function handleTrailerUpdate(db_data, site_trailers) {
    let trailersChanged = false;
    for (let i = 0; i < site_trailers.length; i++) {
        let trailer_exist = false;
        for (let j = 0; j < db_data.trailers.length; j++) {
            if (site_trailers[i].info === db_data.trailers[j].info) {//this trailer exist
                if (site_trailers[i].link !== db_data.trailers[j].link) { //replace link
                    db_data.trailers[j].link = site_trailers[i].link;
                    trailersChanged = true;
                }
                trailer_exist = true;
                break;
            }
        }
        if (!trailer_exist) { //new trailer
            db_data.trailers.push(site_trailers[i]);
            trailersChanged = true;
        }
    }
    return trailersChanged;
}
