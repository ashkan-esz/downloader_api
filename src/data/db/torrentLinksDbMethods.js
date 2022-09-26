import getCollection from "../mongoDB.js";
import {saveError} from "../../error/saveError.js";

export async function addNewLink(downloadLink, linkType = 'direct', fileName = '', size = 0) {
    try {
        let collection = await getCollection('torrentLinks');
        let linkData = createLinkData(downloadLink, linkType, fileName, size);
        let res = await collection.updateOne({
            downloadLink: downloadLink,
        }, {
            $setOnInsert: linkData,
        }, {
            upsert: true
        });

        if (res.matchedCount === 1) {
            return 'already exist';
        }
        if (res.upsertedCount === 1) {
            return 'inserted';
        }
        return 'notfound';
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

function createLinkData(downloadLink, linkType = 'direct', fileName = '', size = 0) {
    return ({
        fileName: fileName,
        size: size,
        addDate: new Date(),
        startDownload: '',
        endDownload: '',
        downloadLink: downloadLink,
        linkType: linkType,
        isDownloading: false,
        startUpload: '',
        endUpload: '',
        uploadLink: '',
        isUploading: false,
    });
}
