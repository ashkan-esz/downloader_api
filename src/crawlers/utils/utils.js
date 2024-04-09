import {saveError} from "../../error/saveError.js";


export function replaceSpecialCharacters(input) {
    return input
        .replace('&#39;', '')
        .replace(/[;؛:·…\/☆★°♡♪δ⅙√◎␣＋+＿_–−-]|(\|)/g, ' ')
        .replace(/[”“"'’‘٫.:?¿？!¡#%,()~♥♡△∽Ωωψ‎]/g, '')
        .replace(/\s\s+/g, ' ')
        .replace('twelve', '12')
        .replace('½', ' 1/2')
        .replace(/&/g, 'and')
        .replace('∞', ' infinity')
        .replace(/[áåäà@æ]/g, 'a')
        .replace(/[éëèēê]/g, 'e')
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
        title.includes('تاک‌شو') ||
        title.includes('استندآپ') ||
        title.includes('استند آپ') ||
        title.includes('دانلود مراسم') ||
        title.includes('دانلود کنسرت')
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
        (title.includes('دانلود مستند') && !title.includes('دانلود مستند سریالی')) ||
        (title.includes('نمایش') && !title.includes('سریالی'))
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
        link.includes('dual.audio') ||
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
        input.match(/soft?\.?s[ou][bv]/) ||
        input.includes('|softsob') ||
        input.includes('hardsub') ||
        input.includes('subfa') ||
        input.includes('farsisub') ||
        input.includes('sub.farsi') ||
        input.includes('fa.sub') ||
        input.includes('multisub') ||
        (input.includes('.subbed') && !input.includes('not.subbed')) ||
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

export function getSeasonEpisode(input, isLinkInput = false) {
    try {
        if (!input) {
            return {season: 0, episode: 0, isNormalCase: false}
        }

        input = input.toLowerCase()
            .replace(/https?:\/\//, '')
            .replace(/se\d+e\d+/, res => res.replace('se', 's'))
            .split('md5')[0];
        const slashIndex = input.indexOf('/');
        if (slashIndex !== -1) {
            input = input.substring(slashIndex + 1);
        }
        input = input
            .replace(/(?<!\.)10bit/g, '.10bit')
            .replace(/\.e\d+end/i, res => res.replace('end', '.end'))
            .replace(/(?<!(\.|^))(2160|1440|1080|720|576|480|360)p/g, (res) => '.' + res); // .S06E03720p.WEB-DL

        let season = 0, episode = 0;

        const case0 = input.match(/_\d+th_season_\d+/g); //_5th_Season_02.720p
        if (case0) {
            let temp = case0.pop().split('th_season_');
            season = temp[0].replace('_', '');
            episode = temp[1];
        } else {
            const case1 = input.match(/(?<!([a-z]))s\d+([-.]|%20)*e\d+/gi);
            if (case1) {
                const temp = case1.pop();
                const seasonEpisode = temp.replace(/[-.]|%20/g, '');
                [season, episode] = seasonEpisode.split('e').map(str => str.replace('s', ''));
                if (temp.match(/^s\d\d\.?e\d\d$/i)) {
                    return {season: Number(season), episode: Number(episode), isNormalCase: true}
                } else if (temp.match(/^s20\d\de\d\d$/i)) {
                    return {season: 1, episode: Number(episode), isNormalCase: true}
                }
            } else {
                // e01e05 | s01s01
                const case2 = input.match(/\.([se])\d+([se])\d+\./gi);
                if (case2) {
                    [, season, episode] = case2.pop().replace(/^\.|\.$/gi, '').split(/[se]/gi);
                } else {
                    const case3 = input.match(/(%20)s\d+(%20)?b\d+(%20)/gi);
                    if (case3) {
                        [, season, episode] = case3.pop().replace(/%20/gi, '').split(/[sb]/gi);
                    }
                }
            }
        }

        const editedInput = input.replace(/[-_]|%20/g, '.').replace(/\.\.+/, '.');

        if (season === 0 || episode === 0) {
            const seasonEpisodeMatch = editedInput.match(/\.s\d\d?\.e?\d\d?\./gi);
            if (seasonEpisodeMatch) {
                [season, episode] = seasonEpisodeMatch.pop().replace(/\.s|\.$/gi, '').split('.');
            }
        }

        if (season === 0 || episode === 0) {
            const episodeRegex = /(\.\d\d\d\d)*\.e?\d+\.((\d\d\d\d?p|bluray|web-dl|korean|hevc|x264|x265|10bit)\.)*/gi;
            const episodeMatch = editedInput.match(episodeRegex);
            if (episodeMatch) {
                const match = episodeMatch.find(item => item.includes('e')) || episodeMatch.pop();
                episode = match.replace(/^(\.\d{4})*\.e?/i, '').split('.')[0];
                if (episodeMatch.length > 0 && (episode === '' || Number(episode) > 1900)) {
                    episode = episodeMatch.pop().replace(/^(\.\d{4})*\.e?/i, '').split('.')[0];
                }
                if (episode.endsWith('p')) {
                    episode = 0;
                }
            }
            const seasonMatch = input.match(/([\/.])s\d+([\/.])/gi);
            if (seasonMatch) {
                const temp = seasonMatch.pop().match(/\d+/)[0];
                const missedEpisodeMatch = temp.match(/0\d\d\d/); //case: S0409 --> S04E09
                if (missedEpisodeMatch && episode === 0) {
                    const se = missedEpisodeMatch[0];
                    season = se.slice(0, 2);
                    episode = se.slice(2);
                } else {
                    season = temp.replace('00', '1');
                }
            } else {
                season = 1;
            }
        }

        if (season <= 1 && episode === 0) {
            let ovaMatch = input.match(/(?<=\.)(Special|OVA|OAD|NCED|NCOP|Redial)\.\d\d\d?\.\d\d\d\d?p/i);
            if (!ovaMatch) {
                ovaMatch = input.match(/(?<=\.)(Special|OVA|OAD|NCED|NCOP|Redial)(E?)\d\d\d?\.\d\d\d\d?p/gi);
            }
            if (ovaMatch) {
                episode = ovaMatch.pop().match(/\d+(?=\.)/)[0];
            }
        }

        if ((season === 1 || season === "01") && !episode) {
            const epMatch = input.match(/\bep(\d+)\b/g) || input.match(/(?<=_)ep\d+(?=_)/g) || input.match(/(?<=\s)episode\s\d+(?=\.)/g);
            if (epMatch && epMatch.length === 1) {
                season = '1';
                episode = epMatch[0].replace('episode ', '').replace('ep', '');
            }
        }

        if ((season === 1 || season === "01") && (episode === 0 || episode === "00" || episode === "")) {
            const decodeLink = getDecodedLink(input);
            const seMatch = decodeLink.match(/s\d+\s*([-.])\s*e?\d+/gi);
            if (seMatch) {
                let temp = seMatch.pop();
                if (!decodeLink.includes(temp + 'p')) {
                    const se = temp.split(/[-.]/);
                    season = se[0].toLowerCase().replace('s', '').trim();
                    episode = se[1].toLowerCase().replace('e', '').trim();
                }
            } else {
                const episodeMatch = decodeLink.match(/- e?\d+(\s?[a-d])?\s?[.\[]/gi);
                if (episodeMatch && episodeMatch.length === 1) {
                    season = '1';
                    episode = episodeMatch[0].match(/\d+/)[0];
                } else {
                    const episodeMatch2 = decodeLink.match(/\se\(\d+\)\s/gi);
                    if (episodeMatch2 && episodeMatch2.length === 1) {
                        season = '1';
                        episode = episodeMatch2[0].match(/\d+/)[0];
                    } else if (isLinkInput) {
                        const episodeMatch3 = decodeLink.match(/[a-z]e\d\d?[\s.]/gi);
                        if (episodeMatch3 && episodeMatch3.length === 1) {
                            season = '1';
                            episode = episodeMatch3[0].match(/\d+/)[0];
                        }
                    }
                }
            }
        }

        season = Number(season);
        episode = Number(episode);
        if (season > 2000 && season < 2050) {
            season = 0;
        }
        if (episode > 3000) {
            episode = 0;
        }

        if (isLinkInput && season === 1 && episode === 0) {
            const episodeMatch = input.match(/\.\d\de\d\d\./gi);
            if (episodeMatch) {
                const temp = episodeMatch.pop().replace(/\./g, '').split('e');
                season = Number(temp[0]);
                episode = Number(temp[1]);
            }
            const seasonMatch = input.match(/\/s\d+\//gi)?.pop().match(/\d+/)[0];
            if (seasonMatch) {
                season = Number(seasonMatch);
            }
        }
        return {season, episode, isNormalCase: false};
    } catch (error) {
        saveError(error);
        return {season: 0, episode: 0, isNormalCase: false}
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
        isBetter = (x265 && !prevX265 && !prevBit10) || (bit10 && !prevBit10);
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

export function removeDuplicateLinks(input, replaceInfo = false, replaceBadInfoOnly = false) {
    let result = [];
    for (let i = 0; i < input.length; i++) {
        let exist = false;
        for (let j = 0; j < result.length; j++) {
            if (
                (input[i].link || input[i].url) === (result[j].link || result[j].url)
            ) {
                if (replaceInfo && input[i].info.length > result[j].info.length) {
                    if (replaceBadInfoOnly) {
                        if (
                            (input[i].info.match(/^\d\d\d\d?p/) && !result[j].info.match(/^\d\d\d\d?p/)) ||
                            (!input[i].info.match(/[\u0600-\u06FF]/) && result[j].info.match(/[\u0600-\u06FF]/))
                        ) {
                            result[j].info = input[i].info;
                        }
                    } else {
                        result[j].info = input[i].info;
                    }
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
        minutes: Number(minutes.toFixed(2)),
        hours: Number(hours.toFixed(2)),
        days: Number(days.toFixed(2)),
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

export function getDayOfYear(now) {
    let now_utc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    let start_utc = Date.UTC(now.getFullYear(), 0, 0);
    let oneDay = 1000 * 60 * 60 * 24;
    return Math.ceil((now_utc - start_utc) / oneDay);
}
