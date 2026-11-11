const fs = require('node:fs/promises');
const path = require('node:path');

const storageDirectory = path.resolve(__dirname, '../../storage');
const documentIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getStoragePath(id) {
  if (typeof id !== 'string' || !documentIdPattern.test(id)) {
    return null;
  }

  return path.join(storageDirectory, id);
}

async function ensureStorageDirectory() {
  await fs.mkdir(storageDirectory, { recursive: true });
  return storageDirectory;
}

async function removeFile(id) {
  const filePath = getStoragePath(id);
  if (!filePath) {
    return;
  }

  await fs.unlink(filePath).catch((error) => {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  });
}

async function getStoredFile(id) {
  const filePath = getStoragePath(id);
  if (!filePath) {
    return null;
  }

  try {
    const fileStats = await fs.lstat(filePath);
    if (!fileStats.isFile()) {
      return null;
    }

    const [storageRealPath, fileRealPath] = await Promise.all([
      fs.realpath(storageDirectory),
      fs.realpath(filePath),
    ]);
    const relativePath = path.relative(storageRealPath, fileRealPath);
    if (!relativePath || relativePath.startsWith(`..${path.sep}`)
      || relativePath === '..' || path.isAbsolute(relativePath)) {
      return null;
    }

    return { filePath, size: fileStats.size };
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
  ensureStorageDirectory,
  getStoragePath,
  getStoredFile,
  removeFile,
};