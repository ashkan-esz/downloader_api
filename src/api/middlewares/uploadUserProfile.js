import multer from "multer";

const multerFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/webp') {
        cb(null, true);
    } else {
        cb(new Error('Not an supported format image! Please upload an jpg/jpeg/png/webp image'), false);
    }
};

const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: multerFilter,
    limits: {
        fileSize: 2.05 * 1024 * 1024 //1mb
    },
});

const singleUpload = upload.single('profileImage');

export default singleUpload;
