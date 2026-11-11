const documents = new Map();

function add(document, storagePath) {
  documents.set(document.id, { ...document, storagePath });
  return document;
}

function list() {
  return Array.from(documents.values())
    .map(({ storagePath, ...document }) => document)
    .sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt));
}

function findById(id) {
  return documents.get(id) || null;
}

module.exports = {
  add,
  findById,
  list,
};