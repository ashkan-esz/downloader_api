import {replaceSpecialCharacters} from "../crawlers/utils";

export function getCharacterModel(rawName, gender, about, tvmazePersonID, jikanPersonID, originalImages, movieID, role, actorName) {
    return {
        name: replaceSpecialCharacters(rawName.toLowerCase()),
        rawName: rawName,
        gender: gender,
        about: (about || '').trim().replace(/\n|\s\|\s+\|\s/g, ' | '),
        tvmazePersonID: tvmazePersonID,
        jikanPersonID: jikanPersonID,
        imageData: null, // {url,originalUrl,size}
        originalImages: originalImages.filter(value => value),
        credits: [{movieID, role, actorName}],
    }
}
