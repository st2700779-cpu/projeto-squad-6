# Repositório de prompts (Prompt Ops)

- `assistente/v1.md`: prompt de sistema do assistente. O proxy o lê na publicação. Para mudar o comportamento, crie `v2.md`, aponte `worker/src/prompt.js` para ele e registre no `CHANGELOG.md`.
- `testes/perguntas-teste.json`: bateria de 30 perguntas com o resultado esperado.
- `testes/resultado-AAAA-MM-DD.json`: saídas geradas por `tools/testar-assistente.mjs`.
- `CHANGELOG.md`: histórico de versões e modelo para registrar prompts que falharam (EAP 3.2).

A base de conhecimento fica em `data/base-conhecimento.json`, porque o front-end também a usa para as perguntas frequentes sem IA.
