import {replaceSpecialCharacters, fixJapaneseCharacter} from "../crawlers/utils.js";

export function getCharacterModel(
    rawName, gender, about,
    tvmazePersonID, jikanPersonID,
    country, birthday, deathday, age,
    height, weight, hairColor, eyeColor,
    originalImages,
    movieID, movieName, movieType,
    moviePoster, movieThumbnail, role, actorName) {
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
        age: age || 0,
        height: height || '',
        weight: weight || '',
        hairColor: hairColor || '',
        eyeColor: eyeColor || '',
        imageData: null, // {url,originalUrl,originalSize,size,vpnStatus,thumbnail}
        originalImages: originalImages.filter(value => value),
        credits: [{
            movieID,
            movieName: movieName,
            movieType: movieType,
            moviePoster: moviePoster,
            movieThumbnail: movieThumbnail,
            role,
            actorID: '',
            actorName: fixJapaneseCharacter(actorName),
            actorImage: '',
            actorThumbnail: '',
        }],
        insert_date: new Date(),
        update_date: 0,
        userStats: userStats_character,
    }
}

export const userStats_character = Object.freeze({
    //like,dislike
    like_character_count: 0,
    dislike_character_count: 0,
});

export const dataLevelConfig_character = Object.freeze({
    low: Object.freeze({
        name: 1,
        rawName: 1,
        gender: 1,
        imageData: 1,
        userStats: Object.freeze({
            //like,dislike
            like_character: 1,
            like_character_count: 1,
            dislike_character: 1,
            dislike_character_count: 1,
        })
    }),
    medium: Object.freeze({
        name: 1,
        rawName: 1,
        gender: 1,
        imageData: 1,
        userStats: Object.freeze({
            //like,dislike
            like_character: 1,
            like_character_count: 1,
            dislike_character: 1,
            dislike_character_count: 1,
        })
    }),
    high: Object.freeze({
        //all
    })
});
