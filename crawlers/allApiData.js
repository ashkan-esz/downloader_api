const {get_OMDB_Api_Data, get_OMDB_Api_Fields, get_OMDB_Api_nullFields} = require('./omdbApi');
const {handleSeasonEpisodeUpdate, getTotalDuration} = require('./seasonEpisode');

export async function addApiData(result, site_links) {
    result.apiUpdateDate = new Date();

    let omdb_data = await get_OMDB_Api_Data(result.title, result.premiered, result.type);
    let updateFields = (omdb_data === null) ?
        get_OMDB_Api_nullFields(result.summary, result.type) :
        get_OMDB_Api_Fields(omdb_data, result.summary, result.type);
    result = {...result, ...updateFields};

    if (result.type === 'serial') {
        let {tvmazeApi_data} = await handleSeasonEpisodeUpdate(result, site_links, updateFields.totalSeasons, false);
        if (omdb_data === null) {
            //title doesnt exist in omdb api
            result.genres = tvmazeApi_data ? tvmazeApi_data.genres : [];
            result.duration = tvmazeApi_data ? tvmazeApi_data.duration : '0 min';
        } else if (tvmazeApi_data && tvmazeApi_data.isAnime) {
            result.genres.push('anime');
        }
        result.tvmazeID = tvmazeApi_data ? tvmazeApi_data.tvmazeID : 0;
        result.isAnimation = tvmazeApi_data ? tvmazeApi_data.isAnimation : false;
        result.status = tvmazeApi_data ? tvmazeApi_data.status : 'unknown';
        result.premiered = tvmazeApi_data ? tvmazeApi_data.premiered : '';
        if (tvmazeApi_data) {
            result.year = tvmazeApi_data.premiered.split('-')[0];
        }
        result.officialSite = tvmazeApi_data ? tvmazeApi_data.officialSite : '';
        result.releaseDay = tvmazeApi_data ? tvmazeApi_data.releaseDay : '';
        if (!result.imdbID) {
            result.imdbID = tvmazeApi_data ? tvmazeApi_data.imdbID : '';
        }
        if (!result.summary.english) {
            result.summary.english = tvmazeApi_data ? tvmazeApi_data.summary : '';
        }
        result.totalDuration = getTotalDuration(result.episodes, result.latestData);
    }

    return result;
}

export async function apiDataUpdate(db_data, site_links) {
    let now = new Date();
    let apiUpdateDate = new Date(db_data.apiUpdateDate);
    let hoursBetween = (now.getTime() - apiUpdateDate.getTime()) / (3600 * 1000);
    if (hoursBetween <= 4) {
        return null;
    }

    let updateFields = {};
    updateFields.apiUpdateDate = now;

    let omdb_data = await get_OMDB_Api_Data(db_data.title, db_data.premiered, db_data.type);
    if (omdb_data !== null) {
        let omdbFields = get_OMDB_Api_Fields(omdb_data, db_data.summary, db_data.type);
        updateFields = {...updateFields, ...omdbFields};
    }

    if (db_data.type === 'serial') {
        let {
            tvmazeApi_data,
            seasonsUpdate,
            episodesUpdate,
            nextEpisodeUpdate
        } = await handleSeasonEpisodeUpdate(db_data, site_links, updateFields.totalSeasons, true);

        if (seasonsUpdate) {
            updateFields.seasons = db_data.seasons;
        }
        if (episodesUpdate) {
            updateFields.episodes = db_data.episodes;
            updateFields.totalDuration = getTotalDuration(db_data.episodes, db_data.latestData);
        }
        if (nextEpisodeUpdate) {
            updateFields.nextEpisode = db_data.nextEpisode;
        }
        if (tvmazeApi_data) {
            if (updateFields.genres && !updateFields.genres.includes('anime') && tvmazeApi_data.isAnime) {
                updateFields.genres.push('anime');
            }
            updateFields.tvmazeID = tvmazeApi_data.tvmazeID;
            updateFields.isAnimation = tvmazeApi_data.isAnimation;
            updateFields.status = tvmazeApi_data.status;
            updateFields.year = tvmazeApi_data.premiered.split('-')[0];
            updateFields.premiered = tvmazeApi_data.premiered;
            updateFields.officialSite = tvmazeApi_data.officialSite;
            updateFields.releaseDay = tvmazeApi_data.releaseDay;
        }
    }

    return updateFields;
}
