const path = require('node:path');
const documentRepository = require('../repositories/documentRepository');
const localFileRepository = require('../repositories/localFileRepository');
const { sanitizeOriginalName } = require('../utils/fileName');

async function createDocument(file) {
  const storagePath = localFileRepository.getStoragePath(file.filename);
  if (!storagePath || path.resolve(file.path) !== storagePath) {
    const error = new Error('Invalid upload storage path.');
    error.statusCode = 500;
    error.apiCode = 'STORAGE_ERROR';
    throw error;
  }

  const document = {
    id: file.filename,
    originalName: sanitizeOriginalName(file.originalname),
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner: 'local',
  };

  try {
    documentRepository.add(document);
    return document;
  } catch (error) {
    await localFileRepository.removeFile(file.filename).catch(() => {});
    error.statusCode = 500;
    error.apiCode = 'STORAGE_ERROR';
    throw error;
  }
}

function listDocuments() {
  return documentRepository.list();
}

async function getDocumentFile(id) {
  const document = documentRepository.findById(id);
  if (!document) {
    return null;
  }

  const storedFile = await localFileRepository.getStoredFile(id);
  if (!storedFile) {
    return null;
  }

  return {
    filePath: storedFile.filePath,
    originalName: document.originalName,
    size: storedFile.size,
  };
}

module.exports = {
  createDocument,
  getDocumentFile,
  listDocuments,
};