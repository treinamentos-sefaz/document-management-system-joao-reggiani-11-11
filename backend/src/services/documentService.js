const fs = require('node:fs/promises');
const documentRepository = require('../repositories/documentRepository');

async function createDocument(file) {
  const document = {
    id: file.filename,
    originalName: file.originalname,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner: 'local',
  };

  try {
    documentRepository.add(document, file.path);
    return document;
  } catch (error) {
    await fs.unlink(file.path).catch(() => {});
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

  try {
    const fileStats = await fs.stat(document.storagePath);
    if (!fileStats.isFile()) {
      return null;
    }

    return {
      filePath: document.storagePath,
      originalName: document.originalName,
      size: fileStats.size,
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }

    error.statusCode = 500;
    error.apiCode = 'STORAGE_ERROR';
    throw error;
  }
}

module.exports = {
  createDocument,
  getDocumentFile,
  listDocuments,
};