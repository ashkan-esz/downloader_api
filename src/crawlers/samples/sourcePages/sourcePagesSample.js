import fs from 'fs';
import {getTitleAndYear} from "../../movieTitle.js";
import {saveError} from "../../../error/saveError.js";
import * as Path from "path";
import {fileURLToPath} from "url";
import inquirer from 'inquirer';
import {stringify, parse} from 'zipson';
import {getDataFileIndex, getDataFiles, getSamplesFromFiles, saveNewSampleData, updateSampleData} from "../utils.js";

const __filename = fileURLToPath(import.meta.url);
const pathToFiles = Path.dirname(__filename);

let isFileOpen = false;

async function waitForFileClose() {
    while (isFileOpen) {
        await new Promise(resolve => setTimeout(resolve, 10));
    }
}

export async function saveSourcePageSample(pageContent, sourceData, title, type, year, replace = false) {
    try {
        await waitForFileClose();
        isFileOpen = true;

        if (sourceData.sourceName === 'film2movie') {
            pageContent = pageContent.match(/<article class="box singlepost"(.|\n)+<\/article>/g)?.[0] || pageContent;
            pageContent = pageContent.split(/<div class="recommendations"/g)?.[0] || pageContent;
        }else if (sourceData.sourceName === "bia2hd"){

        }

        pageContent = pageContent
            .replace(/<style(.|\n)+<\/style>/, '')
            .replace(/(style|alt)="([a-zA-Z:\s#%\d;\-_.])*"/g, '')
            .replace(/(width|height)="\d+"/g, '')
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/g, '');

        let data = {
            pageContent,
            pageLink: sourceData.pageLink,
            title, type, year,
        };

        let dataFileIndex = await getDataFileIndex(pathToFiles, sourceData.sourceName, sourceData.pageLink);
        if (dataFileIndex.exist) {
            if (replace) {
                await updateSampleData(pathToFiles, sourceData.sourceName, sourceData.pageLink, data, dataFileIndex.index);
            }
        } else {
            await saveNewSampleData(pathToFiles, sourceData.sourceName, data, dataFileIndex.index);
        }

        isFileOpen = false;
    } catch (error) {
        saveError(error);
        isFileOpen = false;
    }
}

export async function checkPrevTitleWithNewMethod(sourceName = null, updateData = false) {
    //todo : implement
    return -1;
    try {
        let sourceFileName = !sourceName ? null : sourceName + '.json';
        let titles = await getSourcePagesSamples(sourceFileName);
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
                        await updatePageData(titles[i], newTitle, newYear);
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

async function updatePageData(currentSampleData, newValue, fieldName) {
    try {
        //todo : implement
        return -1;
        await waitForFileClose();
        isFileOpen = true;
        const pathToFile = Path.join(pathToFiles, `${currentSampleData.sourceName}.json`);
        let samplesFile = await fs.promises.readFile(pathToFile, 'utf8');
        let samples = parse(samplesFile);

        for (let i = 0; i < samples.length; i++) {
            if (samples[i].pageLink.replace(/\/$/, '').split('/').pop() === currentSampleData.pageLink.replace(/\/$/, '').split('/').pop()) {
                if (fieldName === 'downloadLinks') {
                    samples[i].downloadLinks = newValue;
                } else if (fieldName === 'watchOnlineLinks') {
                    samples[i].watchOnlineLinks = newValue;
                } else {
                    samples[i].subtitles = newValue;
                }
                await fs.promises.writeFile(pathToFile, stringify(samples), 'utf8');
                break;
            }
        }
        isFileOpen = false;
    } catch (error) {
        saveError(error);
        isFileOpen = false;
    }
}

export async function getSourcePagesSamples(sourceNames = null) {
    try {
        await waitForFileClose();
        isFileOpen = true;
        const files = await getDataFiles(pathToFiles, sourceNames);
        const samples = await getSamplesFromFiles(pathToFiles, files);
        isFileOpen = false;
        return samples;
    } catch (error) {
        saveError(error);
        isFileOpen = false;
        return 'error';
    }
}
