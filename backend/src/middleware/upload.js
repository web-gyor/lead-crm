const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // FIX: Use a static name so it overwrites if the extension is the same
    // We keep the original extension (e.g., .png, .jpg)
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
    const allowedExtensions = /jpeg|jpg|png|svg/;
    const allowedMimeTypes = /image\/jpeg|image\/jpg|image\/png|image\/svg\+xml/;

    const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimeTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Format Error: Only JPEG, JPG, PNG, and SVG are supported.'));
    }
};

const upload = multer({ 
    storage,
    fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 } 
});

module.exports = upload;