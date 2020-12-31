const persianRex = require('persian-rex');

export function remove_persian_words(title, mode) {
    let titleIncludesSeason = title.includes('فصل');
    title = replacePersianNumbers(title);
    title = replaceSpecialCharacters(title.trim());
    let title_array = title.split(' ').filter((text) => text && !persianRex.hasLetter.test(text));
    if (title_array.length > 1) {
        let year = title_array[title_array.length - 1];
        if (!isNaN(year) && Number(year) > 1000) {
            title_array.pop();
        } else if (!isNaN(title_array[0]) && Number(title_array[0]) > 1000) {
            title_array.shift();
        }
    }

    if (mode === 'serial' && titleIncludesSeason && title_array.length > 1) {
        let season = title_array[title_array.length - 1];
        if ((!isNaN(season) || persianRex.number.test(season)) && Number(season) < 10) {
            title_array.pop();
        }
    }
    return title_array;
}

export function replaceSpecialCharacters(input) {
    return input
        .replace(/["'’:?!+.#,()]/g, '')
        .replace(/[\/_–-]/g, ' ')
        .replace(/\s\s\s\s/g, ' ')
        .replace(/\s\s\s/g, ' ')
        .replace(/\s\s/g, ' ')
        .replace('twelve', '12')
        .replace('&', 'and')
        .replace(/[áåä]/g, 'a')
        .replace(/[éëè]/g, 'e')
        .replace('ß', 'b')
        .replace('ç', 'c')
        .replace('ş', 's')
        .replace(/[ôöøó]/g, 'o')
        .replace(/[üú]/g, 'u')
        .replace(/[ıí]/g, 'i')
        .replace(' iii', ' 3')
        .replace(' ii', ' 2')
        .replace('…', '');
}

export function replacePersianNumbers(input) {
    let persianNumbers = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
    let arabicNumbers = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
    for (let i = 0; i < 10; i++) {
        input = input.replace(persianNumbers[i], i).replace(arabicNumbers[i], i);
    }
    return input;
}

export function sort_Serial_links(save_link) { //sort links based on season
    let season_numbers = [];
    for (let i = 0; i < save_link.length; i++) { //extract seasons
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
        result.push(season_array); // group links by season
    }
    return result;
}

export function getMode(title){
    return((title.includes('فیلم') || title.includes('انیمیشن')) &&
        !title.includes('سریال'))
        ? 'movie' : 'serial';
}

export function getYear(page_link, save_link) {
    let url_array = page_link
        .replace(/[-/]/g, ' ')
        .split(' ')
        .filter(value => Number(value) > 1800 && Number(value) < 2100);
    if (url_array.length > 0) {
        let lastPart = url_array.pop();
        if (Number(lastPart) < 2100)
            return lastPart;
    }

    for (let i = 0; i < save_link.length; i++) {
        let link = save_link[i].link;
        let link_array = link.replace(/[-_()]/g, '.').split('.')
            .filter(value => Number(value) > 1800 && Number(value) < 2100);
        if (link_array.length > 0) {
            return link_array.pop()
        }
    }
    return '';
}

export function getSeason(link) {
    return Number(link.toLowerCase().match(/s\d\de\d\d/g)[0].slice(1, 3));
}

export function checkSources(case1, case2) {
    let source_name = case1
        .replace('https://', '')
        .replace('www.', '')
        .replace('image.', '')
        .replace(/\d/g, '')
        .split('.')[0];
    let new_source_name = case2
        .replace('https://', '')
        .replace('www.', '')
        .replace('image.', '')
        .replace(/\d/g, '')
        .split('.')[0];
    return source_name === new_source_name;
}

export function getNewURl(url, newDomain) {
    let domain = url
        .replace(/www.|https:\/\/|\/page\//g, '')
        .replace(/[\/_-]/g, '.');
    return url
        .replace(domain.split('.')[0], newDomain.split('.')[0])
        .replace(domain.split('.')[1], newDomain.split('.')[1]);
}

