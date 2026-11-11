const API_PREFIX = '/api';

async function getErrorMessage(response) {
  try {
    const body = await response.json();
    return body.error?.message || 'Não foi possível concluir a solicitação.';
  } catch {
    return 'Não foi possível concluir a solicitação.';
  }
}

async function request(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }
  return response;
}

export async function getDocuments() {
  const response = await request(`${API_PREFIX}/documents`);
  const body = await response.json();
  return body.data;
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await request(`${API_PREFIX}/upload`, {
    method: 'POST',
    body: formData,
  });
  const body = await response.json();
  return body.data;
}

export async function downloadDocument(document) {
  const response = await request(
    `${API_PREFIX}/documents/${encodeURIComponent(document.id)}/download`,
  );
  const blob = await response.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = downloadUrl;
  link.download = document.originalName;
  window.document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(downloadUrl);
}