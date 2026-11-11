const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs/promises');
const path = require('node:path');
const app = require('../src/app');

// Teste de fumaça do seed: garante que o app Express foi exportado.
// Novos testes serão adicionados durante os Steps 2, 6 e 7 com auxílio do Copilot.
test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('upload, listagem e download seguem os contratos da API', async () => {
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

    const listResponse = await fetch(`${baseUrl}/documents`);
    assert.strictEqual(listResponse.status, 200);
    assert.deepStrictEqual((await listResponse.json()).data, [createdDocument]);

    const downloadResponse = await fetch(
      `${baseUrl}/documents/${createdDocument.id}/download`,
    );
    assert.strictEqual(downloadResponse.status, 200);
    assert.strictEqual(downloadResponse.headers.get('content-type'), 'application/octet-stream');
    assert.match(downloadResponse.headers.get('content-disposition'), /attachment/);
    assert.deepStrictEqual(Buffer.from(await downloadResponse.arrayBuffer()), documentContent);

    const notFoundResponse = await fetch(`${baseUrl}/documents/unknown-id/download`);
    assert.strictEqual(notFoundResponse.status, 404);
    assert.strictEqual((await notFoundResponse.json()).error.code, 'DOCUMENT_NOT_FOUND');

    const oversizedForm = new FormData();
    oversizedForm.append(
      'file',
      new Blob([Buffer.alloc(10 * 1024 * 1024 + 1)]),
      'grande.bin',
    );
    const oversizedResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      body: oversizedForm,
    });
    assert.strictEqual(oversizedResponse.status, 413);
    assert.strictEqual((await oversizedResponse.json()).error.code, 'FILE_TOO_LARGE');
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
