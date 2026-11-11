const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const express = require('express');
const multer = require('multer');
const documentController = require('../controllers/documentController');

const router = express.Router();
const storageDirectory = path.resolve(__dirname, '../../storage');
const storageErrorCodes = new Set([
  'EACCES',
  'EIO',
  'EISDIR',
  'EMFILE',
  'ENFILE',
  'ENOENT',
  'ENOSPC',
  'ENOTDIR',
  'EPERM',
  'EROFS',
]);
const defaultMaxUploadSize = 10 * 1024 * 1024;
const configuredMaxUploadSize = Number(process.env.MAX_UPLOAD_SIZE_BYTES);
const maxUploadSize = Number.isSafeInteger(configuredMaxUploadSize)
  && configuredMaxUploadSize > 0
  ? configuredMaxUploadSize
  : defaultMaxUploadSize;

const storage = multer.diskStorage({
  destination(req, file, callback) {
    fs.mkdir(storageDirectory, { recursive: true })
      .then(() => callback(null, storageDirectory))
      .catch((error) => {
        error.storageFailure = true;
        callback(error);
      });
  },
  filename(req, file, callback) {
    callback(null, crypto.randomUUID());
  },
});

const upload = multer({
  storage,
  limits: { fileSize: maxUploadSize },
});

function parseSingleFile(req, res, next) {
  upload.single('file')(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      error.statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      error.apiCode = error.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'INVALID_MULTIPART';
    } else if (error.storageFailure || storageErrorCodes.has(error.code)) {
      error.statusCode = 500;
      error.apiCode = 'STORAGE_ERROR';
    } else {
      error.statusCode = 400;
      error.apiCode = 'INVALID_MULTIPART';
    }

    return next(error);
  });
}

router.post('/upload', parseSingleFile, documentController.upload);
router.get('/documents', documentController.list);
router.get('/documents/:id/download', documentController.download);

module.exports = router;