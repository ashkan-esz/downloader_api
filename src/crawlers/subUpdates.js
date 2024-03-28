import {sortPostersOrder, sortTrailersOrder} from "./sourcesArray.js";
import {removeDuplicateLinks} from "./utils/utils.js";
import {getFileSize} from "./utils/axiosUtils.js";
import {getImageThumbnail} from "../utils/sharpImageMethods.js";
import {saveError} from "../error/saveError.js";

export async function handleSubUpdates(db_data, poster, trailers, sourceName, sourceVpnStatus) {
    try {
        let posterChange = await handlePosterUpdate(db_data, poster, sourceName, sourceVpnStatus);
        let {trailerChange, newTrailer} = handleTrailerUpdate(db_data, trailers, sourceName);

        return {
            posterChange,
            trailerChange,
            newTrailer,
        };
    } catch (error) {
        saveError(error);
        return {
            posterChange: false,
            trailerChange: false,
            newTrailer: false,
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
        if (!db_data.posters[i].thumbnail && db_data.posters[i].info !== 's3Poster') {
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
        if (db_data.posters[i].size === 0 && db_data.posters[i].info !== 's3Poster') {
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
            blurHash: "",
        });
    }

    //-------------------------------------
    //-------------------------------------

    let prevLength = db_data.posters.length;
    let s3PosterUpdate = false;
    if (db_data.poster_s3) {
        let prevS3Poster = db_data.posters.find(item => item.info === 's3Poster');
        if (!prevS3Poster) {
            //s3Poster doesn't exist in posters array
            posterUpdated = true;
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
            db_data.posters.push({
                url: db_data.poster_s3.url,
                info: 's3Poster',
                size: db_data.poster_s3.size,
                vpnStatus: db_data.poster_s3.vpnStatus,
                thumbnail: db_data.poster_s3.thumbnail,
                blurHash: db_data.poster_s3.blurHash,
            });
        } else {
            //check s3Poster updated/changed or need update
            if (!db_data.poster_s3.thumbnail) {
                let findPoster = db_data.posters.find(item => item.url === db_data.poster_s3.originalUrl);
                if (findPoster && findPoster.thumbnail) {
                    s3PosterUpdate = true;
                    db_data.poster_s3.thumbnail = findPoster.thumbnail;
                    if (!db_data.poster_s3.size && findPoster.size && findPoster.size < 1024 * 1024) {
                        db_data.poster_s3.size = findPoster.size;
                        db_data.poster_s3.originalSize = findPoster.size;
                    }
                } else {
                    let thumbnailData = await getImageThumbnail(db_data.poster_s3.url, true);
                    if (thumbnailData) {
                        s3PosterUpdate = true;
                        db_data.poster_s3.thumbnail = thumbnailData.dataURIBase64;
                        if (!db_data.poster_s3.size) {
                            db_data.poster_s3.size = thumbnailData.fileSize;
                        }
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
    let prevSort = db_data.posters.map(item => item.url).join(',');
    db_data.posters = sortPosters(db_data.posters);
    let newSort = db_data.posters.map(item => item.url).join(',');
    return (posterUpdated || !posterExist || s3PosterUpdate || prevLength !== db_data.posters.length || prevSort !== newSort);
}

function handleTrailerUpdate(db_data, site_trailers, sourceName) {
    let trailerChange = false;
    let newTrailer = false;
    for (let i = 0; i < site_trailers.length; i++) {
        let trailer_exist = false;
        for (let j = 0; j < db_data.trailers.length; j++) {
            if (site_trailers[i].info === db_data.trailers[j].info) {//this trailer exist
                if (site_trailers[i].url !== db_data.trailers[j].url) { //replace link
                    db_data.trailers[j].url = site_trailers[i].url;
                    trailerChange = true;
                }
                if (site_trailers[i].vpnStatus !== db_data.trailers[j].vpnStatus) { //replace vpnStatus
                    db_data.trailers[j].vpnStatus = site_trailers[i].vpnStatus;
                    trailerChange = true;
                }
                trailer_exist = true;
                break;
            }
        }
        if (!trailer_exist) { //new trailer
            db_data.trailers.push(site_trailers[i]);
            trailerChange = true;
            newTrailer = true;
        }
    }

    db_data.trailers = removeDuplicateLinks(db_data.trailers);
    let prevSort = db_data.trailers.map(item => item.url).join(',');
    if (site_trailers.length === 0) {
        //remove prev source trailers
        db_data.trailers = db_data.trailers.filter(item => !item.info.includes(sourceName));
    }
    db_data.trailers = sortTrailers(db_data.trailers);
    let newSort = db_data.trailers.map(item => item.url).join(',');
    if (prevSort !== newSort) {
        trailerChange = true;
    }

    return {trailerChange, newTrailer};
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
    if (
        sortedPosters.length > 1 &&
        sortedPosters[0].vpnStatus === 'allOk' && sortedPosters[1].vpnStatus === 'allOk' &&
        !sortedPosters[0].info.includes('s3Poster') && !sortedPosters[1].info.includes('s3Poster') &&
        (sortedPosters[0].size - sortedPosters[1].size) > 200 * 1024 //200kb
    ) {
        let temp = sortedPosters[0];
        sortedPosters[0] = sortedPosters[1];
        sortedPosters[1] = temp;
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
