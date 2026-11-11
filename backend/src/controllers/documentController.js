const documentService = require('../services/documentService');

function sendError(res, statusCode, code, message) {
  return res.status(statusCode).json({ error: { code, message } });
}

async function upload(req, res, next) {
  if (!req.file) {
    return sendError(res, 400, 'FILE_REQUIRED', 'Envie um arquivo no campo "file".');
  }

  try {
    const document = await documentService.createDocument(req.file);
    return res.status(201).json({ data: document });
  } catch (error) {
    return next(error);
  }
}

function list(req, res, next) {
  try {
    return res.status(200).json({ data: documentService.listDocuments() });
  } catch (error) {
    error.apiCode = 'INTERNAL_ERROR';
    return next(error);
  }
}

async function download(req, res, next) {
  try {
    const file = await documentService.getDocumentFile(req.params.id);
    if (!file) {
      return sendError(res, 404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
    }

    const downloadName = file.originalName
      .replace(/\\/g, '/')
      .split('/')
      .pop()
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .trim() || 'document';

    res.download(file.filePath, downloadName, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(file.size),
      },
    }, (error) => {
      if (!error) {
        return;
      }
      if (res.headersSent) {
        return next(error);
      }
      if (error.code === 'ENOENT') {
        return sendError(res, 404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
      }
      return next(error);
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  download,
  list,
  upload,
};