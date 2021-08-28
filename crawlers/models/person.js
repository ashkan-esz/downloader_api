const {replaceSpecialCharacters} = require('../utils');

export function getPersonModel(rawName, gender, about, tvmazePersonID, jikanPersonID, country, birthday, deathday, originalImages, movieID, positions, characterName) {
    return {
        name: replaceSpecialCharacters(rawName.toLowerCase()),
        rawName: rawName,
        gender: gender,
        about: (about || '').trim().replace(/\n/g, ' | '),
        tvmazePersonID: tvmazePersonID,
        jikanPersonID: jikanPersonID,
        country: country || '',
        birthday: birthday || '',
        deathday: deathday || '',
        image: '',
        originalImages: originalImages.filter(item => item),
        credits: [{
            movieID,
            movieName: '',
            moviePoster: '',
            positions,
            characterName,
            characterRole: '',
            characterImage: ''
        }],
    }
}
