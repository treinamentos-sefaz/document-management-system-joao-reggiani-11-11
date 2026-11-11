const documents = new Map();

function add(document) {
  documents.set(document.id, document);
  return document;
}

function list() {
  return Array.from(documents.values())
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