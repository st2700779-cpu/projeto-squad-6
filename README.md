# Portal Acadêmico — Squad 6

Protótipo front-end do Sistema Acadêmico para a Rede Estadual de Ensino de Sergipe (SEDUC/SE), desenvolvido na Residência RiseUp. Tem quatro visões (família e estudante, professor, escola e rede) e um **Assistente de Matrícula e Dúvidas** com IA, por texto e voz.

Todos os dados são **simulados**. O projeto não se conecta a sistemas da SEDUC.

## O que tem aqui

| Pasta | Conteúdo |
| --- | --- |
| `index.html`, `familia/`, `professor/`, `escola/`, `rede/` | Páginas de cada perfil |
| `assets/css/` | `tema.css` (tokens do design system), `componentes.css`, `layout.css` (cabeçalho, menu, breadcrumb) e `assistente.css` |
| `assets/js/` | Núcleo (`app`, `estado`, `dados`, `regras`, `acessibilidade`, `ui`) e páginas |
| `assets/js/dominio/` | Regras de negócio por domínio: `matricula`, `notas`, `turmas`, `equivalencias` (`regras.js` reexporta todas) |
| `sistema-academico-seduc-prototipo.html` | Protótipo em arquivo único, abre com duplo clique. Usa os mesmos dados e regras do portal (ver `tools/gerar-prototipo.mjs`) |
| `assets/js/assistente/` | Assistente: interface, chamada à IA, erros, perguntas frequentes, voz |
| `data/` | Dados simulados em JSON e a base de conhecimento do assistente |
| `prompts/` | Prompt de sistema versionado, registro de alterações e bateria de testes |
| `worker/` | Proxy do assistente (Cloudflare Workers), que guarda a chave da IA |
| `tools/` | Servidor local, bateria de perguntas do assistente, `gerar-prototipo.mjs` (sincroniza o protótipo em arquivo único) e `verificar-contraste.mjs` (confere o contraste dos tokens) |
| `AUDITORIA.md`, `MELHORIAS.md`, `SUGESTOES.md` | Auditoria inicial, resumo das melhorias e ideias que exigiriam funcionalidade nova |
| `DIAGNOSTICO-UI.md`, `MELHORIAS-UI.md` | Diagnóstico visual e redesenho de interface, com o **guia do design system** (tokens e componentes) |

## Telas e versão mobile

As telas seguem os wireframes e fluxos da Squad 6 (W1–W17). O layout é **mobile primeiro**:

- **Família (W1–W5):** feita para o celular. Telas internas têm cabeçalho com voltar e título, e a matrícula tem os botões Voltar/Continuar fixos no rodapé.
- **Assistente (W6–W12):** no celular ocupa a tela inteira; no computador abre como coluna à direita. Segue o fluxo W17: validação no navegador, IA pelo proxy e, em qualquer falha, as perguntas frequentes locais.
- **Professor, escola e rede (W13–W15):** menu lateral no computador; no celular o menu vira abas roláveis, e o diário de classe mostra um cartão por estudante.
- **Exibição (modo escuro e alto contraste):** botão no cabeçalho, ao lado do A+ (portal e protótipo). As escolhas valem para as duas versões e ficam salvas no navegador; sem escolha, o modo escuro segue o sistema.

## Rodar no computador

Pré-requisitos: VS Code com a extensão **Live Server** (ou qualquer servidor estático). As páginas carregam os JSON com `fetch`, então **não funcionam abrindo o arquivo direto** (`file://`).

1. Clone o repositório e abra a pasta no VS Code.
2. Clique com o botão direito em `index.html` e escolha **Open with Live Server**.
3. O portal abre em `http://127.0.0.1:5500`.

Sem mais nada configurado, o assistente funciona em **modo sem IA**: responde pelas perguntas frequentes da base (`data/base-conhecimento.json`).

**Jeito mais fácil (Windows):** dê dois cliques em `iniciar.bat`. Ele sobe o servidor com a API em `http://localhost:5500` e abre o navegador. Para parar, feche a janela preta. No VS Code, **F5** faz o mesmo. Não precisa de Node nem de Python.

### API de dados

Com o `iniciar.bat` (ou F5), as páginas leem e gravam pela API do `tools/servidor.ps1`, e as alterações (matrículas, vagas, turmas, diário) ficam salvas em disco na pasta `dados-salvos/`. Elas continuam lá depois de fechar o navegador e valem para qualquer navegador na mesma máquina. O botão **Reiniciar demonstração** apaga essa pasta.

| Método | Endereço | O que faz |
| --- | --- | --- |
| `GET` | `/api/saude` | Confere se a API está no ar |
| `GET` | `/api/{nome}` | Lê um conjunto de dados (`escolas`, `atos`, `matriculas`, `vagas`, `turmas`, `diario`, `calendario`…) |
| `PUT` | `/api/{nome}` | Grava `matriculas`, `vagas`, `turmas` ou `diario` (os demais são só leitura) |
| `POST` | `/api/protocolo/MAT` | Gera o próximo número de protocolo |
| `DELETE` | `/api/dados` | Apaga todas as alterações salvas |

Sem a API (Live Server, `python -m http.server`, GitLab Pages), o portal continua funcionando: lê `data/*.json` e guarda as alterações no navegador (localStorage).

Alternativa sem VS Code: `python3 -m http.server 5500` na pasta do projeto.

**Abrir com duplo clique:** só o protótipo `sistema-academico-seduc-prototipo.html` funciona assim. Depois de mudar `data/` ou `assets/js/dominio/notas.js`, rode `node tools/gerar-prototipo.mjs` para atualizá-lo.

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
- Notas de 0 a 10 e faltas até o total de aulas dadas. Situação por matéria (`assets/js/dominio/notas.js`): média 6 ou mais aprova; de 4 a 5,9 fica em recuperação; abaixo de 4 reprova; frequência abaixo de 75% reprova.
- Uma só turma para todas as visões: a alocação feita pela escola gera "Minhas turmas" do professor, e o estudante enturmado pela secretaria entra no diário. Notas e faltas do diário aparecem no boletim da família.
- Enturmação só em turma aprovada da mesma série e sem passar da capacidade da sala.
- Alocação bloqueada quando o professor não é habilitado no componente (concurso e formação) ou passaria da carga horária semanal.
- Equivalências por regras: mesmo componente (com sinônimos) e carga de pelo menos 75% da rede é equivalente; carga menor pede complementação; componente não cursado ou nota abaixo de 6 vira pendência de adaptação.
- Ato autorizativo entra em alerta a 120 dias do vencimento, com botão para iniciar a renovação.
- Rematrícula mantém a escola e passa para a série seguinte, sem consumir vaga nova.
- Declarações de matrícula, frequência e transferência numeradas (DEC-ano-número), com marca-d’água de documento simulado.
- Ações irreversíveis pedem confirmação, e confirmações, recusas, aprovações, enturmações, alocações, chamadas e declarações ficam no histórico de ações (quem e quando).

## Padrões da equipe

- Uma branch por história (`hu04-matricula`, `ia04-falhas`) e merge request revisado por outra pessoa.
- Conteúdo com contribuição relevante de ferramentas de IA leva “Assistido por IA” na descrição do merge request.
- Nunca commitar `worker/.dev.vars` nem colar chaves ou dados pessoais em ferramentas de IA.

Documentação completa: Entrega Parcial, Tópicos 1.1, 2.1, 3.1, 4.1 e 4.2.
