import {replaceSpecialCharacters, fixJapaneseCharacter} from "../crawlers/utils.js";

export function getPersonModel(
    rawName, gender, about,
    tvmazePersonID, jikanPersonID,
    country, birthday, deathday, age,
    height, weight, hairColor, eyeColor,
    originalImages,
    movieID, movieName, movieType, moviePoster, positions, characterName, characterRole) {
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
        imageData: null, // {url,originalUrl,size,vpnStatus}
        originalImages: originalImages.filter(item => item),
        credits: [{
            movieID,
            movieName: movieName,
            movieType: movieType,
            moviePoster: moviePoster,
            positions,
            characterID: '',
            characterName: fixJapaneseCharacter(characterName),
            characterRole: characterRole,
            characterImage: '',
        }],
        insert_date: new Date(),
        update_date: 0,
        userStats: userStats_staff,
    }
}

export const userStats_staff = Object.freeze({
    //like,dislike
    like_staff_count: 0,
    dislike_staff_count: 0,
    //follow
    follow_staff_count: 0,
});

export const dataLevelConfig_staff = Object.freeze({
    low: Object.freeze({
        name: 1,
        rawName: 1,
        gender: 1,
        imageData: 1,
        userStats: Object.freeze({
            //like,dislike
            like_staff: 1,
            like_staff_count: 1,
            dislike_staff: 1,
            dislike_staff_count: 1,
            //follow
            follow_staff: 1,
            follow_staff_count: 1,
        })
    }),
    medium: Object.freeze({
        name: 1,
        rawName: 1,
        gender: 1,
        imageData: 1,
        userStats: Object.freeze({
            //like,dislike
            like_staff: 1,
            like_staff_count: 1,
            dislike_staff: 1,
            dislike_staff_count: 1,
            //follow
            follow_staff: 1,
            follow_staff_count: 1,
        })
    }),
    high: Object.freeze({
        //all
    })
});
