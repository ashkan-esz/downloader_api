import * as cloudStorage from "../data/cloudStorage.js";
import {sortTrailers} from "./subUpdates.js";

export async function uploadTitlePosterAndAddToTitleModel(titleModel, posterUrl, updateFields = null, forceUpload = false) {
    if (posterUrl && !posterUrl.includes('/icon/') && !posterUrl.includes('nopicture.')) {
        let s3Poster = await cloudStorage.uploadTitlePosterToS3(titleModel.title, titleModel.type, titleModel.year, posterUrl, 0, forceUpload);
        if (s3Poster) {
            if (updateFields) {
                addS3PosterToTitleModel(updateFields, s3Poster);
                return updateFields;
            } else {
                addS3PosterToTitleModel(titleModel, s3Poster);
                return titleModel;
            }
        }
    }
    return updateFields || titleModel;
}

export async function uploadTitleYoutubeTrailerAndAddToTitleModel(titleModel, trailerUrl, updateFields = null) {
    if (trailerUrl) {
        let s3Trailer = await cloudStorage.uploadTitleTrailerFromYoutubeToS3(titleModel.title, titleModel.type, titleModel.year, trailerUrl);
        if (s3Trailer) {
            if (updateFields) {
                addS3TrailerToTitleModel(updateFields, s3Trailer, titleModel.trailers);
                return updateFields;
            } else {
                addS3TrailerToTitleModel(titleModel, s3Trailer);
                return titleModel;
            }
        }
    }
    return updateFields || titleModel;
}

export function addS3PosterToTitleModel(titleModel, s3Poster) {
    if (s3Poster) {
        titleModel.poster_s3 = s3Poster;
        titleModel.posters = [{
            url: s3Poster.url,
            info: 's3Poster',
            size: s3Poster.size,
            vpnStatus: s3Poster.vpnStatus,
            thumbnail: s3Poster.thumbnail,
        }];
    }
    return titleModel;
}

export function addS3TrailerToTitleModel(titleModel, s3Trailer, prevTrailers = null) {
    if (s3Trailer) {
        titleModel.trailer_s3 = s3Trailer;
        let trailers = prevTrailers ? prevTrailers : [];
        trailers.push({
            url: s3Trailer.url,
            info: 's3Trailer-720p',
            vpnStatus: s3Trailer.vpnStatus,
        });
        titleModel.trailers = sortTrailers(trailers);
    }
    return titleModel;
}

export function checkNeedTrailerUpload(s3Trailer, trailers) {
    if (s3Trailer) {
        return false;
    }
    if (!trailers) {
        return true;
    }
    let sources = [];
    for (let i = 0; i < trailers.length; i++) {
        let sourceName = trailers[i].info.split('-')[0];
        if (trailers[i].vpnStatus === 'allOk' && sourceName !== 's3Trailer' && !sources.includes(sourceName)) {
            sources.push(sourceName);
            if (sources.length === 3) {
                return false;
            }
        }
    }
    return true;
}
