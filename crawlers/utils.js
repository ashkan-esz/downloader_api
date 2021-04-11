const persianRex = require('persian-rex');
const {saveError} = require("../saveError");

export function remove_persian_words(title, type) {
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

    if (type === 'serial' && titleIncludesSeason && title_array.length > 1) {
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
        .replace('…', '')
        .replace('marvels', '')
        .replace('boku no', 'my')
        .trim();
}

export function replacePersianNumbers(input) {
    let persianNumbers = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
    let arabicNumbers = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
    for (let i = 0; i < 10; i++) {
        input = input.replace(persianNumbers[i], i).replace(arabicNumbers[i], i);
    }
    return input;
}

export function getType(title) {
    return ((title.includes('فیلم') || title.includes('انیمیشن')) &&
        !title.includes('سریال'))
        ? 'movie' : 'serial';
}

export function getDubbed(link, info) {
    link = link.toLowerCase();
    info = info.toLowerCase();
    return (link.includes('farsi') || link.includes('dub') || info.includes('dubbed'));
}

export function getHardSub(info) {
    info = info.toLowerCase();
    return (info.includes('softsub') || info.includes('hardsub'));
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

export function getSeasonEpisode(input) {
    try {
        if (input === '') {
            return {
                season: 0,
                episode: 0
            }
        }
        let season;
        let episode;
        let case1 = input.toLowerCase().match(/s\d\de\d\d|s\d\de\d/g); //s01e02 | s01e2
        let case2 = input.toLowerCase().match(/s\de\d\d|s\de\d/g); //s1e02 | s1e2
        if (case1) {
            let seasonEpisode = case1.pop();
            season = Number(seasonEpisode.slice(1, 3));
            episode = Number(seasonEpisode.slice(4));
        } else {
            let seasonEpisode = case2.pop();
            season = Number(seasonEpisode.slice(1, 2));
            episode = Number(seasonEpisode.slice(3));
        }
        return {
            season: season,
            episode: episode
        }
    } catch (error) {
        saveError(error);
        return {
            season: 0,
            episode: 0
        }
    }
}

export function checkSourceExist(db_sources, pageLink) {
    for (let i = 0; i < db_sources.length; i++) {
        if (checkSource(db_sources[i].url, pageLink)) {
            return true;
        }
    }
    return false;
}

export function checkSource(case1, case2) {
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

export function checkBetterQuality(quality, prevQuality) {
    let x265 = quality.includes('x265');
    let prevX265 = prevQuality.includes('x265');
    quality = quality.split('- ')[0].toLowerCase()
        .replace(/.x265|.10bit/g, '')
        .replace(/[-._]/g, ' ');
    prevQuality = prevQuality.split('- ')[0].toLowerCase()
        .replace(/.x265|.10bit/g, '')
        .replace(/[-._]/g, ' ');
    const sortedQualities = ['cam', 'ts', 'tc', 'dvdscr', 'r6', 'r5',
        'dvdrip', 'r2', 'webrip', 'hdrip', 'brrip', 'bdrip',
        '720p webrip', '720p hdrip', '720p web dl',
        '720p bluray', '1080p web dl', '1080p bluray',
        'imax', 'full hd', '2160p', '1080p ac3', '4k', '8k'];
    const encodes = ['valamovie', 'tmkv', 'ganool', 'pahe', 'rarbg', 'evo',
        'psa', 'nitro', 'f2m', 'xredd', 'yify', 'shaanig', 'mkvcage', 'imax'];

    let prevQualityIndex = -1;
    let prevEncodeIndex = -1;
    let qualityIndex = 0;
    let encodeIndex = -1;
    let isBetter;
    for (let i = 0; i < sortedQualities.length; i++) {
        if (prevQuality.includes(sortedQualities[i])) {
            prevQualityIndex = i;
        }
        if (quality.includes(sortedQualities[i])) {
            qualityIndex = i;
        }
    }
    if (qualityIndex === prevQualityIndex) {
        if ((!prevX265 && x265) ||
            (!prevQuality.includes('10bit') && quality.includes('10bit'))) {
            isBetter = true;
        } else {
            for (let i = 0; i < encodes.length; i++) {
                if (prevQuality.includes(encodes[i])) {
                    prevEncodeIndex = i;
                }
                if (quality.includes(encodes[i])) {
                    encodeIndex = i;
                }
            }
            isBetter = (encodeIndex === -1) ? false : encodeIndex > prevEncodeIndex;
        }
    } else {
        isBetter = (qualityIndex > prevQualityIndex);
    }
    return isBetter;
}
