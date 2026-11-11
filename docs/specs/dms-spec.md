# Especificação - Document Management System

## 1. Objetivo

Entregar uma aplicação web simples para armazenar documentos no filesystem local, listar os documentos disponíveis e baixá-los por identificador, usando metadados mantidos em memória nesta fase.

## 2. Escopo

### Dentro do escopo

- Enviar um arquivo por requisição HTTP e armazená-lo localmente.
- Listar os metadados dos documentos registrados durante a execução atual do backend.
- Baixar um documento pelo identificador.
- Disponibilizar uma interface React para upload, listagem e download.
- Executar o backend como uma única instância local, sem identidade de usuário no MVP.

### Fora do escopo

- Armazenamento externo, em nuvem ou em serviços de terceiros.
- Banco de dados ou persistência durável dos metadados.
- Recuperação automática dos metadados a partir dos arquivos após reinício.
- Login, autenticação, autorização ou isolamento de documentos por usuário.
- Versionamento, edição, exclusão, compartilhamento, busca avançada ou pré-visualização de documentos.
- Upload de múltiplos arquivos em uma única requisição.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O cliente pode enviar um arquivo usando `multipart/form-data`, no campo `file`. O servidor grava o conteúdo em `backend/storage` e registra os metadados. |
| RF-02 | O upload aceita qualquer tipo de arquivo, até o limite configurado de 10 MB por padrão. O servidor rejeita a requisição sem arquivo ou que exceda o limite. |
| RF-03 | O cliente pode listar os metadados dos documentos registrados na instância atual. A listagem é ordenada do mais recente para o mais antigo. |
| RF-04 | O cliente pode baixar o conteúdo binário de um documento existente usando seu identificador. O download é enviado como anexo com o nome original do arquivo. |
| RF-05 | Um identificador desconhecido ou sem metadados correspondentes não deve permitir acesso a um arquivo. O servidor responde como documento não encontrado. |
| RF-06 | O frontend apresenta os estados de carregamento, sucesso e erro para upload, listagem e download, consumindo a API com `fetch`. |
| RF-07 | Como o MVP não identifica usuários, todos os documentos registrados são visíveis e baixáveis por qualquer cliente que alcance a aplicação. O campo `owner` usa o valor fixo `local` e não representa autenticação ou controle de acesso. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos são gravados exclusivamente no filesystem local em `backend/storage`, usando Multer com `diskStorage`. Não utilizar armazenamento externo. |
| RNF-02 | Os metadados ficam em memória e são perdidos ao reiniciar o processo. Os arquivos no disco permanecem, mas sem metadados correspondentes não são listáveis ou baixáveis pela API. A limpeza de arquivos órfãos não faz parte desta fase. |
| RNF-03 | A configuração operacional deve vir de variáveis de ambiente. `HOST` define a interface de escuta do backend (padrão `127.0.0.1`), `PORT` define a porta (padrão `3000`) e `MAX_UPLOAD_SIZE_BYTES` define o limite por arquivo (padrão `10485760`, equivalente a 10 MiB). |
| RNF-04 | O nome físico do arquivo é gerado pelo servidor a partir de um identificador único; não utilizar o nome fornecido pelo cliente como caminho de gravação. O caminho local nunca é exposto pela API. |
| RNF-05 | Erros HTTP são retornados em JSON com código e mensagem compreensível, sem caminhos locais, stack traces ou detalhes internos. Downloads bem-sucedidos retornam o conteúdo binário. |
| RNF-06 | O backend usa Node.js e Express em CommonJS; o frontend usa React e Vite em ESM. Os testes do backend usam `node:test`. |
| RNF-07 | A implementação deve preservar separação de responsabilidades, tratar erros de entrada e de filesystem nos limites apropriados e evitar abstrações além das necessárias ao MVP. |

## 5. Modelo de dados (metadados do documento)

Os metadados são mantidos em memória pelo repositório durante a vida do processo. O modelo público contém:

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | string | Identificador único e opaco do documento, gerado pelo servidor (por exemplo, UUID). |
| `originalName` | string | Nome original enviado pelo cliente, preservado apenas como metadado e para o nome sugerido no download. |
| `size` | number | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Data e hora do registro em ISO 8601 UTC. |
| `owner` | string | Identificador do proprietário. No MVP sem autenticação, recebe o valor fixo `local`; não é usado para filtrar ou autorizar operações. |

O repositório também mantém uma referência interna ao nome/caminho gerado em `backend/storage`, necessária para localizar o conteúdo. Essa referência é dado interno e não deve ser incluída nas respostas da API. O nome físico deve ser derivado do identificador gerado pelo servidor, evitando colisões e traversal de diretório por nomes controlados pelo cliente.

Após reinício, o diretório de armazenamento continua contendo os arquivos, mas o repositório em memória inicia vazio. Não reconstruir registros automaticamente nesta versão.

## 6. Contratos de API

Os contratos abaixo descrevem as rotas do backend. No desenvolvimento do frontend, o Vite recebe chamadas no prefixo `/api` e encaminha para o backend removendo esse prefixo; por exemplo, `/api/upload` é encaminhado para `/upload`.

### Formato de erro

Respostas de erro JSON usam a forma abaixo. A mensagem é destinada ao cliente e não inclui detalhes internos.

```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "O arquivo excede o limite permitido."
  }
}
```

### POST /upload

Envia um arquivo e cria os metadados do documento.

- **Content-Type:** `multipart/form-data`
- **Campo obrigatório:** `file` (um arquivo)
- **Limite:** `MAX_UPLOAD_SIZE_BYTES`; padrão de 10 MiB. Não há allowlist de MIME type ou extensão.
- **Sucesso:** `201 Created`, `application/json`.

```json
{
  "data": {
    "id": "4e7a5098-8573-48ae-b6d6-503c70a1b5b1",
    "originalName": "relatorio.pdf",
    "size": 48213,
    "uploadedAt": "2026-11-11T12:00:00.000Z",
    "owner": "local"
  }
}
```

- **Erros:** `400 Bad Request` (`FILE_REQUIRED` para arquivo ausente ou requisição multipart inválida); `413 Payload Too Large` (`FILE_TOO_LARGE`); `500 Internal Server Error` (`STORAGE_ERROR` se não for possível gravar o arquivo ou registrar os metadados).
- Se o registro dos metadados falhar após a gravação, a implementação deve tentar remover o arquivo recém-gravado para evitar órfão criado por uma falha parcial. Não retornar caminho local.

### GET /documents

Lista os documentos registrados na memória da instância atual.

- **Entrada:** nenhuma.
- **Sucesso:** `200 OK`, `application/json`; `data` é um array de metadados públicos, ordenado por `uploadedAt` decrescente. Uma lista vazia é válida.

```json
{
  "data": [
    {
      "id": "4e7a5098-8573-48ae-b6d6-503c70a1b5b1",
      "originalName": "relatorio.pdf",
      "size": 48213,
      "uploadedAt": "2026-11-11T12:00:00.000Z",
      "owner": "local"
    }
  ]
}
```

- **Erros:** `500 Internal Server Error` (`INTERNAL_ERROR`) se não for possível concluir a listagem.
- A resposta não contém referências ou caminhos do filesystem.

### GET /documents/:id/download

Transfere o conteúdo binário de um documento registrado.

- **Parâmetro:** `id`, identificador retornado pelo endpoint de upload ou listagem.
- **Sucesso:** `200 OK`, corpo binário, `Content-Disposition: attachment` com o nome original e `Content-Length` quando disponível. Usar `application/octet-stream` como tipo de conteúdo para não depender de MIME type informado pelo cliente.
- **Erros:** `404 Not Found` (`DOCUMENT_NOT_FOUND`) se o ID não estiver registrado ou se o arquivo correspondente não existir; `500 Internal Server Error` (`STORAGE_ERROR`) para outra falha de leitura.
- O endpoint só resolve arquivos a partir dos metadados internos; não aceita caminho ou nome de arquivo fornecido pelo cliente.

### Convenções de acesso

Não há autenticação nesta versão. Todas as rotas ficam disponíveis a qualquer cliente que alcance o backend; não há filtro por `owner`. O prefixo `/api` é responsabilidade do proxy de desenvolvimento do Vite, não parte das rotas descritas para o Express.

## 7. Decisões arquiteturais

- **Backend:** adota Clean Architecture simples com Node.js + Express em CommonJS, organizado em `routes/`, `controllers/`, `services/` e `repositories/`. O fluxo de dependência é `routes → controllers → services → repositories`; camadas internas não dependem das externas.
- **Routes:** declaram os três endpoints e delegam a execução aos controllers.
- **Controllers:** adaptam requisições e respostas HTTP, validam entrada básica e traduzem resultados/erros para status e formatos da API.
- **Services:** concentram regras de upload, limite, criação de metadados, listagem e localização para download.
- **Repositories:** mantêm metadados em memória e encapsulam a referência ao arquivo armazenado localmente.
- **Upload e filesystem:** Multer com `diskStorage` grava exclusivamente em `backend/storage`. O nome físico é gerado pela aplicação e não depende de um caminho informado pelo cliente.
- **Frontend:** React com componentes funcionais e Hooks, organizado em `components/`, `pages/` e `services/`. A comunicação com o backend ocorre via `fetch` pelo prefixo `/api`, encaminhado pelo proxy do Vite.
- **Persistência:** não há banco de dados nesta fase. Reiniciar o backend perde os metadados; os arquivos físicos não são removidos automaticamente.
- **Usuários:** o MVP tem um único contexto local sem autenticação. `owner: "local"` mantém o formato previsto para possível evolução, mas não confere identidade nem privilégio.

## 8. Plano de execução

1. **Preparar a aplicação e configuração:** organizar as camadas do backend, registrar rotas no Express e carregar `PORT` e `MAX_UPLOAD_SIZE_BYTES` com padrões documentados. Critério: aplicação sobe e mantém o health check existente.
2. **Implementar o upload local e metadados:** configurar Multer `diskStorage` em `backend/storage`, gerar IDs e nomes físicos seguros, validar campo/limite e registrar os metadados no repositório em memória. Critério: upload válido retorna `201`, grava arquivo local e disponibiliza metadados sem caminho físico.
3. **Implementar listagem e download:** expor a listagem ordenada e a transferência binária por ID; mapear documento ausente e falhas do filesystem aos erros definidos. Critério: documento enviado pode ser listado e baixado; ID inexistente retorna `404`.
4. **Construir o fluxo de interface:** criar a página e componentes React para envio, listagem, estados de erro/carregamento e download, usando o serviço `fetch` sob `/api`. Critério: os fluxos podem ser operados pela interface via proxy do Vite.
5. **Validar integração e atualizar documentação:** adicionar testes com `node:test` para upload válido/ausente/acima do limite, listagem vazia e preenchida, download válido/inexistente e falha de leitura; executar testes do backend e build do frontend. Critério: contratos e estados da interface correspondem a esta especificação.
