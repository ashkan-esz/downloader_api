import fs from 'fs';
import {getTitleAndYear} from "../movieTitle.js";
import {saveError} from "../../error/saveError.js";
import * as Path from "path";
import {fileURLToPath} from "url";
import inquirer from 'inquirer';


export async function saveSampleTitle(sourceName, originalTitle, title, originalType, type, year, replace = false) {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = Path.dirname(__filename);
        const pathToTitles = Path.join(__dirname, 'titles');
        const files = fs.readdirSync(pathToTitles);
        if (files.includes(`${sourceName}.json`)) {
            const pathToFile = Path.join(pathToTitles, `${sourceName}.json`);
            let titlesFile = fs.readFileSync(pathToFile, 'utf8');
            let titles = JSON.parse(titlesFile);
            let found = false;
            for (let i = 0; i < titles.length; i++) {
                if (titles[i].originalTitle === originalTitle) {
                    if (replace && (
                        titles[i].title !== title || titles[i].originalType !== originalType || titles[i].type !== type)
                    ) {
                        titles[i].title = title;
                        titles[i].originalType = originalType;
                        titles[i].type = type;
                        fs.writeFileSync(pathToFile, JSON.stringify(titles), 'utf8');
                    }
                    found = true;
                    break;
                }
            }
            if (!found) {
                const newSampleTitle = {
                    originalTitle, title,
                    originalType, type,
                    year
                }
                titles.push(newSampleTitle);
                fs.writeFileSync(pathToFile, JSON.stringify(titles), 'utf8');
            }
        } else {
            //create file
            const newSampleTitle = {
                originalTitle, title,
                originalType, type,
                year
            }
            const pathToFile = Path.join(pathToTitles, `${sourceName}.json`);
            fs.writeFileSync(pathToFile, JSON.stringify([newSampleTitle]), 'utf8');
        }
    } catch (error) {
        saveError(error);
    }
}

export async function checkPrevTitleWithNewMethod(sourceName = null, updateData = false) {
    try {
        let sourceFileName = !sourceName ? null : sourceName + '.json';
        let titles = await getSampleTitles(sourceFileName);
        let counter = 0;
        for (let i = 0; i < titles.length; i++) {
            const {
                title: newTitle,
                year: newYear
            } = getTitleAndYear(titles[i].originalTitle, titles[i].year, titles[i].type);

            if (
                titles[i].title.replace(' collection', '') !== newTitle.replace(' collection', '') ||
                (titles[i].year !== newYear && newYear)
            ) {
                console.log(titles[i].sourceName, '|', titles[i].originalTitle, '|', titles[i].type);
                console.log(`prev state    --> title: ${titles[i].title}, year: ${titles[i].year}`);
                console.log(`current state --> title: ${newTitle}, year: ${newYear}`);
                counter++;

                if (updateData) {
                    const questions = [
                        {
                            type: 'input',
                            name: 'ans',
                            message: "update this movie data? (y/n)",
                        },
                    ];
                    let answers = await inquirer.prompt(questions);
                    if (answers.ans.toLowerCase() === 'y') {
                        await updateMovieData(titles[i], newTitle, newYear);
                    }
                }
                console.log('-------------------------');
            }
        }
        console.log('-------------END-----------');
        return counter;
    } catch (error) {
        saveError(error);
    }
}

async function updateMovieData(movieData, newTitle, newYear) {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = Path.dirname(__filename);
        const pathToTitles = Path.join(__dirname, 'titles');
        const pathToFile = Path.join(pathToTitles, `${movieData.sourceName}.json`);
        let titlesFile = fs.readFileSync(pathToFile, 'utf8');
        let titles = JSON.parse(titlesFile);

        for (let i = 0; i < titles.length; i++) {
            if (
                titles[i].originalTitle === movieData.originalTitle &&
                titles[i].title === movieData.title &&
                titles[i].originalType === movieData.originalType &&
                titles[i].type === movieData.type &&
                titles[i].year === movieData.year
            ) {
                titles[i].title = newTitle;
                titles[i].year = newYear;
                fs.writeFileSync(pathToFile, JSON.stringify(titles), 'utf8');
                break;
            }
        }
    } catch (error) {
        saveError(error);
    }
}

export async function getSampleTitles(sourceNames = null) {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = Path.dirname(__filename);
        const pathToTitles = Path.join(__dirname, 'titles');
        let files = fs.readdirSync(pathToTitles);
        if (sourceNames) {
            files = files.filter(item => sourceNames.includes(item))
        }
        let titles = [];
        let promiseArray = [];
        for (let i = 0; i < files.length; i++) {
            const pathToFile = Path.join(pathToTitles, files[i]);
            let temp = fs.promises.readFile(pathToFile, 'utf8').then((f) => {
                let t = JSON.parse(f);
                t = t.map(item => {
                    item.sourceName = files[i].split('.')[0];
                    return item;
                });
                titles = titles.concat(...t);
            });
            promiseArray.push(temp);
        }
        await Promise.allSettled(promiseArray);
        return titles;
    } catch (error) {
        saveError(error);
        return 'error';
    }
}
