const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs/promises');
const path = require('node:path');
const app = require('../src/app');
const { sanitizeOriginalName } = require('../src/utils/fileName');
const localFileRepository = require('../src/repositories/localFileRepository');
const documentRepository = require('../src/repositories/documentRepository');

test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('nomes originais não preservam caminhos nem caracteres de controle', () => {
  assert.strictEqual(sanitizeOriginalName('../../relatorio\n.txt'), 'relatorio.txt');
  assert.strictEqual(sanitizeOriginalName('..\\documento.pdf'), 'documento.pdf');
  assert.strictEqual(sanitizeOriginalName('  \u0000  '), 'document');
});

test('upload, listagem e download seguem os contratos da API', async (context) => {
  const storageDirectory = path.resolve(__dirname, '../storage');
  await fs.mkdir(storageDirectory, { recursive: true });
  const filesBefore = new Set(await fs.readdir(storageDirectory));
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const emptyListResponse = await fetch(`${baseUrl}/documents`);
    assert.strictEqual(emptyListResponse.status, 200);
    assert.deepStrictEqual((await emptyListResponse.json()).data, []);

    const missingFileResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      body: new FormData(),
    });
    assert.strictEqual(missingFileResponse.status, 400);
    assert.strictEqual((await missingFileResponse.json()).error.code, 'FILE_REQUIRED');

    const malformedMultipartResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data; boundary=invalid' },
      body: 'corpo multipart incompleto',
    });
    assert.strictEqual(malformedMultipartResponse.status, 400);
    assert.strictEqual((await malformedMultipartResponse.json()).error.code, 'INVALID_MULTIPART');

    const documentContent = Buffer.from('conteudo de teste');
    const formData = new FormData();
    formData.append('file', new Blob([documentContent]), 'relatorio.txt');
    const uploadResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      body: formData,
    });
    assert.strictEqual(uploadResponse.status, 201);
    const createdDocument = (await uploadResponse.json()).data;
    assert.strictEqual(createdDocument.originalName, 'relatorio.txt');
    assert.strictEqual(createdDocument.size, documentContent.length);
    assert.strictEqual(createdDocument.owner, 'local');
    assert.ok(!Number.isNaN(Date.parse(createdDocument.uploadedAt)));
    assert.strictEqual('storagePath' in createdDocument, false);
    assert.deepStrictEqual(
      await fs.readFile(path.join(storageDirectory, createdDocument.id)),
      documentContent,
    );

    const listResponse = await fetch(`${baseUrl}/documents`);
    assert.strictEqual(listResponse.status, 200);
    assert.deepStrictEqual((await listResponse.json()).data, [createdDocument]);

    const downloadResponse = await fetch(
      `${baseUrl}/documents/${createdDocument.id}/download`,
    );
    assert.strictEqual(downloadResponse.status, 200);
    assert.strictEqual(downloadResponse.headers.get('content-type'), 'application/octet-stream');
    assert.match(downloadResponse.headers.get('content-disposition'), /attachment/);
    assert.match(downloadResponse.headers.get('content-disposition'), /relatorio\.txt/);
    assert.strictEqual(downloadResponse.headers.get('content-length'), String(documentContent.length));
    assert.deepStrictEqual(Buffer.from(await downloadResponse.arrayBuffer()), documentContent);

    const notFoundResponse = await fetch(`${baseUrl}/documents/unknown-id/download`);
    assert.strictEqual(notFoundResponse.status, 404);
    assert.strictEqual((await notFoundResponse.json()).error.code, 'DOCUMENT_NOT_FOUND');

    const traversalResponse = await fetch(
      `${baseUrl}/documents/${encodeURIComponent('../../etc/passwd')}/download`,
    );
    assert.strictEqual(traversalResponse.status, 404);
    assert.strictEqual((await traversalResponse.json()).error.code, 'DOCUMENT_NOT_FOUND');

    await context.test('aceita arquivo um byte abaixo do limite de 10 MB', async () => {
      const content = Buffer.alloc(10 * 1024 * 1024 - 1, 97);
      const formData = new FormData();
      formData.append('file', new Blob([content]), 'limite.bin');
      const response = await fetch(`${baseUrl}/upload`, {
        method: 'POST',
        body: formData,
      });
      assert.strictEqual(response.status, 201);
      const document = (await response.json()).data;
      assert.strictEqual(document.size, content.length);
      const download = await fetch(`${baseUrl}/documents/${document.id}/download`);
      assert.strictEqual(download.status, 200);
      assert.deepStrictEqual(Buffer.from(await download.arrayBuffer()), content);
      const list = await fetch(`${baseUrl}/documents`);
      assert.deepStrictEqual((await list.json()).data, [document, createdDocument]);
    });

    await context.test('rejeita acima de 10 MB sem deixar arquivo ou metadados', async () => {
      const filesBeforeUpload = (await fs.readdir(storageDirectory)).sort();
      const listBefore = await fetch(`${baseUrl}/documents`);
      const documentsBefore = (await listBefore.json()).data;
      const formData = new FormData();
      formData.append('file', new Blob([Buffer.alloc(10 * 1024 * 1024 + 1)]), 'grande.bin');
      const response = await fetch(`${baseUrl}/upload`, {
        method: 'POST',
        body: formData,
      });
      assert.strictEqual(response.status, 413);
      assert.strictEqual((await response.json()).error.code, 'FILE_TOO_LARGE');
      assert.deepStrictEqual((await fs.readdir(storageDirectory)).sort(), filesBeforeUpload);
      const listAfter = await fetch(`${baseUrl}/documents`);
      assert.deepStrictEqual((await listAfter.json()).data, documentsBefore);
    });

    await context.test('rejeita campo incorreto e multiplos arquivos sem residuos', async () => {
      const filesBeforeUpload = (await fs.readdir(storageDirectory)).sort();
      const listBefore = await fetch(`${baseUrl}/documents`);
      const documentsBefore = (await listBefore.json()).data;
      for (const fields of [['document'], ['file', 'file']]) {
        const formData = new FormData();
        for (const field of fields) {
          formData.append(field, new Blob(['conteudo']), 'documento.txt');
        }
        const response = await fetch(`${baseUrl}/upload`, {
          method: 'POST',
          body: formData,
        });
        assert.strictEqual(response.status, 400);
        assert.strictEqual((await response.json()).error.code, 'INVALID_MULTIPART');
        assert.deepStrictEqual((await fs.readdir(storageDirectory)).sort(), filesBeforeUpload);
        const listAfter = await fetch(`${baseUrl}/documents`);
        assert.deepStrictEqual((await listAfter.json()).data, documentsBefore);
      }
    });

    await context.test('retorna 404 quando o arquivo local nao existe mais', async () => {
      await fs.unlink(path.join(storageDirectory, createdDocument.id));
      const response = await fetch(`${baseUrl}/documents/${createdDocument.id}/download`);
      assert.strictEqual(response.status, 404);
      assert.strictEqual((await response.json()).error.code, 'DOCUMENT_NOT_FOUND');
    });

    await context.test('trata falha de armazenamento sem expor detalhes internos', async (subtest) => {
      subtest.mock.method(localFileRepository, 'ensureStorageDirectory', async () => {
        throw new Error('detalhes internos do filesystem');
      });
      const formData = new FormData();
      formData.append('file', new Blob(['conteudo']), 'documento.txt');
      const response = await fetch(`${baseUrl}/upload`, {
        method: 'POST',
        body: formData,
      });
      assert.strictEqual(response.status, 500);
      assert.deepStrictEqual(await response.json(), {
        error: {
          code: 'STORAGE_ERROR',
          message: 'Não foi possível acessar o armazenamento local.',
        },
      });
    });

    await context.test('trata erro inesperado sem expor detalhes internos', async (subtest) => {
      subtest.mock.method(documentRepository, 'list', () => {
        throw new Error('detalhes internos do repositorio');
      });
      const response = await fetch(`${baseUrl}/documents`);
      assert.strictEqual(response.status, 500);
      assert.deepStrictEqual(await response.json(), {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Ocorreu um erro interno.',
        },
      });
    });
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    const filesAfter = await fs.readdir(storageDirectory);
    await Promise.all(filesAfter
      .filter((fileName) => !filesBefore.has(fileName))
      .map((fileName) => fs.rm(path.join(storageDirectory, fileName), { force: true })));
  }
});
