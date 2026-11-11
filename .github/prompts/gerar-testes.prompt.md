---
description: "Analisa e cria testes automatizados para upload, listagem e download da API backend do DMS."
name: "gerar-testes"
argument-hint: "Opcional: informe um endpoint ou cenário para priorizar"
agent: "agent"
---

# Gerar testes do backend do DMS

Analise a implementação atual do backend antes de escrever testes. Identifique as rotas registradas, controllers, serviços e repositórios relacionados aos documentos, seus contratos HTTP e os testes e utilitários já existentes. Considere também as instruções em `.github/copilot-instructions.md` e a especificação em `docs/specs/dms-spec.md`. Não presuma nomes de arquivos, comportamentos ou contratos sem verificá-los no código atual.

Crie ou amplie testes em `backend/test` para os endpoints existentes de documentos:

- `POST /upload`: teste upload válido, ausência de arquivo, multipart inválido e arquivo acima do limite configurado. Verifique status HTTP, formato dos metadados e formato dos erros conforme o contrato implementado.
- `GET /documents`: teste lista vazia e preenchida; verifique os metadados públicos, a ordenação mais recente primeiro e a ausência de caminhos internos de armazenamento.
- `GET /documents/:id/download`: teste download válido, conteúdo binário, cabeçalhos de anexo e identificador inexistente. Cubra outras falhas de download somente quando houver comportamento definido e testável no código ou na especificação.

Requisitos de implementação:

- Use o runner nativo `node:test` e asserções de `node:assert`, seguindo os padrões e utilitários já presentes no backend. Não adicione dependências de teste se as ferramentas existentes forem suficientes.
- Prefira testar a API por meio do app Express exportado e de uma porta local dinâmica, como nos testes existentes, quando isso for adequado ao cenário.
- Isole os testes: não dependa de serviços externos, não use portas fixas e limpe os arquivos criados no filesystem local mesmo quando houver falha. Preserve quaisquer arquivos de storage preexistentes.
- Mantenha os testes determinísticos, legíveis e sem duplicar setup ou verificações que possam ser compartilhados de forma simples.
- Respeite as responsabilidades da arquitetura existente (`routes -> controllers -> services -> repositories`); teste contratos e comportamentos observáveis sem acoplar os testes a detalhes internos desnecessários.
- Modifique somente arquivos de teste dentro de `backend/test`. Não altere arquivos de produção, configuração ou documentação sem autorização explícita.
- Se encontrar uma falha que pareça exigir uma mudança em código de produção, não a corrija. Informe o comportamento observado, o teste que o demonstra e peça autorização antes de alterar produção.

Ao terminar, execute `npm test` no diretório `backend` e informe quais cenários foram adicionados, o resultado da execução e qualquer problema que exija autorização para mudança em produção. Se o usuário informar um endpoint ou cenário no campo de entrada, priorize-o sem omitir os demais endpoints quando a tarefa solicitar cobertura completa.
