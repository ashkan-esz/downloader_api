import fs from "fs";
import Path from "path";
import JSZip from 'jszip';
import {saveError} from "../../error/saveError.js";

const _fileSizeLimit = 20 * 1024 * 1024;

export async function getDataFileIndex(pathToFiles, sourceName, pageLink) {
    let folderPath = Path.join(pathToFiles, sourceName);
    let indexFilePath = Path.join(folderPath, sourceName + '_index.json');
    if (!fs.existsSync(folderPath)) {
        //create folder for source
        await fs.promises.mkdir(folderPath);
    }
    if (fs.existsSync(indexFilePath)) {
        let indexFile = await fs.promises.readFile(indexFilePath, 'utf8');
        let indexes = JSON.parse(indexFile);
        pageLink = decodeURIComponent(pageLink.replace(/\/$/, '').split('/').pop());
        let findIndex = indexes.find(item => item.link === pageLink);
        if (findIndex) {
            return {
                exist: true,
                index: findIndex.index,
            }
        } else {
            return {
                exist: false,
                index: indexes.sort((a, b) => a.index - b.index).pop()?.index || 1,
            }
        }
    } else {
        //create index file and first data file
        await fs.promises.writeFile(indexFilePath, JSON.stringify([]), 'utf8');
        let dataFilePath = Path.join(folderPath, sourceName + '_1.json');
        await fs.promises.writeFile(dataFilePath, JSON.stringify([]), 'utf8');
        return {
            exist: false,
            index: 1,
        }
    }
}

export async function updateSampleData(pathToFiles, sourceName, pageLink, data, fileIndex, updateFieldNames = []) {
    const pathToFile = getPathToFile(pathToFiles, sourceName, fileIndex);
    let samplesFile = await readFile(pathToFile);
    let samples = JSON.parse(samplesFile);
    let link = pageLink.replace(/\/$/, '').split('/').pop();
    for (let i = 0; i < samples.length; i++) {
        if (samples[i].pageLink.replace(/\/$/, '').split('/').pop() === link) {
            if (updateFieldNames.length === 0) {
                samples[i] = data;
            } else {
                for (let j = 0; j < updateFieldNames.length; j++) {
                    samples[i][updateFieldNames[j]] = data[updateFieldNames[j]];
                }
            }

            let stringifySamples = JSON.stringify(samples);
            if (pathToFile.endsWith(".zip")) {
                await createZipFile(pathToFile, stringifySamples);
            } else {
                if (stringifySamples.length >= _fileSizeLimit) {
                    await convertJsonToZip(pathToFile, stringifySamples);
                } else {
                    await fs.promises.writeFile(pathToFile, stringifySamples, 'utf8');
                }
            }
            break;
        }
    }
}

export async function saveNewSampleData(pathToFiles, sourceName, data, lastFileIndex) {
    const pathToFile = getPathToFile(pathToFiles, sourceName, lastFileIndex);
    //check last data file reached file size limit
    let fileStats = await fs.promises.stat(pathToFile);
    if (fileStats.size < _fileSizeLimit && !pathToFile.endsWith(".zip")) {
        //good
        let samplesFile = await fs.promises.readFile(pathToFile, 'utf8');
        let samples = JSON.parse(samplesFile);
        samples.push(data);
        await Promise.all([
            fs.promises.writeFile(pathToFile, JSON.stringify(samples), 'utf8'),
            updateIndexFile(pathToFiles, sourceName, data.pageLink, lastFileIndex),
        ]);
        fileStats = await fs.promises.stat(pathToFile);
        if (fileStats.size >= _fileSizeLimit) {
            await convertJsonToZip(pathToFile);
        }
    } else {
        if (!pathToFile.endsWith(".zip")) {
            await convertJsonToZip(pathToFile);
        }
        const pathToNewFile = Path.join(pathToFiles, sourceName, `${sourceName}_${lastFileIndex + 1}.json`);
        await Promise.all([
            fs.promises.writeFile(pathToNewFile, JSON.stringify([data]), 'utf8'),
            updateIndexFile(pathToFiles, sourceName, data.pageLink, lastFileIndex + 1),
        ]);
    }
}

async function updateIndexFile(pathToFiles, sourceName, pageLink, index) {
    let indexFilePath = Path.join(pathToFiles, sourceName, sourceName + '_index.json');
    let indexFile = await fs.promises.readFile(indexFilePath, 'utf8');
    let indexes = JSON.parse(indexFile);
    indexes.push({
        link: decodeURIComponent(pageLink.replace(/\/$/, '').split('/').pop()),
        index: index,
    });
    await fs.promises.writeFile(indexFilePath, JSON.stringify(indexes), 'utf8');
}

export async function getDataFiles(pathToFiles, sourceNames = null) {
    try {
        let dirs = await fs.promises.readdir(pathToFiles);
        let folderCheckPromises = await Promise.allSettled(dirs.map(async d => (await fs.promises.lstat(Path.join(pathToFiles, d))).isDirectory()));
        let folders = dirs.filter((d, index) => folderCheckPromises[index].value);
        if (sourceNames) {
            folders = folders.filter(item => sourceNames.includes(item));
        }
        let readFilesPromises = await Promise.allSettled(folders.map(async d => await fs.promises.readdir(Path.join(pathToFiles, d))));
        let files = readFilesPromises.map(item => item.value).flat(1);
        return files.filter(file => !file.includes('_index'));
    } catch (error) {
        saveError(error);
        return [];
    }
}

export async function getSamplesFromFiles(pathToFiles, files) {
    let paths = files.map(f => Path.join(pathToFiles, f.split('_')[0], f));

    let samples = [];
    let promiseArray = [];
    for (let i = 0; i < files.length; i++) {
        let temp = readFile(paths[i]).then((f) => {
            let t = JSON.parse(f).map(item => {
                item.sourceName = files[i].split('_')[0];
                return item;
            });
            samples = samples.concat(...t);
        });
        promiseArray.push(temp);
    }
    await Promise.allSettled(promiseArray);
    return samples;
}

async function readFile(path) {
    if (path.endsWith('.zip')) {
        const zip = new JSZip();
        let zipFile = await fs.promises.readFile(path);
        let temp = await zip.loadAsync(zipFile);
        return await temp.file(path.split('/').pop().replace('.zip', '.json')).async("string");
    } else {
        return await fs.promises.readFile(path, 'utf8');
    }
}

function getPathToFile(pathToFiles, sourceName, fileIndex) {
    let pathToFile = Path.join(pathToFiles, sourceName, `${sourceName}_${fileIndex}.json`);
    if (!fs.existsSync(pathToFile)) {
        pathToFile = pathToFile.replace('.json', '.zip');
    }
    return pathToFile;
}

async function convertJsonToZip(pathToFile, content = null) {
    const zip = new JSZip();
    content = content || await fs.promises.readFile(pathToFile, 'utf8');
    zip.file(pathToFile.split('/').pop(), content);
    let zipFile = await zip.generateAsync({type: "nodebuffer", compression: "DEFLATE"});
    await Promise.all([
        fs.promises.writeFile(pathToFile.replace('.json', '.zip'), zipFile),
        fs.promises.rm(pathToFile),
    ]);
}

async function createZipFile(pathToFile, content) {
    const zip = new JSZip();
    zip.file(pathToFile.split('/').pop().replace('.zip', '.json'), content);
    let zipFile = await zip.generateAsync({type: "nodebuffer", compression: "DEFLATE"});
    await fs.promises.writeFile(pathToFile, zipFile);
}
