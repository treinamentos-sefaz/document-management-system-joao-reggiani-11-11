import { useCallback, useEffect, useState } from 'react';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import { getDocuments } from './services/documentApi.js';
import './styles.css';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState('');

  const refreshDocuments = useCallback(async () => {
    setIsLoading(true);
    setListError('');
    try {
      setDocuments(await getDocuments());
    } catch (error) {
      setListError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDocuments();
  }, [refreshDocuments]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Arquivo, início">
          <span className="brand-mark" aria-hidden="true">A</span>
          <span>arquivo<span className="brand-period">.</span></span>
        </a>
        <span className="topbar-label">ESPAÇO DE DOCUMENTOS</span>
      </header>

      <section className="workspace" id="inicio">
        <div className="page-heading">
          <div>
            <p className="eyebrow">BIBLIOTECA LOCAL</p>
            <h1>Seus documentos,<br />em um só lugar.</h1>
            <p className="page-description">
              Envie, organize e baixe seus arquivos com simplicidade.
            </p>
          </div>
          <div className="document-count" aria-live="polite">
            <span className="count-number">{documents.length.toString().padStart(2, '0')}</span>
            <span className="count-label">{documents.length === 1 ? 'documento' : 'documentos'}<br />na biblioteca</span>
          </div>
        </div>

        <UploadComponent onUploadSuccess={refreshDocuments} />

        <DocumentList
          documents={documents}
          isLoading={isLoading}
          error={listError}
          onRetry={refreshDocuments}
        />
      </section>

      <footer className="page-footer">
        <span>ARQUIVO · GESTÃO DE DOCUMENTOS</span>
        <span>ARMAZENAMENTO LOCAL</span>
      </footer>
    </main>
  );
}
