function sanitizeOriginalName(originalName) {
  const fileName = String(originalName || '')
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 255);

  return fileName || 'document';
}

module.exports = { sanitizeOriginalName };