const express = require('express');
const documentController = require('../controllers/documentController');
const parseSingleFile = require('../middleware/upload');

const router = express.Router();

router.post('/upload', parseSingleFile, documentController.upload);
router.get('/documents', documentController.list);
router.get('/documents/:id/download', documentController.download);

module.exports = router;