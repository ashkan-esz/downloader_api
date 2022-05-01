import * as persianRex from "persian-rex";
import {saveError} from "../error/saveError.js";


export function purgeTitle(title, type, keepLastNumber = true) {
    let currentYear = new Date().getFullYear();
    let titleIncludesSeason = title.includes('فصل');
    title = replacePersianNumbers(title);
    const savedTitle = title;
    title = title.replace(/\d%/, (res) => res.replace('%', 'percent'));
    title = replaceSpecialCharacters(title.trim());
    let matchsinamaii = title.match(/سینمایی \d/g);
    title = title
        .replace('شماره ۱', '')
        .replace('دوبله فارسی انیمیشن 2 ', ' ')
        .replace('فیلم 100', '100')
        .replace('فیلم 19', '19')
        .replace(/سینمایی \d/g, '');

    if (title.includes('فیلم 1')) {
        let splitTitle = title.split('');
        let index = splitTitle.indexOf('فیلم');
        if (splitTitle[index + 1] === '1') {
            title = title.replace('فیلم 1', '');
        }
    }

    let title_array = title.split(' ').filter((text) => text && !persianRex.hasLetter.test(text));

    if (!isNaN(title_array[0]) && !isNaN(title_array[1]) && (isNaN(title_array[2]) || title_array[2] > 2000)) {
        if (savedTitle.match(/\d\d?:\d\d?/)) {
            //case: دانلود فیلم ۳:۱۰ to yuma 2007
            let t = title_array.shift();
            title_array[0] = t + ':' + title_array[0];
        } else if (savedTitle.match(/\d\d?\/\d\d?/)) {
            //case: دانلود فیلم ۱/۱ ۲۰۱۸
            let t = title_array.shift();
            title_array[0] = t + '/' + title_array[0];
        }
    }

    if (title_array[0] && title_array[0].match(/^\d+[a-zA-Z]+/)) {
        //14cameras --> 14 cameras
        title_array[0] = title_array[0].replace(/^\d+/, (number) => number + ' ');
    }

    if (title.includes('قسمت های ویژه') && !title.toLowerCase().includes('ova')) {
        title_array.push('OVA');
    }
    if (matchsinamaii) {
        let movieNumber = matchsinamaii[0].replace('سینمایی', '').trim();
        movieNumber = Number(movieNumber);
        title_array.push(movieNumber);
    }

    if (title_array.length > 1) {
        if (!isNaN(title_array[0]) && Number(title_array[0]) < 5) {
            title_array.shift();
        }
        let year = title_array[title_array.length - 1];
        if (!isNaN(year) && Number(year) > 1900 && !keepLastNumber) {
            title_array.pop();
        } else if (!isNaN(title_array[0]) && Number(title_array[0]) > 1000 && Number(title_array[0]) <= (currentYear + 1)) {
            let yearAtStart = title_array.shift();
            if (isNaN(year)) {
                title_array.push(yearAtStart);
            }
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
        if (year > 1900 && year <= (currentYear + 1) && number < 10) {
            title_array.pop();
            title_array.pop();
        }
    }

    let firstPart = title_array[0];
    let thirdPart = title_array.length > 1 ? title_array[2] : '';
    let lastPart = title_array.length > 3 ? title_array[title_array.length - 2] : '';
    if (
        (firstPart === lastPart && !isNaN(firstPart)) ||
        (thirdPart && firstPart === thirdPart && Number(firstPart) < 5)
    ) {
        title_array.shift();
    }

    return title_array;
}

export function replaceSpecialCharacters(input) {
    return input
        .replace(/[;:·…\/☆★°♡♪δ⅙√◎␣＋+＿_–-]/g, ' ')
        .replace(/["'’‘٫.:?¿!#%,()~♥△Ωωψ]/g, '')
        .replace(/\s\s+/g, ' ')
        .replace('twelve', '12')
        .replace('½', ' 1/2')
        .replace(/&/g, 'and')
        .replace('∞', ' infinity')
        .replace(/[áåäà@æ]/g, 'a')
        .replace(/[éëèē]/g, 'e')
        .replace('†', 't')
        .replace(/[ß♭]/g, 'b')
        .replace(/ç/g, 'c')
        .replace(/ş/g, 's')
        .replace(/[ôöøóō◯õ]|ö/g, 'o')
        .replace(/[üúûùū]/g, 'u')
        .replace(/ñ/g, 'n')
        .replace(/[ıí]/g, 'i')
        .replace(/(^|\s)iii/gi, ' 3')
        .replace(' ii', ' 2')
        .replace(' ∬', ' 2')
        .replace('marvels', '')
        .replace(/\s\s+/g, ' ')
        .trim();
}

export function fixJapaneseCharacter(input) {
    return input
        .replace(/[ū]/g, 'uu')
        .replace(/ō/g, 'ou')
        .replace('Yuichi', 'Yuuichi')
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
    if (title.includes('فیلم') ||
        title.includes('فيلم') || //its not duplicate
        title.includes('استندآپ') ||
        title.includes('استند آپ') ||
        title.includes('دانلود مراسم')
    ) {
        return 'movie';
    }
    if (title.includes('دانلود دوبله فارسی') && !title.includes('سریال') && !title.includes('انیم')) {
        //case: دانلود دوبله فارسی Wonder 2017
        return 'movie';
    }
    if (title.includes('دانلود ویژه برنامه') && !title.includes('سریال')) {
        //case: دانلود ویژه برنامه Harry Potter 20th Anniversary: Return to Hogwarts
        return 'movie';
    }
    if (
        title.includes('انیمیشن') ||
        title.includes('انیمیسن') ||
        title.includes('انیمشن') ||
        title.includes('انمیشن') ||
        title.includes('اینیمشن') ||
        title.includes('انیمیشین') ||
        title.includes('کارتون')) {
        return title.includes('سریال') ? 'serial' : 'movie';
    }
    if (title.includes('انیمه')) {
        if (title.includes('سینمایی')) {
            return 'anime_movie';
        }
        return title.includes('سریال') ? 'anime_serial' : 'anime_movie';
    }
    if (
        title.includes('سینمایی') ||
        title.includes('لایو اکشن') ||
        (title.includes('دانلود مستند') && !title.includes('دانلود مستند سریالی'))
    ) {
        return 'movie';
    }
    return 'serial';
}

export function getTitleAndYear(title, year, type) {
    try {
        let splitTitle = purgeTitle(title.toLowerCase(), type);
        year = splitTitle[splitTitle.length - 1];
        if (!isNaN(year) && Number(year) > 1900 && Number(year) < 2100) {
            if (splitTitle.length === 2 && Number(splitTitle[0]) > Number(year) && Number(splitTitle[0]) < 2030) {
                year = splitTitle[0];
                title = splitTitle[1];
            } else {
                splitTitle.pop();
                title = splitTitle.join(" ");
                let currentYear = new Date().getFullYear();
                if (Number(year) === currentYear + 1) {
                    year = currentYear.toString();
                } else if (Number(year) > currentYear + 1) {
                    year = '';
                }
            }
        } else if (splitTitle.length === 2 && Number(splitTitle[0]) > 2000 && Number(splitTitle[0]) < 2030 && Number(splitTitle[1]) < 1500) {
            year = splitTitle[0];
            title = splitTitle[1];
        } else if (isNaN(year) && Number(splitTitle[0]) > 2000 && Number(splitTitle[0]) < 2030) {
            year = splitTitle.shift();
            title = splitTitle.join(" ");
        } else {
            title = splitTitle.join(" ");
            year = '';
        }
        title = title
            .replace(/^\d+ (d|st|th|below)(?=\s)/i, (res) => res.replace(' ', ''))
            .replace(/^\d \d \d .+ \d \d \d$/, (res) => res.replace(/\s\d \d \d$/, '').trim())
            .replace(/^\d{2,5} .+ \d{2,5}$/, (res) => res.replace(/\s\d{2,5}$/, '').trim())
            .replace(/^\d{2,6} \d{2,6}$/, (res) => {
                let temp = res.split(' ');
                return (temp[0] === temp[1]) ? temp[0] : res;
            })
            .replace(/^\d\d?:\d\d? .+ \d\d?\s\d\d?$/, (res) => {
                let temp = res.split(' ');
                let lastPart = temp[temp.length - 2] + ' ' + temp[temp.length - 1];
                if (temp.length > 2 && temp[0] === lastPart.replace(' ', ':')) {
                    temp.pop();
                    temp.pop();
                    return temp.join(' ');
                }
                return res;
            })
            .replace(/^9 jkl$/i, '9jkl')
            .replace('10 x10', '10x10')
            .replace('100percent', '100 percent')
            .replace('2 the jungle book', 'the jungle book 2')
            .replace('5 transformers the last knight', 'transformers the last knight')
            .replace('6 recep ivedik', 'recep ivedik 6')
            .replace('5 ice age collision course', 'ice age collision course');

        let yearMatch = title.match(/\s\d\d\d\d$/g);
        if (yearMatch) {
            let number = Number(yearMatch.pop().trim());
            if (number >= 1995 && number <= 2030) {
                number = number.toString();
                if (!year || year === number) {
                    year = number;
                    title = title.replace(number, '').trim();
                }
            }
        }

        return {title, year: year || ''};
    } catch (error) {
        saveError(error);
        return {title, year: year || ''};
    }
}

export function validateYear(year) {
    year = year.toString().trim().slice(0, 4);
    let yearNumber = Number(year);
    if (yearNumber > 1900) {
        let currentYear = new Date().getFullYear();
        if (yearNumber === currentYear + 1) {
            year = currentYear.toString();
        } else if (yearNumber > currentYear + 1) {
            year = '';
        }
    } else {
        year = '';
    }
    return year;
}

export function checkDubbed(link, info = '') {
    link = link.toLowerCase();
    info = info.toLowerCase();
    return (
        (link.includes('farsi') && !link.includes('farsisub')) ||
        link.includes('dubbed') ||
        link.includes('duble') ||
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
        input.includes('softsuv') ||
        input.includes('hardsub') ||
        input.includes('subfa') ||
        input.match(/sub(?!(title|french|BED))/i) ||
        input.includes('هاردساب فارسی') ||
        input.includes('زیرنویس')
    );
}

export function getYear(title, page_link, downloadLinks) {
    let url_array = page_link
        .replace(title.replace(/\s+/g, '-'), '')
        .replace(/\/\d\d\d\d\/[^$]/g, '/')
        .replace(/[-/]/g, ' ')
        .split(' ')
        .filter(value => Number(value) > 1800 && Number(value) < 2100);
    if (url_array.length > 0) {
        let lastPart = url_array.pop();
        if (Number(lastPart) < 2100)
            return lastPart;
    }

    for (let i = 0; i < downloadLinks.length; i++) {
        let link = downloadLinks[i].link;
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
                episode: 0,
            }
        }

        input = input.toLowerCase().replace(/https?:\/\//, '');
        if (input.includes('/')) {
            input = input.split('/').slice(1).join('/')
        }
        input = input
            .replace(/(?<!\.)10bit/g, '.10bit')
            .replace(/(?<!(\.|^))(2160|1440|1080|720|576|480|360)p/g, (res) => '.' + res); // .S06E03720p.WEB-DL

        let season = 0;
        let episode = 0;
        let case1 = input.match(/s\d+([-.])*e\d+/gi);
        if (case1) {
            let seasonEpisode = case1.pop().replace(/[-.]/g, '');
            season = seasonEpisode.split('e')[0].replace('s', '');
            episode = seasonEpisode.split('e')[1];
        }
        if (season === 0 || episode === 0) {
            // e01e05 | s01s01
            let case2 = input.match(/\.([se])\d+([se])\d+\./gi);
            if (case2) {
                let seasonEpisode = case2.pop().replace(/^\.|\.$/gi, '');
                season = seasonEpisode.split(/[se]/gi)[1]; // ['',season,episode]
                episode = seasonEpisode.split(/[se]/gi)[2];
            }
        }
        if (season === 0 || episode === 0) {
            const episodeRegex = /(\.\d\d\d\d)*\.e?\d+\.((\d\d\d\d?p|bluray|web-dl|korean|hevc|x264|x265|10bit)\.)*/gi;
            const episodeMatch = input.replace(/[-_]/g, '.').match(episodeRegex);
            if (episodeMatch) {
                let match = episodeMatch.find(item => item.includes('e')) || episodeMatch.pop();
                episode = match.replace(/^(\.\d\d\d\d)*\.e?/gi, '').split('.')[0];
                if (episode.match(/\d\d\d\d?p/)) {
                    episode = 0;
                }
            }
            const seasonMatch = input.match(/([\/.])s\d+([\/.])/gi);
            let temp = seasonMatch ? seasonMatch.pop().replace(/([\/.s])/gi, '') : '';
            let missedEpisodeMatch = temp.match(/0\d\d\d/g); //case: S0409 --> S04E09
            if (missedEpisodeMatch && episode === 0) {
                let se = missedEpisodeMatch.pop();
                season = se.slice(0, 2);
                episode = se.slice(2);
            } else {
                season = temp ? temp.replace('00', '1') : 1;
            }
        }
        if (season <= 1 && episode === 0) {
            let ovaMatch = input.match(/(?<=\.)(Special|OVA|NCED|NCOP)\.\d\d\d?\.\d\d\d\d?p/i);
            if (!ovaMatch) {
                ovaMatch = input.match(/(?<=\.)(Special|OVA|NCED|NCOP)(E?)\d\d\d?\.\d\d\d\d?p/gi);
            }
            if (ovaMatch) {
                episode = ovaMatch.pop().replace(/^(Special|OVA|NCED|NCOP)(E?)(\.?)/gi, '').split('.')[0];
            }
        }
        season = Number(season);
        episode = Number(episode);
        if (season > 2000 && season < 2050) {
            season = 0;
        }
        return {season, episode};
    } catch (error) {
        saveError(error);
        return {
            season: 0,
            episode: 0
        }
    }
}

export function checkBetterQuality(quality, prevQuality) {
    if (quality === prevQuality) {
        return false;
    }
    let x265 = quality.includes('x265');
    let prevX265 = prevQuality.includes('x265');
    quality = quality.split('- ')[0].toLowerCase()
        .replace(/\.x265|\.10bit/g, '')
        .replace(/[-._]/g, ' ');
    prevQuality = prevQuality.split('- ')[0].toLowerCase()
        .replace(/\.x265|\.10bit/g, '')
        .replace(/[-._]/g, ' ');
    const sortedQualities = ['cam', 'ts', 'tc', 'dvdscr', 'r6', 'r5',
        'dvdrip', 'r2', 'web rip', 'hd rip', 'brrip', 'bdrip',
        '720p web rip', '720p hd rip', '720p web dl',
        '720p bluray', '1080p web rip', '1080p web dl', '1080p bluray',
        'imax', 'full hd', '2160p', '1080p ac3', '4k', '8k'];
    const encodes = ['valamovie', 'tmkv', 'ganool', 'pahe', 'rarbg', 'evo',
        'psa', 'nitro', 'f2m', 'xredd', 'yify', 'shaanig', 'mkvcage', 'imax'];

    let prevQualityIndex = -1;
    let prevEncodeIndex = -1;
    let qualityIndex = -1;
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

export function removeDuplicateLinks(input, replaceInfo = false) {
    let result = [];
    for (let i = 0; i < input.length; i++) {
        let exist = false;
        for (let j = 0; j < result.length; j++) {
            if (
                (input[i].link || input[i].url) === (result[j].link || result[j].url)
            ) {
                if (replaceInfo && input[i].info.length > result[j].info.length) {
                    result[j].info = input[i].info;
                }
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

export function sortLinks(links) {
    return links.sort((a, b) => {
        return ((a.season > b.season) || (a.season === b.season && a.episode > b.episode)) ? 1 : -1;
    });
}

export function getDatesBetween(date1, date2) {
    let milliseconds = date1.getTime() - date2.getTime();
    let seconds = milliseconds / 1000;
    let minutes = seconds / 60;
    let hours = minutes / 60;
    let days = hours / 24;
    return {
        milliseconds,
        seconds,
        minutes: minutes.toFixed(2),
        hours: hours.toFixed(2),
        days: days.toFixed(2),
    };
}

export function getMonthNumberByMonthName(monthName) {
    const months = {
        Jan: '01',
        Feb: '02',
        Mar: '03',
        Apr: '04',
        May: '05',
        Jun: '06',
        Jul: '07',
        Aug: '08',
        Sep: '09',
        Oct: '10',
        Nov: '11',
        Dec: '12',
    };
    return months[monthName.slice(0, 3)];
}

export function getDayName(dayNumber) {
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return daysOfWeek[dayNumber];
}
