const persianRex = require('persian-rex');
const {saveError} = require("../saveError");

export function purgeTitle(title, type) {
    let titleIncludesSeason = title.includes('فصل');
    title = replacePersianNumbers(title);
    title = replaceSpecialCharacters(title.trim());
    let matchsinamaii = title.match(/سینمایی \d/g);
    title = title.replace('شماره ۱', '').replace('فیلم 1', '').replace(/سینمایی \d/g, '');
    let title_array = title.split(' ').filter((text) => text && !persianRex.hasLetter.test(text));
    if (title.includes('قسمت های ویژه') && !title.toLowerCase().includes('ova')) {
        title_array.push('OVA');
    }
    if (matchsinamaii) {
        let movieNumber = matchsinamaii[0].replace('سینمایی', '').trim();
        movieNumber = Number(movieNumber);
        title_array.push(movieNumber);
    }
    if (title_array.length > 1) {
        let year = title_array[title_array.length - 1];
        if (!isNaN(year) && Number(year) > 1000) {
            title_array.pop();
        } else if (!isNaN(title_array[0]) && Number(title_array[0]) > 1000) {
            title_array.shift();
        }
    }

    if (type.includes('serial') && titleIncludesSeason && title_array.length > 1) {
        let season = title_array[title_array.length - 1];
        if ((!isNaN(season) || persianRex.number.test(season)) && Number(season) < 10) {
            title_array.pop();
        }
    }

    if (title_array.length > 2) {
        let year = Number(title_array[title_array.length - 2]);
        let number = Number(title_array[title_array.length - 1]);
        if (year > 1900 && year < 2100 && number < 10) {
            title_array.pop();
            title_array.pop();
        }
    }
    return title_array.join(' ');
}

export function replaceSpecialCharacters(input) {
    return input
        .replace(/[;.:…\/☆★♡♪δ⅙√◎␣＋+＿_–-]/g, ' ')
        .replace(/["'’‘:?!#,()~♥△Ωωψ]/g, '')
        .replace(/\s\s+/g, ' ')
        .replace('twelve', '12')
        .replace(/&/g, 'and')
        .replace('∞', ' infinity')
        .replace(/[áåä@]/g, 'a')
        .replace(/[éëèē]/g, 'e')
        .replace('†', 't')
        .replace(/[ß♭]/g, 'b')
        .replace('ç', 'c')
        .replace('ş', 's')
        .replace(/[ôöøóō◯]/g, 'o')
        .replace(/[üúû]/g, 'u')
        .replace(/[ıí]/g, 'i')
        .replace(/(^|\s)iii/gi, ' 3')
        .replace(' ii', ' 2')
        .replace(' ∬', ' 2')
        .replace('marvels', '')
        .replace(/\s\s+/g, ' ')
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
    if (title.includes('فیلم') || title.includes('استندآپ')) {
        return 'movie';
    }
    if (title.includes('انیمیشن')) {
        return title.includes('سریال') ? 'serial' : 'movie';
    }
    if (title.includes('انیمه')) {
        if (title.includes('سینمایی')) {
            return 'anime_movie';
        }
        return title.includes('سریال') ? 'anime_serial' : 'anime_movie';
    }
    if (title.includes('سینمایی') || title.includes('لایو اکشن')) {
        return 'movie';
    }
    return 'serial';
}

export function checkDubbed(link, info = '') {
    link = link.toLowerCase();
    info = info.toLowerCase();
    return (
        link.includes('farsi') ||
        link.includes('dubbed') ||
        link.includes('دوبله فارسی') ||
        link.includes('زبان : فارسی') ||
        link.includes('زبان فارسی') ||
        info.includes('farsi') ||
        info.includes('dubbed') ||
        info.includes('دوبله فارسی') ||
        info.includes('زبان : فارسی') ||
        info.includes('زبان فارسی') ||
        info.includes('دوبله')
    );
}

export function checkHardSub(input) {
    input = input.toLowerCase();
    return (
        input.includes('softsub') ||
        input.includes('hardsub') ||
        input.includes('subfa') ||
        input.includes('sub') ||
        input.includes('هاردساب فارسی') ||
        input.includes('زیرنویس')
    );
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
        let season = 0;
        let episode = 0;
        let case1 = input.toLowerCase().match(/s\d+e\d+/g);
        if (case1) {
            let seasonEpisode = case1.pop();
            season = Number(seasonEpisode.split('e')[0].replace('s', ''));
            episode = Number(seasonEpisode.split('e')[1]);
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
        .replace('http://', '')
        .replace('www.', '')
        .replace('image.', '')
        .replace(/\d/g, '')
        .replace(/s/g, '')
        .split('.')[0];
    let new_source_name = case2
        .replace('https://', '')
        .replace('http://', '')
        .replace('www.', '')
        .replace('image.', '')
        .replace(/\d/g, '')
        .replace(/s/g, '')
        .split('.')[0];
    let isZarmovie = checkSourceNameAlternative(case1, case2, 'zar', 'zar');
    let isGolchindl = checkSourceNameAlternative(case1, case2, 'golchin', 'golchin');
    return source_name === new_source_name || isZarmovie || isGolchindl;
}

function checkSourceNameAlternative(link1, link2, name1, name2) {
    let case1Match = link1.includes(name1) || link1.includes(name2);
    let case2Match = link2.includes(name1) || link2.includes(name2);
    return case1Match && case2Match;
}

export function getNewURl(url, currentUrl) {
    let domain = url
        .replace(/www\.|https:\/\/|http:\/\/|\/page\/|\/(movie-)*anime\?page=/g, '')
        .split('/')[0];
    let currentDomain = currentUrl
        .replace(/www\.|https:\/\/|http:\/\/|\/page\/|\/(movie-)*anime\?page=/g, '')
        .split('/')[0];
    return url.replace(domain, currentDomain);
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

export function removeDuplicateLinks(input) {
    let result = [];
    for (let i = 0; i < input.length; i++) {
        let exist = false;
        for (let j = 0; j < result.length; j++) {
            if (input[i].link === result[j].link) {
                exist = true;
                break;
            }
        }
        if (!exist) {
            result.push(input[i]);
        }
    }
    return result;
}

export function removeDuplicateElements(input) {
    let result = [];
    for (let i = 0; i < input.length; i++) {
        let exist = false;
        for (let j = 0; j < result.length; j++) {
            if (input[i] === result[j]) {
                exist = true;
                break;
            }
        }
        if (!exist) {
            result.push(input[i]);
        }
    }
    return result;
}

export function purgeQualityText(qualityText) {
    return qualityText
        .replace('دانلود', '')
        .replace('با', '')
        .replace('کیفیت', '')
        .replace('انتخاب', '')
        .replace('کیفیت', '')
        .replace('نسخه', '')
        .replace('اختصاصی', '')
        .replace('گلچین', '')
        .replace('دوبله', '')
        .replace('فارسی', '')
        .replace('هاردساب', '')
        .replace(/[)(:]/g, '')
        .replace(/web-dl/gi, 'WEB-DL')
        .trim();
}

export function purgeSizeText(sizeText) {
    return sizeText
        .trim()
        .replace('میانگین حجم', '')
        .replace('حجم', '')
        .replace('میانگین', '')
        .replace('فایل', '')
        .replace('گیگابایت', 'GB')
        .replace('گیگا بایت', 'GB')
        .replace('گیگ', 'GB')
        .replace('مگابایت', 'MB')
        .replace(/[\s:]/g, '')
        .toUpperCase();
}

export function purgeEncoderText(encoderText) {
    return encoderText
        .replace('انکودر', '')
        .replace('انکدر', '')
        .replace('انکود', '')
        .replace('لینک های دانلود با زیرنویس فارسی چسبیده', '')
        .replace(/encoder/gi, '')
        .replace(':', '')
        .trim()
}

export function persianWordToNumber(text) {
    text = text.replace('ذوم', 'دوم');
    let persian = ['اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم', 'هفتم', 'هشتم', 'نهم', 'دهم'];
    return persian.findIndex(value => text.includes(value)) + 1;
}

export function convertHourToMinute(input) {
    //1 hr 30 min
    let split = input.toLowerCase().split('hr');
    if (split.length > 1) {
        let hour = Number(split[0]);
        let min = Number(split[1].replace('min', ''));
        return hour * 60 + min + ' min';
    } else {
        return input;
    }
}

export function purgeObjFalsyValues(obj) {
    try {
        let newObj = {};
        let keys = Object.keys(obj);
        for (let i = 0; i < keys.length; i++) {
            let fieldValue = obj[keys[i]];
            if (
                fieldValue &&
                !(typeof fieldValue === 'string' && fieldValue.toLowerCase() === 'n/a') &&
                !(typeof fieldValue === 'string' && fieldValue.toLowerCase() === 'unknown') &&
                !(typeof fieldValue === 'string' && fieldValue.toLowerCase() === '0 min') &&
                !(Array.isArray(fieldValue) && fieldValue.length === 0)
            ) {
                newObj[keys[i]] = fieldValue;
            }
        }
        return newObj;
    } catch (error) {
        saveError(error);
        return obj;
    }
}

export function getDecodedLink(link) {
    let decodedLink = link;
    try {
        decodedLink = decodeURIComponent(decodedLink);
    } catch (error) {
    }
    return decodedLink;
}

export function sortLinks(links, type) {
    return links.sort((a, b) => {
        let a_se = type.includes('anime') ? getSeasonEpisode(a.info) : getSeasonEpisode(a.link);
        let b_se = type.includes('anime') ? getSeasonEpisode(b.info) : getSeasonEpisode(b.link);
        return ((a_se.season > b_se.season) || (a_se.season === b_se.season && a_se.episode > b_se.episode)) ? 1 : -1;
    });
}
