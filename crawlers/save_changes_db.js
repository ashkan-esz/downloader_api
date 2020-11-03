import getCollection from '../mongoDB';
import {update_cached_titles, update_cashed_likes} from "../cache";
const {sort_links, getYear, getSeason, checkSources} = require('./search_tools');
const {get_OMDB_Api_Data, get_OMDB_Api_Fields, get_OMDB_Api_nullFields} = require('./omdb_api');
import {save_error} from "../save_logs";

module.exports = async function save(title_array, page_link, save_link, persian_summary, poster, mode) {
    try {
        let year = (mode === 'movie') ? getYear(page_link, save_link) : '';
        let title = title_array.join(' ').trim();
        let result = {
            title: title,
            sources: [{
                url: page_link,
                links: save_link
            }],
            year: year,
            like: 0,
            dislike: 0,
            insert_date: new Date(),
            update_date: 0,
            poster: [poster],
            summary: {persian: persian_summary},
            type : mode
        };

        let collection_name = (mode === 'serial') ? 'serials' : 'movies';
        let collection = await getCollection(collection_name);
        let search_result = await searchOnCollection(collection, title, year, mode);

        if (search_result === null) {//new title
            let newResult = await getInfoFromAPI(result, mode);
            await collection.insertOne(newResult);
            return;
        }

        let posterChanged = check_poster_changed(search_result, poster);

        let source_exist = false;
        for (let j = 0; j < search_result.sources.length; j++) {//check source exist
            let update = false;
            if (checkSources(search_result.sources[j].url, page_link)) { // this source exist
                source_exist = true;

                if (mode === 'movie') { //movie
                    update = handle_movie_changes(save_link, search_result.sources[j], update);
                } else { //serial
                    update = handle_serial_changes(save_link, search_result.sources[j], update);
                }

                if (update) {
                    await handle_update(collection, search_result, persian_summary, posterChanged, mode, null);
                } else if (posterChanged) {
                    await collection.findOneAndUpdate({_id: search_result._id}, {
                        $set: {
                            poster: search_result.poster
                        }
                    });
                }

                break;
            }
        }

        if (!source_exist) {//new source
            await handle_update(collection, search_result, persian_summary, posterChanged, mode, result);
        }

    } catch (error) {
        error.massage = "module: save_changes_db >> ... ";
        error.inputData = page_link;
        error.time = new Date();
        save_error(error);
    }
}

async function searchOnCollection(collection, title, year, mode) {
    let search_result;
    if (mode === 'serial') {
        search_result = await collection.findOne({title: title});
    } else {
        let YEAR = Number(year);
        let cases = [year, (YEAR + 1).toString(), (YEAR - 1).toString()];
        search_result = await collection.findOne({title: title, year: cases[0]});
        if (search_result === null) {
            search_result = await collection.findOne({title: title, year: cases[1]});
        }
        if (search_result === null) {
            search_result = await collection.findOne({title: title, year: cases[2]});
        }
    }
    return search_result;
}

async function getInfoFromAPI(result, mode) {
    let omdb_data = await get_OMDB_Api_Data(result.title, result.year, mode);
    let apiFields = (omdb_data === null) ?
        get_OMDB_Api_nullFields(result.summary, mode) :
        get_OMDB_Api_Fields(omdb_data, result.summary, mode);
    return {...result, ...apiFields};
}

async function handle_update(collection, search_result, persian_summary, posterChanged, mode, result) {
    try {
        if (result !== null) {
            search_result.sources.push(result.sources[0]);
        }

        // update_cached_titles(mode, search_result); //todo : fix cache
        // update_cashed_likes(mode, [search_result]);

        let updateFields = {
            sources: search_result.sources,
            update_date: new Date()
        };
        let persianSummary = search_result.summary.persian;
        if (persianSummary === null || persianSummary === '') {
            search_result.summary.persian = persian_summary;
            updateFields.summary = search_result.summary;
        }
        if (posterChanged) {
            updateFields.poster = search_result.poster;
        }

        let omdb_data = await get_OMDB_Api_Data(search_result.title, search_result.year, mode);
        if (omdb_data !== null) {
            let apiFields = get_OMDB_Api_Fields(omdb_data, search_result.summary, mode);
            updateFields = {...updateFields, ...apiFields};
        }

        await collection.findOneAndUpdate({_id: search_result._id}, {
            $set: updateFields
        });

    } catch (error) {
        let type = (result) ? 'new source' : 'update links';
        error.massage = `module: save_changes_db >> handle_update >> ${type}`;
        error.inputData = search_result;
        error.time = new Date();
        save_error(error);
    }
}

function check_poster_changed(search_result, poster) {
    let poster_exist = false;
    let no_poster = false;

    if (poster === '') {
        return false;
    }

    //no poster exist
    if (!search_result.poster ||
        search_result.poster === '' ||
        search_result.poster.length === 0) {
        search_result.poster = [poster];
        no_poster = true;
    }

    for (let i = 0; i < search_result.poster.length; i++) { // check to add poster
        if (search_result.poster[i] === poster ||
            checkSources(search_result.poster[i], poster)) {//this poster exist
            poster_exist = true;
            break;
        }
    }

    if (!poster_exist) {
        search_result.poster.push(poster);
    }

    return (!poster_exist || no_poster);
}

function handle_movie_changes(save_link, thisSource, update) {
    let links = thisSource.links;
    for (let l = 0; l < save_link.length; l++) {//check links exist
        let link_exist = false;
        for (let k = 0; k < links.length; k++) {
            if (links[k].link === save_link[l].link) { //this link exist
                link_exist = true;
                if (links[k].info !== save_link[l].info &&
                    links[k].info.length < save_link[l].info.length) {//link info update
                    thisSource.links[k].info = save_link[l].info
                    update = true;
                }
                break;
            }
        }
        if (!link_exist) {//movie new link
            thisSource.links.push(save_link[l]);
            update = true;
        }
    }
    return update;
}

function handle_serial_changes(save_link, thisSource, update) {
    let links = thisSource.links;
    for (let s = 0; s < save_link.length; s++) {//check links exist
        let season1 = getSeason(save_link[s][0].link);
        let season_exist = false;
        for (let l = 0; l < save_link[s].length; l++) {
            let link_exist = false;
            E :for (let k = 0; k < links.length; k++) {
                let season2 = getSeason(links[k][0].link);
                for (let h = 0; h < links[k].length; h++) {
                    if (links[k][h].link === save_link[s][l].link) { //this link exist
                        link_exist = true;
                        if (season1 === season2)
                            season_exist = true;
                        break E;
                    }
                }
                if (!link_exist && season1 === season2) {//serial season new link
                    season_exist = true;
                    thisSource.links[k].push(save_link[s][l]);
                    update = true;
                    break;
                }
            }
        }//end of checking all of this season links
        if (!season_exist) {//serial new season
            thisSource.links.push(save_link[s]);
            thisSource.links = sort_links(thisSource.links.flat(1))
            update = true;
        }
    }//end of seasons
    return update;
}
