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
        insert_date: new Date(),
        update_date: 0,
        userStats: userStats_character,
    }
}

export const userStats_character = {
    //like,dislike
    like_character_count: 0,
    dislike_character_count: 0,
}

export const dataLevelConfig_character = {
    low: {
        name: 1,
        rawName: 1,
        gender: 1,
        imageData: 1,
        userStats: {
            //like,dislike
            like_character: 1,
            like_character_count: 1,
            dislike_character: 1,
            dislike_character_count: 1,
        }
    },
    medium: {
        name: 1,
        rawName: 1,
        gender: 1,
        imageData: 1,
        userStats: {
            //like,dislike
            like_character: 1,
            like_character_count: 1,
            dislike_character: 1,
            dislike_character_count: 1,
        }
    },
    high: {
        //all
    }
}
