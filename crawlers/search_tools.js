const axios = require('axios').default;
const cheerio = require('cheerio');
const persianRex = require('persian-rex');

async function wrapper_module(url, page_count, searchCB) {
    let error_counter = 0;
    for (let i = 1; i < page_count; i++) {
        try {
            let response = await axios.get(url + `${i}/`);
            let $ = cheerio.load(response.data);
            let links = $('a');
            for (let j = 0; j < links.length; j++) {

                await searchCB($(links[j]), i);

            }
        } catch (error) {
            console.error(error);
            if (error_counter < 3) {
                error_counter++
                i--;
            } else error_counter = 0;
        }
    }
}

async function search_in_title_page(title_array, page_link, mode, get_file_size, get_persian_plot) {
    try {
        let response = await axios.get(page_link);
        let $ = cheerio.load(response.data);
        let links = $('a');
        let persian_plot = get_persian_plot($);
        let matchCases = getMatchCases(title_array, mode);
        let save_link = [];
        for (let j = 0, links_length = links.length; j < links_length; j++) {
            let link = $(links[j]).attr('href');
            if (link && check_format(link)) {
                let result = check_download_link(link, matchCases, mode);
                if (result) {
                    let link_info = get_file_size($, links[j], mode);
                    save_link.push({link: result, info: link_info});
                }
            }
        }
        return {save_link: save_link, persian_plot: persian_plot}
    } catch (error) {
        console.error(error);
        return {save_link: [], persian_plot: ''};
    }
}

function check_download_link(original_link, matchCases, mode) {
    let link = original_link.toLowerCase();
    if (link.includes('trailer'))
        return null;
    if (mode === 'movie') {
        return (link.includes(matchCases.case1) || link.includes(matchCases.case2)) ? original_link : null;
    } else {
        let result = link.match(/(s\d\de\d\d)/g);
        if (result)
            return original_link;
    }
}

function getMatchCases(title_array, mode) {
    if (mode === 'movie') {
        let temp = title_array.map((text) => text.replace(/&/g, 'and').replace(/[’:]/g, ''));
        let case1 = temp.map((text) => text.split('.').filter((t) => t !== '')).flat(1);
        let case2 = case1.map((text) => text.split('-')).flat(1);
        return {case1: case1.join('.'), case2: case2.join('.')}
    } else return null;
}

function check_format(link) {
    let formats = ['mkv', 'mp4', 'avi', 'mov', 'flv', 'wmv'];
    let link_array = link.split('.');
    let link_format = link_array.pop();
    for (let i = 0, l = formats.length; i < l; i++) {
        if (link_format === formats[i])
            return true;
    }
    return false
}

function remove_persian_words(title, mode) {
    let title_array = title.split(' ').filter((text) => !persianRex.hasLetter.test(text) && text!=='');
    if (title_array.length > 0) {
        let year = title_array[title_array.length - 1];
        if (!isNaN(year) && Number(year) > 1000) {
            title_array.pop();
        } else if (!isNaN(title_array[0]) && Number(title_array[0]) > 1000) {
            title_array.shift();
        }
    }
    if (mode === 'serial' && title_array.length > 0) {
        let season = title_array[title_array.length - 1];
        if (!isNaN(season) || persianRex.number.test(season)) {
            title_array.pop();
        } else if (!isNaN(title_array[0]) || persianRex.number.test(title_array[0])) {
            title_array.shift();
        }
    }
    return title_array;
}

function sort_links(save_link) {
    let season_numbers = [];
    for (let i = 0; i < save_link.length; i++) {
        let season_episode = save_link[i].link.toLowerCase().match(/s\d\de\d\d/g)[0];
        let season = season_episode.slice(1, 3);
        if (!season_numbers.includes(Number(season)))
            season_numbers.push(Number(season))
    }
    season_numbers = season_numbers.sort((a, b) => a - b)
    // console.log(season_numbers)
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

exports.check_format = check_format;
exports.check_download_link = check_download_link;
exports.getMatchCases = getMatchCases;
exports.search_in_title_page = search_in_title_page;
exports.wrapper_module = wrapper_module;
exports.remove_persian_words = remove_persian_words;
exports.sort_links = sort_links;