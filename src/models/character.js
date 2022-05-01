import {replaceSpecialCharacters, fixJapaneseCharacter} from "../crawlers/utils.js";

export function getCharacterModel(rawName, gender, about, tvmazePersonID, jikanPersonID, originalImages, movieID, movieName, moviePoster, role, actorName) {
    return {
        name: replaceSpecialCharacters(fixJapaneseCharacter(rawName).toLowerCase()),
        rawName: fixJapaneseCharacter(rawName),
        gender: gender,
        about: (about || '').trim().replace(/\n\s*\n/g, '\n').replace(/\s\s+/g, ' '),
        tvmazePersonID: tvmazePersonID,
        jikanPersonID: jikanPersonID,
        imageData: null, // {url,originalUrl,size}
        originalImages: originalImages.filter(value => value),
        credits: [{
            movieID,
            movieName: movieName,
            moviePoster: moviePoster,
            role,
            actorID: '',
            actorName: fixJapaneseCharacter(actorName),
            actorImage: '',
        }],
        likesCount: 0,
        dislikesCount: 0,
    }
}
