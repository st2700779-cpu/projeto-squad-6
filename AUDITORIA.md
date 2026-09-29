# Auditoria do projeto — Fase 0

Data: 29/09/2026 · Escopo: leitura completa do repositório, execução das 22 páginas HTML em navegador (Chromium headless, larguras de 360 px e 1280 px) e conferência cruzada dos arquivos de dados. Nenhum arquivo do projeto foi alterado nesta fase; só este documento foi criado.

## 0. Ponto de atenção antes de tudo: o projeto real não é o descrito no pedido

O pedido descreve um protótipo com três visões (Aluno, Professor, Secretaria), dados escritos à mão, JS solto e sem persistência. O repositório contém **três coisas diferentes**:

| # | O que é | Arquivos | Situação |
| --- | --- | --- | --- |
| A | **Portal Acadêmico** (produto principal): 4 visões (Família e estudante, Professor, Escola, Rede), 20 páginas, JS em módulos ES, dados em JSON, persistência via API local ou `localStorage`, assistente de IA, modo escuro e alto contraste | `index.html`, `familia/`, `professor/`, `escola/`, `rede/`, `assets/`, `data/`, `config.js`, `worker/`, `tools/` | Maduro. Boa parte das Fases 1, 3 e 5 do pedido **já existe** |
| B | **Protótipo mobile em arquivo único** (Aluno, Professor, Escola) | `sistema-academico-seduc-prototipo.html` | Funciona sem servidor, mas com **dados próprios e desligados do portal** |
| C | **Protótipo antigo** (Secretaria, Diretor, Professor, Aluno, Responsável) | `script.js`, `style.css` | **Código morto**: nenhuma página os carrega desde que o portal substituiu o `index.html` |

O texto do pedido descreve, na prática, o item C. As melhorias mais valiosas, porém, estão na relação entre A e B e nas lacunas de integração dentro de A.

**Decisões que preciso de você** estão no fim deste documento (seção 6).

## 1. Mapa de arquivos, telas e fluxos

### 1.1 Estrutura

| Camada | Arquivos | Papel |
| --- | --- | --- |
| Estrutura (HTML) | 20 páginas de ~20 linhas, todas iguais: `<head>` + `<main id="conteudo">` + `<script type="module">` | Cascas; o conteúdo é montado por JS |
| Estilo | `assets/css/tema.css` (tokens: cores, fonte, raio, alvo de toque, claro/escuro/alto contraste), `componentes.css`, `assistente.css`; Bootstrap 5.3.3 e Atkinson Hyperlegible por CDN | Design system já existe |
| Núcleo JS | `app.js` (cabeçalho, menu, navegação), `estado.js` (localStorage), `dados.js` (API ou JSON + localStorage), `regras.js` (regras de negócio), `ui.js` (toast, confirmação, ícones, CSV), `acessibilidade.js` (escala de letra, Ouvir), `tema-inicial.js` | Camada de dados e regras já centralizada |
| Páginas JS | `assets/js/paginas/*.js` (19 arquivos, um por tela) | Lógica por tela |
| Assistente | `assets/js/assistente/*`, `worker/`, `prompts/`, `data/base-conhecimento.json` | Chat com IA por proxy, com FAQ local de reserva. **Fora do escopo do pedido; será preservado sem mudanças** |
| Servidor local | `tools/servidor.ps1` (PowerShell, API em `/api/*`), `iniciar.bat`, `iniciar-mobile.bat` | Só Windows |
| Publicação | `.gitlab-ci.yml` (GitLab Pages) | Publica só o portal (A) |

### 1.2 Telas por visão

| Visão | Tela | Arquivo | Fluxo |
| --- | --- | --- | --- |
| Início | Seleção de perfil, "Reiniciar demonstração" (com confirmação) | `inicio.js` | Escolhe perfil → entra |
| **Família e estudante** | Início (seletor de estudante, rematrícula em um toque, pedidos) | `familia-inicio.js` | Hub |
| | Matrícula em passos (nova, rematrícula, transferência) | `familia-matricula.js` | Gera protocolo, reserva vaga |
| | Notas e faltas | `familia-notas.js` | Lê `estudantes.json` + diário do professor |
| | Documentos e declarações | `familia-documentos.js`, `familia-declaracao.js` | Declaração numerada, imprimir/PDF |
| | Calendário e avisos | `familia-calendario.js` | Leitura |
| **Professor** | Minhas turmas | `professor-turmas.js` | Lê `professor.json` |
| | Diário de classe (chamada rápida, notas, faltas) | `professor-diario.js` | Grava `diario` e `chamadas` |
| | Avisos | `avisos.js` | Leitura |
| **Escola** | Início (pendências, atos, histórico de ações) | `escola-inicio.js` | Painel |
| | Matrículas (confirmar/recusar com justificativa) | `escola-matriculas.js` | Grava `matriculas`, `vagas` |
| | Enturmação | `escola-enturmacao.js` | Grava `enturmacao` |
| | Turmas (criar, enviar, aprovar/devolver) | `escola-turmas.js` | Grava `turmas` |
| | Alocação de professores (bloqueio por habilitação e carga) | `escola-alocacao.js` | Grava `alocacoes` |
| | Equivalências de histórico | `escola-equivalencias.js` | Grava `equivalencias` |
| | Avisos | `avisos.js` | Leitura |
| **Rede (SEDUC/DRE)** | Atos autorizativos (alerta de 120 dias, renovação) | `rede-atos.js` | Grava `renovacoes` |
| | Vagas por escola | `rede-vagas.js` | Lê `vagas` |
| | Matrizes curriculares | `rede-matrizes.js` | Leitura |

O que **já é compartilhado** entre visões hoje (verificado no código): matrícula pedida pela família → aparece para a escola → confirmada/recusada volta para a família; vaga é reservada/devolvida; a nota de Matemática e as faltas lançadas pelo professor aparecem nas notas da família; chamadas e ações vão ao histórico da escola.

### 1.3 Protótipos B e C

- **B** (`sistema-academico-seduc-prototipo.html`, 24 KB, JS embutido em IIFE): perfis `#aluno`, `#professor`, `#secretaria`. Reaproveita `tema.css`/`componentes.css`. Dados em variáveis internas, reiniciados a cada recarga.
- **C** (`script.js` 365 linhas + `style.css` 179 linhas): perfis Secretaria, Diretor, Professor, Aluno, Responsável. Variáveis globais (`var`), `onclick` inline, `alert()`, boletim **inventado por fórmula** (`aluno.nota + (i % 3 === 0 ? 0.3 : -0.2)`), sem acessibilidade.

## 2. Problemas encontrados

Severidade: **C** crítico · **A** alto · **M** médio · **B** baixo. Cada item foi conferido no código ou na execução.

### 2.1 Consistência e integração de dados

| ID | Sev. | Cat. | Problema | Evidência |
| --- | --- | --- | --- | --- |
| D1 | **A** | consistência | O protótipo B (arquivo único) é um segundo produto com **dados e regras próprios**: aluna "Ana Beatriz Costa", escola "E. E. Prof. Ivo do Prado", "1.284 estudantes / 87 professores / 42 turmas" escritos no HTML, média da turma com valor de reserva fixo `'7,4'`. O portal usa "Carla Vitória Santos", "Colégio Estadual Rio Sergipe" etc. Um avaliador que abrir os dois vê dois sistemas diferentes | `sistema-academico-seduc-prototipo.html` linhas ~122–150, `mediaTurma()`, `telaSecretaria()` |
| D2 | **A** | consistência | Regra de frequência diferente entre B e A. B calcula frequência como **média de percentuais por matéria**; A calcula por faltas ÷ aulas dadas (`regras.js: presenca`). B também usa "trimestre"; A usa "unidade" | B `telaAluno()`; `regras.js` |
| D3 | **A** | bug/integração | **Dois sistemas de identificadores de turma sem ligação**: `professor.json` (t1…t6, com alunos próprios no diário) e `turmas.json` (tt1…tt5, da escola). A turma criada/aprovada pela Escola **não aparece para o Professor**; a alocação de professor na Escola não atualiza "Minhas turmas"; a enturmação de um estudante não o coloca no diário. Turma "1ª série A" tem 38 matriculados na escola e 8 estudantes no diário do professor | `data/professor.json` × `data/turmas.json`; `escola-alocacao.js` grava só `alocacoes`; `escola-enturmacao.js` grava só `enturmacao` |
| D4 | **A** | integração | Só a Matemática do estudante vem do diário do professor; as demais matérias são fixas em `estudantes.json`. O segundo estudante (Lucas, `turmaId: null`) não recebe nada do diário. A quantidade de faltas de **uma disciplina** vira a frequência **geral** do estudante | `regras.js: desempenho()` |
| D5 | **M** | consistência | Cálculo espalhado e sem regra explícita de situação: `regras.js` tem `media` e `presenca`, mas **não há função de situação** (aprovado/recuperação/reprovado). A família mostra "Indo bem / Precisa de atenção" comparando com 6; B mostra "Aprovado / Em recuperação / pendente"; nenhuma trata frequência abaixo de 75 % como reprovação | `familia-notas.js`, B |
| D6 | **M** | consistência | `aulasDadas` duplicado: existe em cada estudante (`estudantes.json`) e em `professor.json`; o cálculo pode usar um valor ou outro conforme a tela (`desempenho` usa o do estudante; o diário usa o do professor) | `regras.js`, `professor-diario.js` |
| D7 | **M** | consistência | Contagem de "matriculados" da turma é campo fixo (`matriculados: 38`) somado às enturmações novas; não deriva de matrículas confirmadas | `escola-enturmacao.js:18` |
| D8 | **B** | código | Chave `portal-academico-squad6-v1` sem versionamento de dados: se o formato dos JSON mudar, o `localStorage` antigo de quem já usou a demonstração fica incoerente | `estado.js` |

### 2.2 Código

| ID | Sev. | Cat. | Problema |
| --- | --- | --- | --- |
| C1 | **A** | código | **Código morto**: `script.js` e `style.css` (raiz) não são carregados por nenhuma página nem publicados pelo CI, mas continuam no repositório. Usam globais, `onclick` inline, `alert()`, e contradizem os dados do portal |
| C2 | **M** | código | ~100 linhas com `style="..."` dentro dos templates JS (mais em `familia-matricula`, `professor-diario`, `familia-notas`, `escola-alocacao`). Espaçamentos e tamanhos que deveriam ser classes de `componentes.css` |
| C3 | **M** | código | Utilitários duplicados no protótipo B (`esc`, `icone`, `botaoOuvir`, `avisar`, `etiqueta`, escala de letra), cópia de `ui.js`/`acessibilidade.js` |
| C4 | **B** | código | JSDoc ausente na maioria das funções; há comentários de cabeçalho por arquivo, o que ajuda, mas as funções de `regras.js` e `dados.js` não descrevem parâmetros |
| C5 | **B** | código | Regras espalhadas: `MEDIA_APROVACAO` e `PRESENCA_MINIMA` estão em `regras.js`, mas B redefine `PRESENCA_MINIMA`; textos "6" e "75%" aparecem escritos à mão em mensagens |
| C6 | **B** | código | Sem verificação automática (lint/testes) das regras de `regras.js`, que concentram a lógica que mais importa |

### 2.3 Execução, console e desempenho

| ID | Sev. | Cat. | Problema | Evidência |
| --- | --- | --- | --- | --- |
| E1 | **A** | bug | **O portal não abre com duplo clique** (`file://`): o `fetch` de `data/*.json` e os módulos ES exigem servidor. Isto conflita com a restrição 4 do pedido. O protótipo B abre direto, o portal não | README: "não funcionam abrindo o arquivo direto" |
| E2 | **M** | bug | **Erro no console em toda página** quando não há API (Live Server, GitLab Pages, `python -m http.server`): a sonda `GET /api/saude` responde 404 e o navegador registra "Failed to load resource". Funciona, mas o console não fica limpo | `dados.js: usarApi()`; confirmado em execução (`404 /api/saude`) |
| E3 | **M** | desempenho/robustez | Bootstrap e fontes vêm de CDN (jsdelivr, Google Fonts). Sem internet ou com bloqueio institucional (comum em rede escolar/governo), o layout perde a grade e a fonte. Em teste com CDN bloqueada, nada quebrou funcionalmente, mas o visual muda | Execução com CDN bloqueada |
| E4 | **M** | bug | **Possível rolagem horizontal em 360 px** nas páginas `familia/*` (medido `scrollWidth > innerWidth`). A medição foi feita **sem o Bootstrap** (CDN bloqueada no ambiente de teste), então pode ser artefato; precisa ser reconferida com a CDN acessível antes de corrigir | Execução a 360 px |
| E5 | **B** | desempenho | Busca refaz a tabela a cada tecla, sem debounce (`rede-atos`, `rede-vagas`, `escola-matriculas`). Com as poucas linhas atuais não pesa | `rede-atos.js:52`, `rede-vagas.js:50` |
| E6 | **B** | desempenho | Ícones, `esc()` e `PATHS` recriados em cada carga; nada crítico. Scripts já são módulos (não bloqueiam) |  |

### 2.4 UX, formulários e estados

| ID | Sev. | Cat. | Problema |
| --- | --- | --- | --- |
| U1 | **M** | UX | Diário de classe valida notas e faltas **só ao clicar em Salvar** (mostra o primeiro erro e foca o campo). Não há validação enquanto digita nem máscara/normalização (ponto vs. vírgula) |
| U2 | **M** | UX | Matrícula: telefone sem máscara `(00) 00000-0000`; validação só ao avançar o passo. Data usa `<input type="date">` nativo (formato depende do navegador; não há campo de CPF em nenhuma tela, então não há o que mascarar) |
| U3 | **M** | UX | `pedirTexto` (recusa/devolução) fecha ao clicar fora e **perde o texto digitado** |
| U4 | **M** | UX | Estados de carregamento: todas as telas mostram só "Carregando…" em texto simples; o erro tem "Tentar de novo" (bom). Estado vazio existe em `escola-inicio`, mas falta em listas como pedidos da família e avisos (mostram lista em branco se o JSON vier vazio) |
| U5 | **M** | consistência | Termos: o portal usa "unidade"; o pedido pede terminologia escolar (bimestre). B usa "trimestre". Deve haver **um** termo em todo o sistema |
| U6 | **B** | UX | Toast some em 3,5 s e é substituído por outro sem fila; mensagens longas podem não dar tempo de leitura |
| U7 | **B** | UX | Menu no celular vira abas roláveis (não é menu colapsável). Funciona e segue os wireframes; não é problema, só difere do pedido |
| U8 | **B** | UX | "Reiniciar demonstração" só existe na tela de seleção de perfil |

### 2.5 Acessibilidade

O portal já tem: link "Pular para o conteúdo", `lang="pt-BR"`, um `<h1>` por página (verificado nas 20 páginas do portal), tabelas com `<caption>` e `th scope="col"` (verificado), todos os campos com rótulo (0 sem rótulo nas 20 páginas), foco visível de 3 px, `prefers-reduced-motion`, modo escuro e alto contraste, escala de letra, leitura em voz alta, alvos de toque de 48 px. Lacunas:

| ID | Sev. | Cat. | Problema |
| --- | --- | --- | --- |
| A1 | **M** | acessibilidade | **Diálogos sem trap de foco**: `confirmar()` e `pedirTexto()` (`ui.js`) focam o botão certo e devolvem o foco ao fechar, mas Tab sai do diálogo para a página atrás. Esc só funciona se o foco estiver dentro |
| A2 | **M** | acessibilidade | A região `role="status"` do toast é criada junto com o texto, o que faz alguns leitores de tela não anunciarem. Deve existir vazia desde o carregamento |
| A3 | **M** | acessibilidade | Em B, o botão de perfil ativo e a navegação por hash mudam o conteúdo sem anunciar; o foco vai para `<main>` (bom), mas o título da página muda só em `document.title` |
| A4 | **B** | acessibilidade | Contraste dos tokens: os valores definidos (`--suave #5b5d57` sobre branco, `--linha #8e9089` para bordas) parecem cumprir 4,5:1 para texto; **falta conferir** com ferramenta (tema escuro e badges `etiqueta-*`) antes de afirmar |
| A5 | **B** | acessibilidade | `role="listitem"` em `<details>` com `role="list"` em `div` (famílias/notas): funciona, mas é ARIA que o HTML resolveria com `<ul>/<li>` |
| A6 | **B** | acessibilidade | `404.html` usa estilo próprio inline e cores diferentes do tema (fundo `#f3f6f2`) |

### 2.6 Responsividade

O layout é mobile primeiro, com tabelas em `tabela-rolagem` e cartões no diário. Sem problemas confirmados além de E4. Verificação visual completa (capturas em 360/768/1280 px com a CDN acessível) fica para o final da Fase 6.

## 3. O que o pedido pede e já está atendido

| Pedido | Situação |
| --- | --- |
| Módulos ES por domínio | Parcial: núcleo em módulos (`dados`, `regras`, `ui`, `estado`); páginas por tela, não por domínio (aluno/nota/turma). Reorganizar seria renomear e mover, sem ganho funcional claro |
| Camada única de dados + localStorage + restaurar demonstração | **Já existe** (`dados.js`, `estado.js`, "Reiniciar demonstração") |
| Design tokens e componentes | **Já existe** (`tema.css`, `componentes.css`) |
| Confirmação antes de ações destrutivas | **Já existe** (`confirmar()`) |
| Skip link, foco visível, reduced motion, semântica | **Já existe** |
| Sem handlers inline | O portal não tem nenhum `onclick`; só o código morto C |

## 4. Plano de melhorias (ordem por impacto ÷ esforço)

Cada item respeita as restrições: sem funcionalidade nova, sem dependência nova, sem quebrar fluxos.

| # | Melhoria | Resolve | Impacto | Esforço | Fase |
| --- | --- | --- | --- | --- | --- |
| 1 | Remover `script.js` e `style.css` (código morto) | C1 | Alto | Mínimo | 1 |
| 2 | Silenciar o 404 de `/api/saude` (sondar por outro meio ou aceitar 404 sem log) e conferir zero erros/warnings em todas as páginas | E2 | Alto | Baixo | 1 |
| 3 | Criar em `regras.js` **uma** função `situacao()` (aprovado/recuperação/reprovado) com regras explícitas (média ≥ 6, frequência ≥ 75 %, nota entre 4 e 6 = recuperação, a confirmar) e usá-la nas telas | D5, C5 | Alto | Baixo | 2 |
| 4 | Unificar `aulasDadas` (uma fonte), derivar "matriculados" de matrículas confirmadas + enturmação | D6, D7 | Médio | Baixo | 2 |
| 5 | Unificar ids de turma: professor usa as turmas da escola (`turmas.json`); alocação da Escola passa a definir "Minhas turmas"; enturmação alimenta o diário | D3, D4 | Alto | Médio-alto | 2 |
| 6 | Decidir o destino do protótipo B (ver seção 6) | D1, D2, C3 | Alto | Médio | 2 |
| 7 | Padronizar termo (bimestre ou unidade) em todas as telas | U5 | Médio | Baixo | 3 |
| 8 | Trocar `style=""` dos templates por classes em `componentes.css` | C2 | Médio | Médio | 3 |
| 9 | Estados vazio e carregando padronizados em listas | U4 | Médio | Baixo | 3 |
| 10 | Validação em tempo real e normalização (vírgula/ponto) no diário; máscara de telefone e data na matrícula; foco no primeiro erro | U1, U2 | Médio | Médio | 4 |
| 11 | Trap de foco e Esc consistentes nos diálogos; `pedirTexto` sem fechar ao clicar fora; região `status` do toast existente desde o início | A1, A2, U3 | Médio | Baixo | 5 |
| 12 | Conferir contraste com ferramenta (claro, escuro, alto contraste); trocar `role="list"/"listitem"` por HTML semântico | A4, A5 | Médio | Baixo | 5 |
| 13 | Reconferir 360 px com CDN acessível; corrigir estouro se for real | E4 | Médio | Baixo | 6 |
| 14 | Debounce nas três buscas | E5 | Baixo | Mínimo | 6 |
| 15 | Fontes e Bootstrap: manter CDN (já é a stack) e registrar a limitação offline em `MELHORIAS.md` | E3 | Baixo | Mínimo | 6 |
| 16 | JSDoc nas funções de `regras.js` e `dados.js`; `SUGESTOES.md` | C4 | Baixo | Baixo | 1 |

## 5. Itens que exigiriam funcionalidade nova (não serão implementados; vão para `SUGESTOES.md`)

- Fazer o portal abrir por duplo clique (`file://`) exigiria empacotar os dados em JS (por exemplo `data.js` gerado) ou um build. É mudança estrutural de dados; alternativa proposta: manter `iniciar.bat` e o protótipo B como versão "sem servidor".
- Regra formal de **recuperação** com prova de recuperação, lançamento de nota de recuperação e segunda época: não existe hoje.
- Perfil "Aluno" separado do perfil "Família".
- Boletim por bimestre com quatro notas (hoje há duas unidades).
- Cadastro de estudante/professor pela Secretaria (hoje só matrícula, turma, alocação, enturmação).
- Login real, perfis de acesso e trilha de auditoria persistente no servidor.
- `iniciar.bat` só funciona em Windows: um servidor estático equivalente para Linux/macOS é conveniência nova.

## 6. Decisões de que preciso antes da Fase 1

1. **Qual é "o protótipo" a aprimorar?** Recomendo o **Portal (A)** como produto principal.
2. **O que fazer com o protótipo B?** (a) manter como versão "sem servidor" e alinhar dados e regras ao portal, (b) remover, (c) deixar como está. Recomendo (a), com os mesmos dados-base do portal.
3. **Remover `script.js`/`style.css` (item C)?** Recomendo sim; ficam no histórico do Git.
4. **Termo oficial:** "bimestre" (pedido) ou "unidade" (atual)? Mudar para "bimestre" toca em dados (`n1`, `n2` continuam, só o rótulo muda).
5. **Regra de situação:** confirmo média ≥ 6 e frequência ≥ 75 % para aprovação, e faixa de recuperação entre 4,0 e 5,9? (o README só fixa 6 e 75 %; a faixa de recuperação é minha suposição.)
6. **Unificar turmas do professor e da escola (item 5 do plano)** é a mudança de maior risco: mexe em `professor.json`, `turmas.json` e em três telas. Confirma?
