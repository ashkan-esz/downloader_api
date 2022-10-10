import multer from "multer";
import multerS3 from 'multer-s3';
import {bucketNamesObject, getS3Client} from "../../data/cloudStorage.js";


const multerStorage = multerS3({
    s3: getS3Client(),
    bucket: bucketNamesObject.profileImage,
    acl: 'public-read',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
        cb(null, {fieldName: file.fieldname});
    },
    key: function (req, file, cb) {
        let type = file.mimetype === 'image/png' ? 'png' : 'jpg';
        cb(null, `user-${req.jwtUserData.userId}-${Date.now()}.${type}`);
    }
});

const multerFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true);
    } else {
        cb(new Error('Not an supported format image! Please upload an jpg/jpeg/png image'), false);
    }
};

const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter,
    limits: {
        fileSize: 1.05 * 1024 * 1024 //1mb
    },
});

const singleUpload = upload.single('profileImage');

export default singleUpload;
