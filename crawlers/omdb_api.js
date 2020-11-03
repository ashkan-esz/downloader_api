const {replaceSpecialCharacters} = require("./search_tools");

const axios = require('axios').default;
import axiosRetry from "axios-retry";

axiosRetry(axios, {
    retries: 4, retryDelay: (retryCount) => {
        return retryCount * 1000;
    }
});

async function get_OMDB_Api_Data(title, thisYear, mode) {
    let apiKeyArray = [
        '48621e95', '4de5ec8d', '1bc90abf', '7c0fe6e', '16070419', '8cf4fc9a',
        'e42203dc', '25e38d4e', 'a3a8d729', '51f6c05a', 'b9a766e3',
        'e0c9d334', '91a3f2ee', '88862eae', 'aa0723f2', '20ccbf2b',
        'aed32a13', 'f0bdcac7', '844e1160', '1c15c5bd', '926ff44d',
        '2c76a960', '81ee4b8c', 'a7469a3b', '6e9a6749', 'c6de5a73',
        '68f6caf9', 'c9aec5c9', '76eb4d17', 'ba450d4d', '4d77f7e2'];
    let apiKeyCounter = 0;

    let response;
    let type = (mode === 'movie') ? 'movie' : 'series';
    while (true) {
        try {
            response = await axios.get(`http://www.omdbapi.com/?t=${title}&type=${type}&apikey=${apiKeyArray[apiKeyCounter]}`);
            break;
        } catch (error) {
            apiKeyCounter++;
            if (apiKeyCounter === apiKeyArray.length) {
                return null;
            }
        }
    }

    let data = response.data;
    if (data.Response === 'False') {
        return null;
    }

    let apiTitle = replaceSpecialCharacters(data.Title.toLowerCase().trim());
    let apiYear = data.Year.split(/[-–]/g)[0];
    let equalYear = (mode === 'movie') ? Math.abs(Number(thisYear) - Number(apiYear)) <= 1 : true;
    let titlesMatched = true;
    let splitTitle = title.split(' ');
    let splitApiTitle = apiTitle.split(' ');
    for (let j = 0; j < splitTitle.length; j++) {
        if (!splitApiTitle.includes(splitTitle[j])) {
            titlesMatched = false;
            break;
        }
    }

    if ((title !== apiTitle && !titlesMatched) || !equalYear) {
        return null;
    }

    return data;
}

function get_OMDB_Api_Fields(data, summary, mode) {
    summary.english = (data.Plot) ? data.Plot.replace(/<p>|<\/p>|<b>|<\/b>/g, '').trim() : '';
    let year = data.Year.split(/[-–]/g)[0];
    let collectedData = {
        totalSeasons: (mode === 'movie') ? '' : data.totalSeasons,
        boxOffice: (mode === 'movie') ? data.BoxOffice : '',
        summary: summary,
        rawTitle: data.Title.trim(),
        imdbID: data.imdbID,
        rated: data.Rated,
        movieLang: data.Language.toLowerCase(),
        country: data.Country.toLowerCase(),
        genres: data.Genre.toLowerCase().split(',').map(value => value.trim()),
        rating: data.Ratings,
        status: (mode === 'movie') ? 'ended' :
            (data.Year.split(/[-–]/g).length === 1) ? 'running' : 'ended',
        duration: data.Runtime,
        director: data.Director.toLowerCase(),
        writer: data.Writer.toLowerCase(),
        cast: data.Actors.toLowerCase().split(',').map(value => value.trim()),
        awards: data.Awards
    };

    if (mode === 'serial') {
        collectedData.year = year;
    }
    return collectedData;
}

function get_OMDB_Api_nullFields(summary, mode) {
    summary.english = '';
    let collectedData = {
        totalSeasons: '',
        boxOffice: '',
        summary: summary,
        rawTitle: "",
        imdbID: "",
        rated: "",
        movieLang: "",
        country: "",
        genres: [],
        rating: [],
        status: "",
        duration: "",
        director: "",
        writer: "",
        cast: [],
        awards: "",
    };
    if (mode === 'serial') {
        collectedData.year = "";
    }
    return collectedData;
}

exports.get_OMDB_Api_Data = get_OMDB_Api_Data;
exports.get_OMDB_Api_Fields = get_OMDB_Api_Fields;
exports.get_OMDB_Api_nullFields = get_OMDB_Api_nullFields;
