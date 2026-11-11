import { useState } from 'react';
import { downloadDocument } from '../services/documentApi.js';

export default function DownloadButton({ document }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');

  async function handleDownload() {
    setIsDownloading(true);
    setError('');
    try {
      await downloadDocument(document);
    } catch (downloadError) {
      setError(downloadError.message);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <span className="download-control">
      <button
        aria-label={`Baixar ${document.originalName}`}
        className="download-button"
        disabled={isDownloading}
        onClick={handleDownload}
        title={isDownloading ? 'Baixando...' : 'Baixar documento'}
        type="button"
      >
        {isDownloading ? '...' : '↓'}
      </button>
      {error && <span className="download-error" role="alert">{error}</span>}
    </span>
  );
}