const {replaceSpecialCharacters} = require('../utils');

export function getCharacterModel(rawName, gender, about, tvmazePersonID, jikanPersonID, originalImages, movieID, role, actorName) {
    return {
        name: replaceSpecialCharacters(rawName.toLowerCase()),
        rawName: rawName,
        gender: gender,
        about: (about || '').trim().replace(/\n/g, ' | '),
        tvmazePersonID: tvmazePersonID,
        jikanPersonID: jikanPersonID,
        image: '',
        originalImages: originalImages,
        credits: [{movieID, role, actorName}],
    }
}
