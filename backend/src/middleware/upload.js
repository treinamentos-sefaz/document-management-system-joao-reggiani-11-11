const crypto = require('node:crypto');
const multer = require('multer');
const localFileRepository = require('../repositories/localFileRepository');

const defaultMaxUploadSize = 10 * 1024 * 1024;
const configuredMaxUploadSize = Number(process.env.MAX_UPLOAD_SIZE_BYTES);
const maxUploadSize = Number.isSafeInteger(configuredMaxUploadSize)
  && configuredMaxUploadSize > 0
  ? configuredMaxUploadSize
  : defaultMaxUploadSize;
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
const malformedMultipartMessages = new Set([
  'Malformed part header',
  'Multipart: Boundary not found',
  'Unexpected end of file',
  'Unexpected end of form',
]);

const storage = multer.diskStorage({
  destination(req, file, callback) {
    localFileRepository.ensureStorageDirectory()
      .then((directory) => callback(null, directory))
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
  limits: {
    fileSize: maxUploadSize,
    files: 1,
    fields: 0,
    fieldNameSize: 100,
  },
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
    } else if (error.status === 400 || error.statusCode === 400
      || malformedMultipartMessages.has(error.message)) {
      error.statusCode = 400;
      error.apiCode = 'INVALID_MULTIPART';
    } else {
      error.statusCode = 500;
      error.apiCode = 'INTERNAL_ERROR';
    }

    return next(error);
  });
}

module.exports = parseSingleFile;