import {replaceSpecialCharacters, fixJapaneseCharacter} from "../crawlers/utils.js";

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
        userStats: userStats_staff,
    }
}

export const userStats_staff = {
    //like,dislike
    like_staff_count: 0,
    dislike_staff_count: 0,
    //follow
    follow_staff_count: 0,
}

export const dataLevelConfig_staff = {
    low: {
        name: 1,
        rawName: 1,
        gender: 1,
        imageData: 1,
        userStats: {
            //like,dislike
            like_staff: 1,
            like_staff_count: 1,
            dislike_staff: 1,
            dislike_staff_count: 1,
            //follow
            follow_staff: 1,
            follow_staff_count: 1,
        }
    },
    medium: {
        name: 1,
        rawName: 1,
        gender: 1,
        imageData: 1,
        userStats: {
            //like,dislike
            like_staff: 1,
            like_staff_count: 1,
            dislike_staff: 1,
            dislike_staff_count: 1,
            //follow
            follow_staff: 1,
            follow_staff_count: 1,
        }
    },
    high: {
        //all
    }
}
