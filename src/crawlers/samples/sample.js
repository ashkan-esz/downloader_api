import fs from 'fs';
import {getTitleAndYear} from "../utils";
import {saveError} from "../../error/saveError";
import * as Path from "path";
import {fileURLToPath} from "url";


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

export async function checkPrevTitleWithNewMethod() {
    try {
        let titles = await getSampleTitles();
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
                console.log('-------------------------');
                counter++;
            }
        }
        return counter;
    } catch (error) {
        saveError(error);
    }
}

export async function getSampleTitles() {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = Path.dirname(__filename);
        const pathToTitles = Path.join(__dirname, 'titles');
        const files = fs.readdirSync(pathToTitles);
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
