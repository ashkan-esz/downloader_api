import {replaceSpecialCharacters} from "../crawlers/utils";

export function getPersonModel(rawName, gender, about, tvmazePersonID, jikanPersonID, country, birthday, deathday, originalImages, movieID, positions, characterName) {
    return {
        name: replaceSpecialCharacters(rawName.toLowerCase()),
        rawName: rawName,
        gender: gender,
        about: (about || '').trim().replace(/\n|\s\|\s+\|\s/g, ' | '),
        tvmazePersonID: tvmazePersonID,
        jikanPersonID: jikanPersonID,
        country: country || '',
        birthday: birthday || '',
        deathday: deathday || '',
        imageData: null, // {url,originalUrl,size}
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
