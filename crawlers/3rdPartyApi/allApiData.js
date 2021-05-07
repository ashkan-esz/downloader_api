const {get_OMDB_Api_Data, get_OMDB_Api_Fields} = require('./omdbApi');
const {handleSeasonEpisodeUpdate, getTotalDuration} = require('../seasonEpisode');

export async function addApiData(titleModel, site_links) {
    titleModel.apiUpdateDate = new Date();

    let omdb_data = await get_OMDB_Api_Data(titleModel.title, titleModel.premiered, titleModel.type);
    if (omdb_data !== null) {
        let updateFields = get_OMDB_Api_Fields(omdb_data, titleModel.summary, titleModel.type);
        titleModel = {...titleModel, ...updateFields};
    }

    if (titleModel.type === 'serial') {
        let {tvmazeApi_data} = await handleSeasonEpisodeUpdate(titleModel, site_links, titleModel.totalSeasons, false);
        if (omdb_data === null) {
            //title doesnt exist in omdb api
            titleModel.genres = tvmazeApi_data ? tvmazeApi_data.genres : [];
            titleModel.duration = tvmazeApi_data ? tvmazeApi_data.duration : '0 min';
        } else if (tvmazeApi_data && tvmazeApi_data.isAnime) {
            titleModel.genres.push('anime');
        }
        titleModel.tvmazeID = tvmazeApi_data ? tvmazeApi_data.tvmazeID : 0;
        titleModel.isAnimation = tvmazeApi_data ? tvmazeApi_data.isAnimation : false;
        titleModel.status = tvmazeApi_data ? tvmazeApi_data.status : 'unknown';
        titleModel.premiered = tvmazeApi_data ? tvmazeApi_data.premiered : '';
        if (tvmazeApi_data) {
            titleModel.year = tvmazeApi_data.premiered.split('-')[0];
        }
        titleModel.officialSite = tvmazeApi_data ? tvmazeApi_data.officialSite : '';
        titleModel.releaseDay = tvmazeApi_data ? tvmazeApi_data.releaseDay : '';
        if (!titleModel.imdbID) {
            titleModel.imdbID = tvmazeApi_data ? tvmazeApi_data.imdbID : '';
        }
        if (!titleModel.summary.english) {
            titleModel.summary.english = tvmazeApi_data ? tvmazeApi_data.summary : '';
        }
        titleModel.totalDuration = getTotalDuration(titleModel.episodes, titleModel.latestData);
    }

    return titleModel;
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
