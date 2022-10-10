import axios from "axios";
import {sortPostersOrder, sortTrailersOrder} from "./sourcesArray.js";
import {handleLatestDataUpdate} from "./latestData.js";
import {removeDuplicateLinks} from "./utils.js";
import {getImageThumbnail} from "../utils/sharpImageMethods.js";
import {saveError} from "../error/saveError.js";

export async function handleSubUpdates(db_data, poster, trailers, titleModel, type, sourceName, sourceVpnStatus) {
    try {
        let posterChange = await handlePosterUpdate(db_data, poster, sourceName, sourceVpnStatus);
        let trailerChange = handleTrailerUpdate(db_data, trailers);
        let {latestDataChange, PrimaryLatestDataChange} = handleLatestDataUpdate(db_data, titleModel.latestData, type);

        return {
            posterChange,
            trailerChange,
            latestDataChange,
            PrimaryLatestDataChange,
        };
    } catch (error) {
        saveError(error);
        return {
            posterChange: false,
            trailerChange: false,
            latestDataChange: false,
            PrimaryLatestDataChange: false,
        };
    }
}

async function handlePosterUpdate(db_data, poster, sourceName, sourceVpnStatus) {
    if (poster === '') {
        return false;
    }

    let posterExist = false;
    let posterUpdated = false;
    for (let i = 0; i < db_data.posters.length; i++) {
        //found poster
        if (db_data.posters[i].info.includes(sourceName)) {//this poster source exist
            if (db_data.posters[i].url !== poster) { //replace link
                db_data.posters[i].url = poster;
                posterUpdated = true;
            }
            if (db_data.posters[i].vpnStatus !== sourceVpnStatus.poster) { //replace vpnStatus
                db_data.posters[i].vpnStatus = sourceVpnStatus.poster;
                posterUpdated = true;
            }
            posterExist = true;
        }
        //add thumbnail
        if (!db_data.posters[i].thumbnail) {
            let thumbnailData = await getImageThumbnail(db_data.posters[i].url, true);
            if (thumbnailData) {
                posterUpdated = true;
                db_data.posters[i].thumbnail = thumbnailData.dataURIBase64;
                if (db_data.posters[i].size === 0 && thumbnailData.fileSize) {
                    db_data.posters[i].size = thumbnailData.fileSize;
                }
            }
        }
        //add size
        if (db_data.posters[i].size === 0) {
            db_data.posters[i].size = await getFileSize(db_data.posters[i].url);
            posterUpdated = true;
        }
    }

    if (!posterExist) {  //new poster
        let thumbnailData = await getImageThumbnail(poster, true);
        let thumbnail = thumbnailData ? thumbnailData.dataURIBase64 : '';
        let fileSize = (thumbnailData && thumbnailData.fileSize)
            ? thumbnailData.fileSize
            : await getFileSize(poster);

        db_data.posters.push({
            url: poster,
            info: sourceName,
            size: fileSize,
            vpnStatus: sourceVpnStatus.poster,
            thumbnail: thumbnail,
        });
    }

    //-------------------------------------
    //-------------------------------------

    let prevLength = db_data.posters.length;
    let s3PosterUpdate = false;
    if (db_data.poster_s3) {
        //s3Poster doesn't exist in posters array
        let prevS3Poster = db_data.posters.find(item => item.info === 's3Poster');
        if (!prevS3Poster) {
            s3PosterUpdate = true;
            let thumbnailData = await getImageThumbnail(db_data.poster_s3.url, true);
            let thumbnail = thumbnailData ? thumbnailData.dataURIBase64 : '';
            db_data.posters.push({
                url: db_data.poster_s3.url,
                info: 's3Poster',
                size: db_data.poster_s3.size,
                vpnStatus: db_data.poster_s3.vpnStatus,
                thumbnail: thumbnail,
            });
        } else {
            //check s3Poster updated/changed or need update
            if (!db_data.poster_s3.thumbnail) {
                let thumbnailData = await getImageThumbnail(db_data.poster_s3.url, true);
                if (thumbnailData) {
                    s3PosterUpdate = true;
                    db_data.poster_s3.thumbnail = thumbnailData.dataURIBase64;
                    if (!db_data.poster_s3.size) {
                        db_data.poster_s3.size = thumbnailData.fileSize;
                    }
                }
            }
            if (
                prevS3Poster.url !== db_data.poster_s3.url ||
                prevS3Poster.size !== db_data.poster_s3.size ||
                prevS3Poster.vpnStatus !== db_data.poster_s3.vpnStatus ||
                prevS3Poster.thumbnail !== db_data.poster_s3.thumbnail
            ) {
                s3PosterUpdate = true;
                prevS3Poster.url = db_data.poster_s3.url;
                prevS3Poster.size = db_data.poster_s3.size;
                prevS3Poster.vpnStatus = db_data.poster_s3.vpnStatus;
                prevS3Poster.thumbnail = db_data.poster_s3.thumbnail;
            }
        }
    }
    db_data.posters = removeDuplicateLinks(db_data.posters);
    let prevSort = db_data.posters.join(',');
    db_data.posters = sortPosters(db_data.posters);
    let newSort = db_data.posters.join(',');
    return (posterUpdated || !posterExist || s3PosterUpdate || prevLength !== db_data.posters.length || prevSort !== newSort);
}

function handleTrailerUpdate(db_data, site_trailers) {
    let trailersChanged = false;
    if (db_data.trailers === null && site_trailers.length > 0) {
        db_data.trailers = site_trailers;
        return true;
    }
    for (let i = 0; i < site_trailers.length; i++) {
        let trailer_exist = false;
        for (let j = 0; j < db_data.trailers.length; j++) {
            if (site_trailers[i].info === db_data.trailers[j].info) {//this trailer exist
                if (site_trailers[i].url !== db_data.trailers[j].url) { //replace link
                    db_data.trailers[j].url = site_trailers[i].url;
                    trailersChanged = true;
                }
                if (site_trailers[i].vpnStatus !== db_data.trailers[j].vpnStatus) { //replace vpnStatus
                    db_data.trailers[j].vpnStatus = site_trailers[i].vpnStatus;
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
    if (db_data.trailers !== null) {
        db_data.trailers = removeDuplicateLinks(db_data.trailers);
        let prevSort = db_data.trailers.join(',');
        db_data.trailers = sortTrailers(db_data.trailers);
        let newSort = db_data.trailers.join(',');
        if (prevSort !== newSort) {
            trailersChanged = true;
        }
    }
    return trailersChanged;
}

export function sortPosters(posters) {
    const posterSources = sortPostersOrder;
    let sortedPosters = [];
    for (let i = 0; i < posterSources.length; i++) {
        for (let j = 0; j < posters.length; j++) {
            if (posters[j].info.includes(posterSources[i])) {
                sortedPosters.push(posters[j]);
            }
        }
    }
    return sortedPosters;
}

export function sortTrailers(trailers) {
    const trailerSources = sortTrailersOrder;
    let trailerQualities = ['1080', '720', '360'];
    let sortedTrailers = [];

    for (let i = 0; i < trailerSources.length; i++) {
        for (let j = 0; j < trailerQualities.length; j++) {
            for (let k = 0; k < trailers.length; k++) {
                if (trailers[k].info.includes(trailerSources[i]) &&
                    trailers[k].info.includes(trailerQualities[j])) {
                    sortedTrailers.push(trailers[k]);
                }
            }
        }
    }
    return sortedTrailers;
}

async function getFileSize(url, retryCounter = 0) {
    try {
        let response = await axios.head(url);
        return Number(response.headers['content-length']) || 0;
    } catch (error) {
        if (((error.response && error.response.status === 404) || error.code === 'ERR_UNESCAPED_CHARACTERS') &&
            decodeURIComponent(url) === url && retryCounter < 1) {
            retryCounter++;
            let fileName = url.replace(/\/$/, '').split('/').pop();
            url = url.replace(fileName, encodeURIComponent(fileName));
            return await getFileSize(url, retryCounter);
        }

        if ((!error.response || error.response.status !== 404) && error.code !== 'ENOTFOUND') {
            //do not save 404|ENOTFOUND images errors
            saveError(error);
        }
        return 0;
    }
}
