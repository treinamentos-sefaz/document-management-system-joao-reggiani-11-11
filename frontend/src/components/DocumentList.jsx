import DownloadButton from './DownloadButton.jsx';

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function DocumentList({ documents, isLoading, error, onRetry }) {
  return (
    <section className="library" aria-labelledby="library-heading">
      <div className="library-heading">
        <div>
          <span className="section-index">02 / BIBLIOTECA</span>
          <h2 id="library-heading">Arquivos disponíveis</h2>
        </div>
        <span className="library-total">{documents.length} ITENS</span>
      </div>

      {isLoading ? (
        <p className="list-state">Carregando documentos...</p>
      ) : error ? (
        <div className="list-state list-error" role="alert">
          <span>{error}</span>
          <button className="text-button" onClick={onRetry} type="button">Tentar novamente</button>
        </div>
      ) : documents.length === 0 ? (
        <div className="empty-state">
          <span className="empty-mark" aria-hidden="true">↳</span>
          <p>A biblioteca ainda está vazia.</p>
          <span>Os documentos enviados aparecerão aqui.</span>
        </div>
      ) : (
        <div className="document-table-wrap">
          <table className="document-table">
            <thead>
              <tr>
                <th scope="col">NOME</th>
                <th scope="col">TAMANHO</th>
                <th scope="col">ENVIADO EM</th>
                <th scope="col"><span className="visually-hidden">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id}>
                  <td className="document-name">
                    <span className="file-icon" aria-hidden="true">DOC</span>
                    <span title={document.originalName}>{document.originalName}</span>
                  </td>
                  <td className="muted-cell">{formatFileSize(document.size)}</td>
                  <td className="muted-cell">{formatDate(document.uploadedAt)}</td>
                  <td className="action-cell"><DownloadButton document={document} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}