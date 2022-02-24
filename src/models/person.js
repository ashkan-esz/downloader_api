import {replaceSpecialCharacters, fixJapaneseCharacter} from "../crawlers/utils";

export function getPersonModel(rawName, gender, about, tvmazePersonID, jikanPersonID, country, birthday, deathday, originalImages, movieID, movieName, moviePoster, positions, characterName, characterRole) {
    return {
        name: replaceSpecialCharacters(fixJapaneseCharacter(rawName).toLowerCase()),
        rawName: fixJapaneseCharacter(rawName),
        gender: gender,
        about: (about || '').trim().replace(/\n\s*\n/g, '\n').replace(/\s\s+/g, ' '),
        tvmazePersonID: tvmazePersonID,
        jikanPersonID: jikanPersonID,
        country: country || '',
        birthday: birthday || '',
        deathday: deathday || '',
        imageData: null, // {url,originalUrl,size}
        originalImages: originalImages.filter(item => item),
        credits: [{
            movieID,
            movieName: movieName,
            moviePoster: moviePoster,
            positions,
            characterID: '',
            characterName: fixJapaneseCharacter(characterName),
            characterRole: characterRole,
            characterImage: '',
        }],
        likesCount: 0,
        dislikesCount: 0,
    }
}
