import { useRef, useState } from 'react';
import { uploadDocument } from '../services/documentApi.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function UploadComponent({ onUploadSuccess }) {
  const inputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setMessage({ type: 'error', text: 'Selecione um arquivo para enviar.' });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setMessage({ type: 'error', text: 'O arquivo excede o limite de 10 MB.' });
      return;
    }

    setIsUploading(true);
    setMessage(null);
    try {
      await uploadDocument(file);
      inputRef.current.value = '';
      setMessage({ type: 'success', text: `${file.name} enviado com sucesso.` });
      await onUploadSuccess();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="upload-panel" aria-labelledby="upload-heading">
      <div className="upload-copy">
        <span className="section-index">01 / ENVIAR</span>
        <h2 id="upload-heading">Adicionar documento</h2>
        <p>Qualquer formato, até 10 MB.</p>
      </div>
      <form className="upload-form" onSubmit={handleSubmit}>
        <label className="file-picker">
          <span className="file-picker-icon" aria-hidden="true">＋</span>
          <span className="file-picker-text">Escolher arquivo</span>
          <input ref={inputRef} type="file" />
        </label>
        <button className="primary-button" type="submit" disabled={isUploading}>
          {isUploading ? 'Enviando...' : 'Enviar arquivo'}
          <span aria-hidden="true">↗</span>
        </button>
        {message && (
          <p className={`upload-message ${message.type}`} role="status">
            {message.text}
          </p>
        )}
      </form>
    </section>
  );
}