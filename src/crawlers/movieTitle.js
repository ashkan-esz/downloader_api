import {wordsToNumbers} from "words-to-numbers";
import * as persianRex from "persian-rex";
import {replacePersianNumbers, replaceSpecialCharacters} from "./utils/utils.js";
import {saveError} from "../error/saveError.js";


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

        let yearMatch = title.match(/(?<!(to|of))\s\d\d\d\d$/g);
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

export function purgeTitle(title, type, keepLastNumber = true) {
    let currentYear = new Date().getFullYear();
    let titleIncludesSeason = title.includes('فصل');
    title = replacePersianNumbers(title);
    const savedTitle = title;
    title = title
        .replace(/\d%/, (res) => res.replace('%', 'percent'))
        .replace(/\d+\.0/, res => res.replace('.0', ''));
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

    title_array = purgeTitle_handleBasCases(title_array);

    return title_array;
}

export function purgeTitle_handleBasCases(title_array) {
    if (title_array.length > 2) {
        //case: [ 'weeks', 'later', '2007', '28' ] ---> [ '28', 'weeks', 'later', '2007' ]
        //case: [ 'to', '7', '2014', '5', '7' ] ---> [ '5', 'to', '7', '2014', '5', '7' ]

        let firstPart = title_array[0];
        let last1 = title_array[title_array.length - 1];
        let last2 = title_array[title_array.length - 2];
        let last3 = title_array[title_array.length - 3];

        if (firstPart === 'weeks' && !isNaN(last1) && checkValidYear(last2)) {
            let number = title_array.pop();
            title_array.unshift(number);
            return title_array;
        } else if (firstPart === 'to' && !isNaN(last1) && checkValidYear(last2)) {
            let number = title_array.pop();
            title_array.unshift(number);
            return title_array;
        } else if (firstPart === 'to' && !isNaN(last1) && !isNaN(last2) && checkValidYear(last3)) {
            title_array.pop();
            title_array.pop();
            title_array.unshift(last2);
            return title_array;
        }
    }
    //--------------------------
    //--------------------------
    if (title_array.length > 3) {
        //case: [ 'sing', '2', '2021', '2', '2' ] ---> [ 'sing', '2', '2021' ]
        //case: [ 'the',   'hunger', 'games', 'mockingjay', 'part',  '2', '2015',  '3', '2' ] ---> [ 'the',   'hunger', 'games', 'mockingjay', 'part',  '2', '2015' ]

        let last1 = title_array[title_array.length - 1];
        let last2 = title_array[title_array.length - 2];
        let last3 = title_array[title_array.length - 3];
        let last4 = title_array[title_array.length - 4];

        if (((last4 === last2 && last2 === last1) || last4 === last1) && checkValidYear(last3)) {
            title_array.pop();
            title_array.pop();
        }
    }
    //--------------------------
    //--------------------------

    title_array = swapMovieNumberAndYear(title_array);

    //--------------------------
    //--------------------------

    title_array = handleDuplicateNumbers(title_array);

    //--------------------------
    //--------------------------
    if (title_array.length > 3) {
        //case: [ 'pvt', 'chat', '2020', 'pvt' ] ---> [ 'pvt', 'chat', '2020']

        let firstPart = title_array[0];
        let last1 = title_array[title_array.length - 1];
        let last2 = title_array[title_array.length - 2];

        if (firstPart === last1 && checkValidYear(last2)) {
            title_array.pop();
        }
    }
    //--------------------------
    //--------------------------

    title_array = handleSpecialCases(title_array);

    //--------------------------
    //--------------------------
    if (title_array.length > 3 && title_array.length % 2 === 0) {
        //case: [ 'brick', 'mansions', '2014', 'brick', 'mansions', '2014' ] ---> [ 'brick', 'mansions', '2014' ]

        if (checkValidYear(title_array[(title_array.length / 2) - 1])) {
            let duplicate = true;
            for (let i = 0; i < title_array.length / 2; i++) {
                let part1 = title_array[i];
                let part2 = title_array[i + title_array.length];
                if (part1 === part2) {
                    duplicate = false;
                    break;
                }
            }
            if (duplicate) {
                title_array = title_array.slice(0, title_array.length / 2);
            }
        }
    }
    //--------------------------
    //--------------------------

    title_array = handleDuplicateYears(title_array);

    //--------------------------
    //--------------------------

    return title_array;
}

//------------------------------------------
//------------------------------------------

function swapMovieNumberAndYear(title_array) {
    if (title_array.length > 2) {
        //swap movie number and year
        //case: [ 'debt', 'collectors', '2020', '2', '2' ] ---> [ 'debt', 'collectors', '2', '2020' ]
        //case: [ 'torpedo', '2019', '235' ] ---> [ 'torpedo', '235', '2019' ]

        let last1 = title_array[title_array.length - 1];
        let last2 = title_array[title_array.length - 2];
        let last3 = title_array[title_array.length - 3];
        let last4 = title_array[title_array.length - 4];

        if (isNaN(last4) && last2 === last1 && checkValidYear(last3)) {
            title_array.pop();
            title_array.pop();
            title_array[title_array.length - 1] = last1;
            title_array.push(last3);
        } else if (isNaN(last3) && !isNaN(last1) && checkValidYear(last2)) {
            //case : wonder woman 1984 2020
            if (!checkValidYear(last1) || Number(last2) > Number(last1) + 6) {
                title_array.pop();
                title_array.pop();
                title_array.push(last1);
                title_array.push(last2);
            }
        }
    }
    return title_array;
}

function handleDuplicateNumbers(title_array) {
    if (title_array.length > 3) {
        //case: [ 'runway', '34', '2022', '34' ] ---> [ 'runway', '34', '2022']
        //case: [ 'algorithm', 'bliss', '2020', 'bliss' ] ---> [ 'algorithm', 'bliss', '2020' ]
        //case: [ 'district', '13', 'ultimatum', '13', '2009' ] ---> [ 'district', '13', 'ultimatum', '2009' ]
        //case: [ 'district', 'b13', '13', '2004' ] ---> [ 'district', 'b13', '2004' ]
        //case: [ 'halloween', 'h20', '20', 'years', 'later', '20', '1998' ] ---> [ 'halloween', 'h20', '20', 'years', 'later', '1998' ]
        //case: [ 'salo', 'or', 'the', '120', 'days', 'of', 'sodom', '120', '1975' ] ---> [ 'salo', 'or', 'the', '120', 'days', 'of', 'sodom', '1975' ]
        //case: [ 'mob', 'psycho', '100', '100' ] ---> [ 'mob', 'psycho', '100' ]

        let second = title_array[1];
        let third = title_array[2];
        let last1 = title_array[title_array.length - 1];
        let last2 = title_array[title_array.length - 2];
        let last3 = title_array[title_array.length - 3];
        let last4 = title_array[title_array.length - 4];

        if (last3 === last1 && checkValidYear(last2)) {
            title_array.pop();
        } else if (
            checkValidYear(last1) && (
                (last4 === last2 && !isNaN(last4)) || (title_array.length > 3 && second === last2 && !isNaN(second)) || (title_array.length > 4 && third === last2 && !isNaN(third))
            )
        ) {
            title_array.pop(); // 2009
            title_array.pop(); // 13
            title_array.push(last1); // 2009
        } else if (!isNaN(last1) && !isNaN(last2) && (last3.length === last2.length + 1 && last3.includes(last2)) && checkValidYear(last1)) {
            title_array.pop(); //2004
            title_array.pop(); // 13
            title_array.push(last1); // 2004
        } else if (checkValidYear(last1)) {
            let match = title_array.join(' ').match(/(?<!(of)) the \d{1,4}/g);
            if (match) {
                let number = match.pop().replace('the', '').trim();
                let numberIndex = title_array.indexOf(number);
                if (number === last2 && numberIndex !== title_array.length - 2) {
                    title_array.pop(); // 1975
                    title_array.pop(); // 120
                    title_array.push(last1); // 1975
                }
            }
        } else if (last1 === last2 && !checkValidYear(last1) && !title_array.slice(0, title_array.length - 2).find(item => !isNaN(item))) {
            //case: [ 'mob', 'psycho', '100', '100' ] ---> [ 'mob', 'psycho', '100' ]
            title_array.pop();
            title_array.pop();
        }
    }
    return title_array;
}

function handleSpecialCases(title_array) {
    if (title_array.length > 2) {
        //case: [ '36 th', 'precinct', '36', '2004' ] ---> [ '36th', 'precinct', '2004' ]
        //case: [ 'the', '24th', '24', '2020' ] ---> [ 'the', '24th', '2020' ]
        //case: [ 'paris', '13th', 'district', '2021', '13' ] ---> [ 'paris', '13th', 'district', '2021' ]
        //case: [ 'oslo', 'august', '31st', '31', '2011' ] ---> [ 'oslo', 'august', '31st', '2011' ]
        //case: [ 'the', 'edge', 'of', 'seventeen', '2016', '17' ] ---> [ 'the', 'edge', 'of', 'seventeen', '2016' ]
        //case: [ 'the', 'edge', 'of', 'seventeen', '17', '2016' ] ---> [ 'the', 'edge', 'of', 'seventeen', '2016' ]

        let firstPart = title_array[0];
        let secondPart = title_array[1];
        let last1 = title_array[title_array.length - 1];
        let last2 = title_array[title_array.length - 2];
        let last3 = title_array[title_array.length - 3];
        let last3_wordNumber = wordsToNumbers(last3).toString();

        if (firstPart.match(/^\d+ th$/) && !isNaN(last2) && firstPart.replace(' th', '') === last2 && checkValidYear(last1)) {
            title_array[0] = title_array[0].replace(' ', '');
            title_array.pop(); //2004
            title_array.pop(); //36
            title_array.push(last1); //2004
        } else if (secondPart.match(/^\d+\s?th$/) && secondPart.replace('th', '').trim() === last2 && checkValidYear(last1)) {
            title_array.pop(); //2020
            title_array.pop(); //24
            title_array.push(last1); //2020
        } else if (last3.match(/^\d+\s?st$/) && last3.replace('st', '').trim() === last2 && checkValidYear(last1)) {
            title_array.pop(); //2011
            title_array.pop(); //31
            title_array.push(last1); //2011
        } else if (!isNaN(last3_wordNumber) && last3_wordNumber === last1 && checkValidYear(last2)) {
            title_array.pop();
        } else if (!isNaN(last3_wordNumber) && last3_wordNumber === last2 && checkValidYear(last1)) {
            let year = title_array.pop();
            title_array[title_array.length - 1] = year;
        }
    }
    return title_array;
}

function handleDuplicateYears(title_array) {
    if (title_array.length > 3) {
        //case: [ 'the', 'good', 'the', 'bad', 'and', 'the', 'ugly', '1966', '1966' ] ---> [ 'the', 'good', 'the', 'bad', 'and', 'the', 'ugly', '1966' ]
        //case: [ 'death', 'to', '2020', '2020' ] ---> [ 'death', 'to', '2020', '2020' ]
        //case: [ 'homeschool', 'musical', 'class', 'of', '2020', '2020' ] ---> [ 'homeschool', 'musical', 'class', 'of', '2020', '2020' ]

        let last1 = title_array[title_array.length - 1];
        let last2 = title_array[title_array.length - 2];
        let last3 = title_array[title_array.length - 3];

        if (isNaN(last3) && last3 !== 'to' && last3 !== 'of' && last2 === last1 && checkValidYear(last2)) {
            title_array.pop();
        }
    }
    //--------------------------
    //--------------------------
    if (title_array.length > 5) {
        //case: ['the', 'taking', 'of', 'pelham', '1', '2', '3', '2009', '123', '1', '2', '3', '123'] ---> ['the', 'taking', 'of', 'pelham', '1', '2', '3', '2009']

        let temp = title_array.join(' ');
        let match = temp.match(/\d{1,3} \d{1,3} \d\d\d\d \d{1,3} \d{1,3}/g);
        if (match) {
            let year = match.pop().match(/\d\d\d\d/g).pop();
            let yearIndex = title_array.indexOf(year);
            title_array = title_array.slice(0, yearIndex + 1);
        }
    }

    return title_array;
}

function checkValidYear(input) {
    const currentYear = new Date().getFullYear();
    return (!isNaN(input) && Number(input) > 1900 && Number(input) <= currentYear);
}
