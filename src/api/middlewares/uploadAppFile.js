import multer from "multer";
import multerS3 from 'multer-s3';
import {bucketNamesObject, getS3Client} from "../../data/cloudStorage.js";


const multerStorage = multerS3({
    s3: getS3Client(),
    bucket: bucketNamesObject.downloadApp,
    acl: 'public-read',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
        cb(null, {fieldName: file.fieldname});
    },
    key: function (req, file, cb) {
        let type = file.originalname.split('.').pop();
        cb(null, `${req.query.appData.appName}-${req.query.appData.os}@${req.query.appData.version}.${type}`);
    }
});

const multerFilter = (req, file, cb) => {
    if (file.mimetype.includes('application/')) {
        cb(null, true);
    } else {
        cb(new Error('Not an supported format app! Please upload an application file'), false);
    }
};

const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter,
    limits: {
        fileSize: 150 * 1024 * 1024 //150mb
    },
});

const appFileUpload = upload.single('appFile');

export default appFileUpload;
