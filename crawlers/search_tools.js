const axios = require('axios').default;
const cheerio = require('cheerio');
import axiosRetry from "axios-retry";
import {saveError} from "../saveError";

axiosRetry(axios, {
    retries: 4, retryDelay: (retryCount) => {
        return retryCount * 1000;
    }
});

async function wrapper_module(url, page_count, searchCB) {
    for (let i = 1; i <= page_count; i++) {//todo : i=1
        try {
            let response = await axios.get(url + `${i}/`);
            let $ = cheerio.load(response.data);
            let links = $('a');
            for (let j = 0; j < links.length; j++) {

                // searchCB($(links[j]), i, $);

                await searchCB($(links[j]), i, $);

                // if (j % 30 === 0) { // todo : use this way to prevent errors
                //     await searchCB($(links[j]), i, $);
                // } else {
                //     searchCB($(links[j]), i, $);
                // }


            }
        } catch (error) {
            saveError(error);
        }
    }
}

async function search_in_title_page(title_array, page_link, mode, get_file_size) {
    try {
        let response = await axios.get(page_link);
        let $ = cheerio.load(response.data);
        let links = $('a');
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
        return {save_link: save_link, $2: $};
    } catch (error) {
        saveError(error);
        return {save_link: [], persian_plot: ''};
    }
}

function check_download_link(original_link, matchCases, mode) {
    let link = original_link.toLowerCase().replace(/[_-]/g, '.');
    if (link.includes('trailer')) {
        return null;
    }

    if (mode === 'movie') {
        if (
            link.includes(matchCases.case1) ||
            link.includes(matchCases.case2) ||
            link.includes(matchCases.case3) ||
            link.includes(matchCases.case4) ||
            link.includes(matchCases.case1.replace('.ii', '.2')) ||
            link.includes(matchCases.case1.replace('el', 'the'))
        ) {
            return original_link;
        }

        let splitted_matchCase = matchCases.case1.split('.');

        if (splitted_matchCase.length > 6) {
            let newMatchCase = splitted_matchCase.slice(3).join('.');
            if (link.includes(newMatchCase)) {
                return original_link;
            } else {
                let replacedAnd_MatchCase = matchCases.case1.replace('.and', '');
                return (link.includes(replacedAnd_MatchCase)) ? original_link : null;
            }
        }

        if (splitted_matchCase.length > 3) {
            let newMatchCase = splitted_matchCase.slice(0, 3).join('.');
            if (link.includes(newMatchCase)) {
                return original_link;
            } else {
                let replacedAnd_MatchCase = matchCases.case1.replace('.and', '');
                return (link.includes(replacedAnd_MatchCase)) ? original_link : null;
            }
        }
        return null;
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
        let case1 = temp.map((text) => text.split('.').filter((t) => t !== ''));
        case1 = [].concat.apply([], case1);
        let case2 = case1.map((text) => text.split('-'));
        case2 = [].concat.apply([], case2);
        let case3 = title_array.filter(value => isNaN(value));
        let case4 = case3.map((text) => text.charAt(0));
        return {
            case1: case1.join('.').toLowerCase(),
            case2: case2.join('.').toLowerCase(),
            case3: case3.join('.').toLowerCase(),
            case4: case4.join('.').toLowerCase()
        }
    } else return null;
}

function check_format(link, mode) {
    link = link.toLowerCase();
    let formats = ['mkv', 'avi', 'mov', 'flv', 'wmv', 'mp4'];
    let qualities = ['bluray', 'mobile', 'dvdrip', 'hdrip', 'brip', 'webrip', 'web-dl', 'web.dl',
        'farsi_dubbed', 'dvdscr', 'x264', '3d', 'hdcam', '1080p', 'farsi.dubbed'];
    let encodes = ['pahe', 'imax', 'psa', 'yify', 'rarbg']
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
                for (let j = 0; j < encodes.length; j++) {
                    if (link.includes(encodes[j])) {
                        return true;
                    }
                }
            }
            if (link.includes('dvdrip') || link.includes('hdcam')) {
                return true;
            }
            return (mode === 'serial' && link.match(/s\d\de\d\d/g));
        }
    }
    return false;
}

exports.check_format = check_format;
exports.check_download_link = check_download_link;
exports.getMatchCases = getMatchCases;
exports.search_in_title_page = search_in_title_page;
exports.wrapper_module = wrapper_module;
