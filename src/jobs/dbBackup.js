import fs from "fs";
import prisma from "../data/prisma.js";
import {updateCronJobsStatus} from "../utils/cronJobsStatus.js";
import {saveError} from "../error/saveError.js";
import * as zlib from "zlib";
import crypto from "crypto";
import config from "../config/index.js";
import {getDatesBetween} from "../crawlers/utils/utils.js";
import {
    getDbBackupFile,
    getDbBackupFilesList,
    removeDbBackupFileFromS3,
    uploadDbBackupFileToS3
} from "../data/cloudStorage.js";

try {
    await fs.promises.mkdir('./db-backups');
} catch (error) {
}

const backupDir = './db-backups';
const _daysToKeepBackUpFiles = 7;

export default function (agenda) {
    agenda.define("backup db", {concurrency: 1}, async (job) => {
        await backupDbJobFunc();
    });
}

export async function backupDbJobFunc() {
    try {
        updateCronJobsStatus('backupDb', 'start');

        updateCronJobsStatus('backupDb', 'removing old backups');
        await removeOldBackups();

        const dateString = new Date().toISOString();
        BigInt.prototype.toJSON = function () {
            return this.toString()
        }

        const modelNames = [
            'movieSettings', 'activeSession', 'downloadLinksSettings', 'notificationSettings',
            'computedFavoriteGenres', 'user', 'profileImage',
            'watchListMovie', 'watchedMovie', 'likeDislikeMovie', 'followMovie', 'relatedMovie',
            'watchListGroup', 'userCollectionMovie', 'userCollection', 'movie',
            'character', 'credit', 'staff', 'castImage', 'likeDislikeStaff',
            'likeDislikeCharacter', 'followStaff', 'favoriteCharacter',
        ];
        for (let i = 0; i < modelNames.length; i++) {
            updateCronJobsStatus('backupDb', modelNames[i] + ': downloading');
            let data = await prisma[modelNames[i]].findMany();
            updateCronJobsStatus('backupDb', modelNames[i] + ': stringify');
            let temp = JSON.stringify(data);
            await new Promise((resolve, reject) => {
                updateCronJobsStatus('backupDb', modelNames[i] + ': compress with gzip');
                zlib.gzip(temp, async (error, compressedData) => {
                    if (error) {
                        saveError(error);
                        return reject(error);
                    }

                    updateCronJobsStatus('backupDb', modelNames[i] + ': encrypting data');
                    const password = config.dataBases.backupPassword;
                    const cipher = crypto.createCipher('aes-256-cbc', password);
                    let encryptedData = cipher.update(compressedData);
                    encryptedData = Buffer.concat([encryptedData, cipher.final()]);

                    updateCronJobsStatus('backupDb', modelNames[i] + ': write file');
                    const fileName = `backup-${modelNames[i]}-${dateString}.gz`;
                    await fs.promises.writeFile(`${backupDir}/${fileName}`, encryptedData);
                    updateCronJobsStatus('backupDb', modelNames[i] + ': uploading to s3');
                    await uploadDbBackupFileToS3(encryptedData, fileName);
                    return resolve();
                });
            });
        }

        updateCronJobsStatus('backupDb', 'end');
        return {status: 'ok'};
    } catch (error) {
        saveError(error);
        updateCronJobsStatus('backupDb', 'end');
        return {status: 'error'};
    }
}

//----------------------------------------------------------------
//----------------------------------------------------------------

export async function restoreBackupDbJobFunc() {
    try {
        updateCronJobsStatus('restoreBackupDb', 'start');

        updateCronJobsStatus('restoreBackupDb', 'fetching backup files list');
        let s3Files = await getDbBackupFilesList();
        if (s3Files.length === 0) {
            updateCronJobsStatus('restoreBackupDb', 'end');
            return {status: 'ok'};
        }

        updateCronJobsStatus('restoreBackupDb', 'filter last backup files list');
        let lastBackUpDate = s3Files[0].Key.split('-').slice(2).join('-').replace('.gz', '');
        for (let i = 0; i < s3Files.length; i++) {
            let fileDate = s3Files[i].Key.split('-').slice(2).join('-').replace('.gz', '');
            if (getDatesBetween(new Date(fileDate), new Date(lastBackUpDate)).milliseconds > 0) {
                lastBackUpDate = fileDate;
            }
        }
        const backupFiles = s3Files.filter(item => item.Key.includes(lastBackUpDate));

        for (let i = 0; i < backupFiles.length; i++) {
            const modelName = backupFiles[i].Key.split('-')[1];
            updateCronJobsStatus('restoreBackupDb', modelName + ': downloading file');
            const encryptedData = await getDbBackupFile(backupFiles[i].Key);

            updateCronJobsStatus('restoreBackupDb', modelName + ': decrypt file');
            const password = config.dataBases.backupPassword;
            const decipher = crypto.createDecipher('aes-256-cbc', password);
            let decryptedData = decipher.update(encryptedData);
            decryptedData = Buffer.concat([decryptedData, decipher.final()]);

            await new Promise((resolve, reject) => {
                updateCronJobsStatus('restoreBackupDb', modelName + ': gunzip file');
                zlib.gunzip(decryptedData, async (error, uncompressedData) => {
                    if (error) {
                        saveError(error);
                        return reject(error);
                    }

                    updateCronJobsStatus('restoreBackupDb', modelName + ': JSON parse');
                    const data = JSON.parse(uncompressedData);

                    updateCronJobsStatus('restoreBackupDb', modelName + ': adding to db');
                    try {
                        await prisma[modelName].createMany({data: data});
                    } catch (error2) {
                        saveError(error2);
                    }
                    return resolve();
                });
            });
        }

        updateCronJobsStatus('restoreBackupDb', 'end');
        return {status: 'ok'};
    } catch (error) {
        saveError(error);
        updateCronJobsStatus('restoreBackupDb', 'end');
        return {status: 'error'};
    }
}

//----------------------------------------------------------------
//----------------------------------------------------------------

export async function removeOldBackups() {
    try {
        let files = await fs.promises.readdir(backupDir);
        for (let i = 0; i < files.length; i++) {
            let fileDate = files[i].split('-').slice(2).join('-').replace('.gz', '');
            if (getDatesBetween(new Date(), new Date(fileDate)).days >= _daysToKeepBackUpFiles) {
                await fs.promises.unlink(backupDir + '/' + files[i]);
            }
        }

        let s3Files = await getDbBackupFilesList();
        for (let i = 0; i < s3Files.length; i++) {
            let fileDate = s3Files[i].Key.split('-').slice(2).join('-').replace('.gz', '');
            if (getDatesBetween(new Date(), new Date(fileDate)).days >= _daysToKeepBackUpFiles) {
                await removeDbBackupFileFromS3(s3Files[i].Key);
            }
        }
    } catch (error) {
        saveError(error);
    }
}