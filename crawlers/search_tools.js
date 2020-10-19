const axios = require('axios').default;
import axiosRetry from "axios-retry";
const cheerio = require('cheerio');
const persianRex = require('persian-rex');
import {save_error} from "../save_logs";

axiosRetry(axios, {
    retries: 4, retryDelay: (retryCount) => {
        return retryCount * 1000;
    }
});

async function wrapper_module(url, page_count, searchCB) {
    for (let i = 1; i <= page_count; i++) {
        try {
            let response = await axios.get(url + `${i}/`);
            let $ = cheerio.load(response.data);
            let links = $('a');
            for (let j = 0; j < links.length; j++) {

                 searchCB($(links[j]), i);

                // await searchCB($(links[j]), i);

                // if (j % 30 === 0) {
                //     await searchCB($(links[j]), i);
                // } else {
                //     searchCB($(links[j]), i);
                // }


            }
        } catch (error) {
            error.massage = "module: search_tools >> wrapper_module ";
            error.inputData = url + `${i}/`;
            error.time = new Date();
            save_error(error);
            console.log(error) //todo
        }
    }
}

async function search_in_title_page(title_array, page_link, mode, get_file_size, get_persian_plot, get_poster) {
    try {
        let response = await axios.get(page_link);
        let $ = cheerio.load(response.data);
        let links = $('a');
        let persian_plot = get_persian_plot($);
        let poster = get_poster($);
        let matchCases = getMatchCases(title_array, mode);
        let save_link = [];
        for (let j = 0, links_length = links.length; j < links_length; j++) {
            let link = $(links[j]).attr('href');
            if (link && check_format(link, mode)) {
                let result = check_download_link(link, matchCases, mode);
                if (result) {
                    let link_info = get_file_size($, links[j], mode);
                    if (link_info !== 'trailer' && link_info !== 'ignore') {
                        save_link.push({link: result, info: link_info});
                    }
                }
            }
        }
        return {save_link: save_link, persian_plot: persian_plot, poster: poster}
    } catch (error) {
        error.massage = "module: search_tools >> search_in_title_page ";
        error.inputData = page_link;
        error.time = new Date();
        save_error(error);
        console.log(error) //todo
        return {save_link: [], persian_plot: ''};
    }
}

function check_download_link(original_link, matchCases, mode) {
    let link = original_link.toLowerCase().replace(/_/g, '.');
    if (link.includes('trailer'))
        return null;
    if (mode === 'movie') {
        let isMatched = (link.includes(matchCases.case1) ||
            link.includes(matchCases.case2) ||
            link.includes(matchCases.case3));
        if (isMatched) {
            return original_link;
        } else {
            if (link.includes(matchCases.case1.replace('.ii', '.2'))) {
                return original_link;
            }
            let splitted_matchCase = matchCases.case1.split('.');
            if (splitted_matchCase.length > 3) {
                let newMatchCase = splitted_matchCase.slice(0, 3).join('.');
                if (link.includes(newMatchCase)) {
                    return original_link;
                } else {
                    let replacedAnd_MatchCase = matchCases.case1.replace('.and', '');
                    return (link.includes(replacedAnd_MatchCase)) ? original_link : null;
                }
            } else {
                return null;
            }
        }
    } else {
        let result = link.match(/(s\d\de\d\d)/g);
        if (result) {
            return original_link;
        } else {
            return null;
        }
    }
}

function getMatchCases(title_array, mode) {
    if (mode === 'movie') {
        let temp = title_array.map((text) => text.replace(/&/g, 'and').replace(/[’:]/g, ''));
        let case1 = temp.map((text) => text.split('.').filter((t) => t !== '')).flat(1);
        let case2 = case1.map((text) => text.split('-')).flat(1);
        let case3 = title_array.filter(value => isNaN(value));
        return {
            case1: case1.join('.').toLowerCase(),
            case2: case2.join('.').toLowerCase(),
            case3: case3.join('.').toLowerCase()
        }
    } else return null;
}

function check_format(link, mode) {
    link = link.toLowerCase();
    let formats = ['mkv', 'avi', 'mov', 'flv', 'wmv', 'mp4'];
    let qualities = ['bluray', 'mobile', 'dvdrip', 'hdrip', 'brip', 'webrip', 'web-dl', 'web.dl',
        'farsi_dubbed', 'dvdscr', 'x264', '3d', 'hdcam', '1080p'];
    let link_array = link.split('.');
    let link_format = link_array.pop();
    for (let i = 0, l = formats.length; i < l; i++) {
        if (link_format === formats[i]) {
            // check to !trailer
            if (link.includes('teaser') || link.includes('trailer')) {
                return false;
            }

            if (link.match(/\d\d\d\dp|\d\d\dp/g) !== null) {
                for (let j = 0; j < qualities.length; j++) {
                    if (link.includes(qualities[j])) {
                        return true;
                    }
                }
            }
            if (mode === 'serial' && link.match(/s\d\de\d\d/g)) {
                return true;
            }
        }
    }
    return false
}

function remove_persian_words(title, mode) {
    let title_array = title.trim()
        .replace('&', 'and')
        .replace(/[’:]/g, '')
        .replace(/_/g, ' ')
        .split(' ')
        .filter((text) => !persianRex.hasLetter.test(text) && text !== '');
    if (title_array.length > 1) {
        let year = title_array[title_array.length - 1];
        if (!isNaN(year) && Number(year) > 1000) {
            title_array.pop();
        } else if (!isNaN(title_array[0]) && Number(title_array[0]) > 1000) {
            title_array.shift();
        }
    }
    if (mode === 'serial' && title_array.length > 1) {
        let season = title_array[title_array.length - 1];
        if ((!isNaN(season) || persianRex.number.test(season)) && Number(season) < 13) {
            title_array.pop();
        } else if ((!isNaN(title_array[0]) || persianRex.number.test(title_array[0])) && Number(title_array[0]) < 13) {
            title_array.shift();
        }
    }
    return title_array;
}

function sort_links(save_link) { //sort links based on season
    let season_numbers = [];
    for (let i = 0; i < save_link.length; i++) {
        let season_episode = save_link[i].link.toLowerCase().match(/s\d\de\d\d/g)[0];
        let season = season_episode.slice(1, 3);
        if (!season_numbers.includes(Number(season)))
            season_numbers.push(Number(season))
    }
    season_numbers = season_numbers.sort((a, b) => a - b)

    let result = [];
    for (let k = 0; k < season_numbers.length; k++) {
        let season_array = [];
        for (let i = 0; i < save_link.length; i++) {
            let season_episode = save_link[i].link.toLowerCase().match(/s\d\de\d\d/g)[0];
            let season = season_episode.slice(1, 3);
            if (Number(season) === season_numbers[k]) {
                season_array.push({link: save_link[i].link, info: save_link[i].info})
            }
        }
        result.push(season_array);
    }
    return result;
}

function getMode(title){
    return((title.includes('فیلم') || title.includes('انیمیشن')) &&
        !title.includes('سریال'))
        ? 'movie' : 'serial';
}

exports.check_format = check_format;
exports.check_download_link = check_download_link;
exports.getMatchCases = getMatchCases;
exports.search_in_title_page = search_in_title_page;
exports.wrapper_module = wrapper_module;
exports.remove_persian_words = remove_persian_words;
exports.sort_links = sort_links;
exports.getMode = getMode;
