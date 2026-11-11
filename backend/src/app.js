const express = require('express');
const documentRoutes = require('./routes/documentRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/', documentRoutes);

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = Number.isInteger(error.statusCode)
    && error.statusCode >= 400
    && error.statusCode <= 599
    ? error.statusCode
    : 500;
  const code = error.apiCode || 'INTERNAL_ERROR';
  const messages = {
    FILE_TOO_LARGE: 'O arquivo excede o limite permitido.',
    INVALID_MULTIPART: 'A requisição de upload é inválida.',
    STORAGE_ERROR: 'Não foi possível acessar o armazenamento local.',
    INTERNAL_ERROR: 'Ocorreu um erro interno.',
  };

  res.status(statusCode).json({
    error: {
      code,
      message: messages[code] || messages.INTERNAL_ERROR,
    },
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

module.exports = app;
