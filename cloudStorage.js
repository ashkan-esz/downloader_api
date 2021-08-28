const axios = require('axios').default;
const {S3Client, PutObjectCommand} = require('@aws-sdk/client-s3');
const {saveError} = require("./saveError");

const s3 = new S3Client({
    region: 'default',
    forcePathStyle: false,
    endpoint: process.env.CLOUAD_STORAGE_ENDPOINT,
    credentials: {
        accessKeyId: process.env.CLOUAD_STORAGE_ACCESS_KEY,
        secretAccessKey: process.env.CLOUAD_STORAGE_SECRET_ACCESS_KEY,
    },
});

export async function uploadCastImageToS3ByURl(url, fileName, canRetry = true) {
    try {
        let response = await axios.get(url, {
            responseType: "arraybuffer",
            responseEncoding: "binary"
        });
        const params = {
            ContentType: response.headers["content-type"],
            ContentLength: response.data.length.toString(),
            Bucket: 'cast',
            Body: response.data,
            Key: fileName,
            ACL: 'public-read',
        };
        let command = new PutObjectCommand(params);
        await s3.send(command);
        return `https://cast.${process.env.CLOUAD_STORAGE_WEBSITE_ENDPOINT}/${fileName}`;
    } catch (error) {
        if (error.code === 'ENOTFOUND' && canRetry) {
            return await uploadCastImageToS3ByURl(url, fileName, false);
        }
        saveError(error);
        return '';
    }
}
