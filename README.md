# Portal Acadêmico — Squad 6

Protótipo front-end do Sistema Acadêmico para a Rede Estadual de Ensino de Sergipe (SEDUC/SE), desenvolvido na Residência RiseUp. Tem quatro visões (família e estudante, professor, escola e rede) e um **Assistente de Matrícula e Dúvidas** com IA, por texto e voz.

Todos os dados são **simulados**. O projeto não se conecta a sistemas da SEDUC.

## O que tem aqui

| Pasta | Conteúdo |
| --- | --- |
| `index.html`, `familia/`, `professor/`, `escola/`, `rede/` | Páginas de cada perfil |
| `assets/css/` | Tema, componentes e estilos do assistente |
| `assets/js/` | Núcleo (`app`, `estado`, `dados`, `regras`, `acessibilidade`, `ui`) e páginas |
| `assets/js/assistente/` | Assistente: interface, chamada à IA, erros, perguntas frequentes, voz |
| `data/` | Dados simulados em JSON e a base de conhecimento do assistente |
| `prompts/` | Prompt de sistema versionado, registro de alterações e bateria de testes |
| `worker/` | Proxy do assistente (Cloudflare Workers), que guarda a chave da IA |
| `tools/` | Script que roda a bateria de perguntas contra o proxy |

## Rodar no computador

Pré-requisitos: VS Code com a extensão **Live Server** (ou qualquer servidor estático). As páginas carregam os JSON com `fetch`, então **não funcionam abrindo o arquivo direto** (`file://`).

1. Clone o repositório e abra a pasta no VS Code.
2. Clique com o botão direito em `index.html` e escolha **Open with Live Server**.
3. O portal abre em `http://127.0.0.1:5500`.

Sem mais nada configurado, o assistente funciona em **modo sem IA**: responde pelas perguntas frequentes da base (`data/base-conhecimento.json`).

Alternativa no VS Code sem Live Server: aperte **F5** ("Abrir portal (servidor local)"). O `tools/servidor.ps1` sobe um servidor em `http://localhost:5500` sem precisar de Node nem Python.

Alternativa sem VS Code: `python3 -m http.server 5500` na pasta do projeto.

## Testar o assistente sem gastar cota

Acrescente `?simular=` ao endereço de qualquer página:

| Endereço | O que acontece |
| --- | --- |
| `familia/index.html?simular=ok` | Resposta simulada com base nas perguntas frequentes, com ação sugerida |
| `?simular=lento` | Demora mais de 30 s e mostra o erro de tempo esgotado |
| `?simular=cota` | Limite de cota (429): “Tentar de novo” fica bloqueado por 60 s |
| `?simular=erro` | Serviço fora do ar: uma nova tentativa automática e depois a falha |
| `?simular=invalida` | Resposta em formato inesperado |

Acrescente `&assistente` para o painel já abrir. Exemplo: `familia/index.html?simular=cota&assistente`. Três falhas seguidas pausam o assistente por 5 minutos (recarregue a página para zerar).

## Ligar a IA de verdade

A chave da IA **nunca** vai para o front-end. Ela fica no proxy, na pasta `worker/`.

1. Crie uma chave gratuita no [Google AI Studio](https://aistudio.google.com/apikey) e confira lá o nome exato do modelo Flash-Lite disponível. Ajuste `MODELO` em `worker/wrangler.toml` se for diferente.
2. Crie uma conta gratuita na Cloudflare.
3. No terminal:
   ```bash
   cd worker
   npm install
   cp .dev.vars.example .dev.vars   # cole a chave em .dev.vars
   npx wrangler dev                 # proxy local em http://localhost:8787
   ```
4. Em `config.js`, coloque `assistenteUrl: "http://localhost:8787/api/assistente"` e recarregue o portal.
5. Para publicar o proxy:
   ```bash
   npx wrangler login
   npx wrangler secret put GEMINI_API_KEY
   npx wrangler deploy
   ```
   Depois, troque `assistenteUrl` em `config.js` pelo endereço `.workers.dev` informado e ajuste `ORIGEM_PERMITIDA` em `wrangler.toml` com o endereço do GitLab Pages.

**Reserva:** para usar o Groq, cadastre `GROQ_API_KEY` com `wrangler secret put` e mude `PROVEDOR` para `"groq"` em `wrangler.toml`.

### Variáveis do proxy

| Nome | Onde | Descrição |
| --- | --- | --- |
| `GEMINI_API_KEY` | segredo | Chave do Google AI Studio |
| `GROQ_API_KEY` | segredo (opcional) | Chave do Groq, se usar a reserva |
| `PROVEDOR` | `wrangler.toml` | `gemini` ou `groq` |
| `MODELO` | `wrangler.toml` | Nome do modelo Gemini |
| `MODELO_GROQ` | `wrangler.toml` | Nome do modelo no Groq |
| `ORIGEM_PERMITIDA` | `wrangler.toml` | Endereços que podem chamar o proxy, separados por vírgula |

## Publicar no GitLab Pages

O arquivo `.gitlab-ci.yml` publica o site a cada commit na branch principal. O endereço aparece em **Deploy → Pages** no GitLab.

## Rodar a bateria de testes do assistente

Com o proxy no ar:

```bash
node tools/testar-assistente.mjs https://SEU-PROXY.workers.dev/api/assistente https://SEU-GRUPO.gitlab.io
```

O script faz as 30 perguntas de `prompts/testes/perguntas-teste.json`, mostra acertos e tempo mediano e salva o resultado em `prompts/testes/`. Registre o resultado e cada ajuste no `prompts/CHANGELOG.md`. As datas e prazos das respostas precisam de revisão manual.

## Regras de negócio implementadas

- Escola sem ato autorizativo vigente não aparece como opção na matrícula e não pode abrir turma na etapa.
- A matrícula só oferece escolas com vaga; pedir reserva uma vaga, recusar devolve.
- Na transferência, o estudante fica na mesma série.
- Turmas: a coordenação cria e envia; a direção aprova ou devolve com justificativa.
- Notas de 0 a 10 e faltas até o total de aulas dadas; presença mínima de 75% e média 6 para aprovação.

## Padrões da equipe

- Uma branch por história (`hu04-matricula`, `ia04-falhas`) e merge request revisado por outra pessoa.
- Conteúdo com contribuição relevante de ferramentas de IA leva “Assistido por IA” na descrição do merge request.
- Nunca commitar `worker/.dev.vars` nem colar chaves ou dados pessoais em ferramentas de IA.

Documentação completa: Entrega Parcial, Tópicos 1.1, 2.1, 3.1, 4.1 e 4.2.
