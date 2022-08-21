import {saveError} from "../error/saveError.js";


export function replaceSpecialCharacters(input) {
    return input
        .replace(/[;:·…\/☆★°♡♪δ⅙√◎␣＋+＿_–−-]/g, ' ')
        .replace(/[”“"'’‘٫.:?¿!#%,()~♥△Ωωψ‎]/g, '')
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
        .replace(/[ôöøóō◯õò]|ö/g, 'o')
        .replace(/[üúûùū]/g, 'u')
        .replace(/ñ/g, 'n')
        .replace(/[ıíï]/g, 'i')
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

export function checkBetterQuality(quality, prevQuality, withSubIsBetter = true) {
    if (quality === prevQuality) {
        return false;
    }

    quality = quality.split('- ')[0].toLowerCase()
        .replace(/[-._]/g, ' ')
        .trim();
    prevQuality = prevQuality.split('- ')[0].toLowerCase()
        .replace(/[-._]/g, ' ')
        .trim();

    let resolution = Number(quality.split(' ')[0].replace('p', ''));
    let prevResolution = Number(prevQuality.split(' ')[0].replace('p', ''));
    if (resolution !== prevResolution) {
        return resolution > prevResolution;
    }

    const sortedQualities = [
        'cam', 'hd cam', 'ts', 'tc',
        'dvdscr', 'r6', 'r5', 'dvdrip', 'r2',
        'hd rip', 'web rip',
        'hd tv',
        'br rip', 'bd rip',
        'web dl', 'bluray',
        'imax', 'ac3', '4k', '8k'
    ];

    const encodes = [
        'valamovie', 'tmkv', 'ganool', 'pahe', 'rarbg',
        'evo', 'psa', 'nitro', 'f2m', 'xredd', 'yify',
        'shaanig', 'mkvcage', 'imax',
    ];

    let x265 = quality.includes('x265');
    let bit10 = quality.includes('10bit');
    let prevX265 = prevQuality.includes('x265');
    let prevBit10 = prevQuality.includes('10bit');

    let prevQualityIndex = -1;
    let qualityIndex = -1;
    let isBetter;

    for (let i = 0; i < sortedQualities.length; i++) {
        if (prevQuality.includes(sortedQualities[i])) {
            prevQualityIndex = i;
        }
        if (quality.includes(sortedQualities[i])) {
            qualityIndex = i;
        }
    }

    if (qualityIndex !== prevQualityIndex) {
        isBetter = (qualityIndex > prevQualityIndex);
    } else if (x265 !== prevX265 || bit10 !== prevBit10) {
        //check x265, 10bit
        isBetter = (x265 && !prevX265) || (bit10 && !prevBit10);
    } else {
        //check censored, dubbed, SoftSub, HardSub
        let t1 = !!quality.match(/censored|dubbed|sub/);
        let t2 = !!prevQuality.match(/censored|dubbed|sub/);
        if (t1 !== t2) {
            //one of them has it
            if (withSubIsBetter) {
                isBetter = quality.includes('sub');
            } else {
                isBetter = !t1 && t2;
            }
        } else if (t1 && t2) {
            //both has it
            const order = ['censored', 'duubed', 'hardsub', 'softsub'];
            let i1, i2;
            for (let i = 0; i < order.length; i++) {
                if (quality.includes(order[i])) {
                    i1 = i;
                }
                if (prevQuality.includes(order[i])) {
                    i2 = i;
                }
            }
            isBetter = i1 > i2;
        } else {
            //none of them
            let prevEncodeIndex = -1;
            let encodeIndex = -1;
            for (let i = 0; i < encodes.length; i++) {
                if (quality.includes(encodes[i])) {
                    encodeIndex = i;
                }
                if (prevQuality.includes(encodes[i])) {
                    prevEncodeIndex = i;
                }
            }
            isBetter = (encodeIndex === -1) ? false : encodeIndex > prevEncodeIndex;
        }
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
        jan: '01',
        feb: '02',
        mar: '03',
        apr: '04',
        may: '05',
        jun: '06',
        jul: '07',
        aug: '08',
        sep: '09',
        oct: '10',
        nov: '11',
        dec: '12',
    };
    return months[monthName.slice(0, 3).toLowerCase()];
}

export function getDayName(dayNumber) {
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return daysOfWeek[dayNumber];
}
