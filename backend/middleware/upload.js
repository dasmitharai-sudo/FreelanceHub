const multer = require('multer');
const path = require('path');
const fs = require('fs');

const isServerless =
  !!process.env.VERCEL ||
  !!process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.NODE_ENV === 'production';

const uploadDir = path.join(__dirname, '../uploads');

let storage;

if (isServerless) {
  // Use memory storage in serverless environments (Vercel has read-only filesystem)
  storage = multer.memoryStorage();
} else {
  try {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    storage = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, uploadDir);
      },
      filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
      }
    });
  } catch (err) {
    console.warn('Upload directory not writable, falling back to memory storage:', err.message);
    storage = multer.memoryStorage();
  }
}

// File filter for safety
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|gif|webp|pdf|doc|docx|zip|rar|txt|mp3|mp4|svg/;
  const extname = allowedExtensions.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype =
    allowedExtensions.test(file.mimetype) ||
    file.mimetype.startsWith('image/') ||
    file.mimetype.startsWith('video/') ||
    file.mimetype.startsWith('audio/') ||
    file.mimetype === 'application/pdf' ||
    file.mimetype === 'application/zip' ||
    file.mimetype === 'application/x-zip-compressed';

  if (extname || mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('File format not supported. Allowed formats: images, pdf, zip, docs, audio, video.'));
  }
};

const baseUpload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max (safe for serverless payloads)
  fileFilter: fileFilter
});

// Middleware to attach dataUrl and URL compatibility to uploaded files
const enrichFiles = (req, res, next) => {
  if (req.file) {
    if (req.file.buffer && !req.file.dataUrl) {
      req.file.dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      req.file.filename = req.file.filename || `${Date.now()}-${req.file.originalname}`;
    }
  }

  if (req.files && Array.isArray(req.files)) {
    req.files.forEach((file) => {
      if (file.buffer && !file.dataUrl) {
        file.dataUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        file.filename = file.filename || `${Date.now()}-${file.originalname}`;
      }
    });
  }

  next();
};

const upload = {
  single: (field) => [baseUpload.single(field), enrichFiles],
  array: (field, maxCount) => [baseUpload.array(field, maxCount), enrichFiles],
  fields: (fields) => [baseUpload.fields(fields), enrichFiles],
  none: () => baseUpload.none()
};

module.exports = upload;
