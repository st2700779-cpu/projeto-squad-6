# Plano de funcionalidades — acesso, matrícula inclusiva, documentos, gestão e diário offline

Data: 29/09/2026 · Base: branch `claude/friendly-goodall-9bwbbq` (portal em várias páginas + protótipo em arquivo único). Este documento é o único produto desta etapa; nada do sistema foi alterado. Aguardo sua aprovação e as respostas da seção 1 antes de começar a Fase 1.

## 1. O que li no projeto e o que isso muda no pedido

Estado atual: portal com quatro visões (`familia/`, `professor/`, `escola/`, `rede/`), páginas ES modules em `assets/js/paginas/`, camada de dados em `dados.js` (lê `data/*.json`; alterações vão para `localStorage` em `estado.js`, ou para a API local do `tools/servidor.ps1`), regras em `assets/js/dominio/`, matrícula em etapas já existente (`familia/matricula.html`), declaração já existente (`familia/declaracao.html`), atos e vagas na visão Rede, diário do professor, assistente com voz de entrada (`assistente/voz.js`). Não há login, `verificar.html`, PWA, mapa, IndexedDB nem QR Code.

Pontos em que o pedido e o projeto não se encaixam de primeira, com o que eu faria por padrão:

| # | Ponto | Padrão que vou seguir se você não disser o contrário |
| --- | --- | --- |
| Q1 | **IA no sistema.** O projeto já tem um assistente com IA opcional (`servicoIA.js`, pasta `worker/`, `prompts/`). Sua restrição 4 diz "nenhuma IA dentro do sistema". Hoje ele roda em "modo sem IA" (só perguntas frequentes), porque `config.js` está sem endereço. | **Não mexer** no assistente e não usá-lo nas telas novas; toda lógica nova é por regras e modelos de texto. Se a decisão do projeto vale também para o assistente existente, diga e eu removo o proxy e deixo só o modo de perguntas frequentes (mudança pequena, mas apaga código). |
| Q2 | **Perfis.** O pedido fala em Aluno, Professor, Secretaria e Matrícula (família, sem login). O portal tem Família, Professor, Escola (= Secretaria) e Rede (SEDUC/DRE). | **Secretaria = visão Escola.** **Rede continua existindo**, com login próprio ("usuário institucional"), e recebe o painel de atos, o mapa de demanda e a falta de professores (4.1 e 4.2 pedem "Secretaria/SEDUC"). **Aluno é uma visão nova** (login por matrícula) com notas, carteirinha, linha do tempo e boletim falado; a visão Família hoje vira o acesso público "Matrícula" (sem login) e ganha o que já existe de acompanhamento só com o login do Aluno. São cinco acessos na entrada, não quatro. |
| Q3 | **Skill `humanizar-frontend`.** Não está instalada nesta sessão. | Aplico o que já está em `SINAIS-DE-IA.md` (tabelas onde o dado é tabular, texto funcional, sem decoração, dados críveis) nas telas novas. |
| Q4 | **Protótipo em arquivo único** (`sistema-academico-seduc-prototipo.html`). Recursos como service worker, `crypto.subtle` e Leaflet não funcionam de forma confiável por `file://`. | **Não estender o protótipo em arquivo único.** Ele fica como está e o README passa a dizer que as funções novas existem só no portal. |
| Q5 | **Hospedagem.** O README fala de GitLab Pages (`.gitlab-ci.yml`); o pedido fala de GitHub Pages. O repositório está no GitHub. | Documentar GitHub Pages (com `.github/workflows/pages.yml` simples que publica a raiz) e manter a seção do GitLab. Todas as URLs do código são relativas (`RAIZ`), então funcionam em subpasta (`/projeto-squad-6/`). |
| Q6 | **Segurança da autenticação.** Login de protótipo: credenciais em `data/usuarios.json`, comparadas no navegador, sessão em `sessionStorage`. Não protege nada. | Comentário claro em `auth.js`, aviso visível na tela de login ("acesso de demonstração") e uma linha no README. Senhas em texto simples, todas fictícias. |
| Q7 | **Contexto seguro.** `crypto.subtle`, service worker e instalação de PWA exigem `https` ou `localhost`. Com `file://` ou pelo IP da rede local sem https, falham. | Detectar e mostrar aviso ("abra pelo endereço publicado ou por localhost"); a declaração cai para um código sem verificação e diz isso. |

## 2. Estrutura nova (vale para todas as fases)

Arquivos novos compartilhados:

- `assets/js/auth.js` — sessão, `exigirPerfil()`, `sair()`. Um único ponto de guarda; cada página interna chama pelo `iniciar()` de `app.js` (não se repete em 20 páginas).
- `assets/js/voz-saida.js` — `falar(texto)` sobre `speechSynthesis` pt-BR, com detecção de voz e retorno de "sem voz". Hoje a leitura em voz alta está em `acessibilidade.js`; o novo módulo reaproveita o que existir lá.
- `assets/js/qr.js` — carrega `qrcodejs` do cdnjs sob demanda e expõe `qrParaElemento(el, texto)`; se a CDN falhar, mostra o link em texto.
- `assets/js/idb.js` — pequeno invólucro de IndexedDB (fase 5).
- `assets/js/dominio/verificacao.js` — código de verificação (SHA-256) usado pela declaração, pela carteirinha e pela página pública.
- `assets/js/dominio/habilitacao.js` — a função única do item 4.2.
- `sw.js` (raiz) e `manifest.json` — fase 3.
- `assets/css/` — `acesso.css` (login e entrada), `tour.css`, `balcao.css` (layout ampliado), `documento.css` (declaração e impressão). Só usam os tokens de `tema.css`; nenhuma cor nova.

Ligação com o que existe: `app.js` (`iniciar`) passa a chamar `exigirPerfil()` e exibir usuário, "Como usar" e "Sair" no cabeçalho. `MENUS` ganha a visão `aluno`. `tools/verificar-contraste.mjs` passa a cobrir os componentes novos.

Testes: os scripts de Playwright que uso ficam fora do repositório (já é assim). Ao fim de cada fase eu rodo os fluxos das visões antigas e os novos em 360, 768 e 1440 px, pelo teclado, com console limpo, e relato o resultado. Um commit por item, em português.

## 3. Dados novos (todos fictícios, todos em `data/`)

| Arquivo | Conteúdo | Usado em |
| --- | --- | --- |
| `usuarios.json` (novo) | Contas de demonstração: aluno (matrícula `a3` → Iasmim), professor (matrícula funcional → `p1`), secretaria (usuário institucional da escola `e1`), rede (usuário da SEDUC). Campos: `perfil`, `login`, `senha`, `refId`, `nome`, `escolaId`. | 1.1 |
| `estudantes.json` (alterar) | Acrescentar `matricula` (número de matrícula de 9 dígitos), `validade` da carteirinha, `bairro`/`municipio`; a chave `id` atual não muda. | 1.1, 3.2 |
| `professores.json` (alterar) | Acrescentar `matriculaFuncional` e `escolaId` de lotação (se `alocacoes.json` já não bastar; vou conferir antes de criar). | 1.1, 4.2 |
| `escolas.json` (alterar) | Acrescentar `bairro`, `lat`, `lng` (coordenadas plausíveis, não exatas). | 2.4 |
| `localidades.json` (novo) | Bairros e municípios com coordenadas, para a família informar onde mora e para a ordenação por distância. | 2.4 |
| `demanda.json` (novo) | Pedidos e crianças em idade escolar sem vaga por município e série (fictício, coerente com `vagas.json`), para comparar demanda e oferta. | 2.4 |
| `tour.json` (novo) | Passos do tour por visão: `alvo` (seletor), título, texto. | 1.2 |
| `arvore-voz.json` (novo) | Árvore de decisão: `{ id, pergunta, opcoes: [{rotulo, icone, cor, proximo}] }`. | 2.3 |
| `trajetorias.json` (novo) | Por estudante: anos, série, escola, transferências e `versaoMatriz` de cada ano. | 3.3 |
| `matrizes.json` (alterar) | Acrescentar em cada versão o campo `mudou` (texto curto do que mudou em relação à anterior). | 3.3 |
| `atos.json` (alterar) | Acrescentar `tipo` (autorização de funcionamento, reconhecimento de curso…) e `curso`; as chaves atuais ficam. | 4.1 |
| `avisos.json` (usado) | Aviso da semana no boletim falado. | 3.4 |

Persistência: o que a pessoa altera continua em `localStorage` (`estado.js`). Só o diário offline usa IndexedDB, porque a fila de sincronização pede registros com status. Com a API local do `servidor.ps1` ligada, nada disso muda; os arquivos novos são só de leitura.

## 4. Item a item

Notação: **Visão** onde entra · **Arquivos** criados (+) ou alterados (~) · **Dados** novos.

### Fase 1 — Acesso e base

**1.1 Entrada e logins por perfil**
- Visão: todas. `index.html` vira a entrada institucional com cinco acessos (Aluno, Professor, Secretaria, Rede/SEDUC, Matrícula sem login).
- Arquivos: ~`index.html`, ~`assets/js/paginas/inicio.js`; + `login.html` (uma página, parâmetro `?perfil=aluno|professor|secretaria|rede`, com o rótulo do campo trocando por perfil: matrícula, matrícula funcional, usuário institucional) e + `assets/js/paginas/login.js`; + `assets/js/auth.js`; + `assets/css/acesso.css`; ~`app.js` (guarda de rota, nome do usuário e "Sair"); ~`estado.js` (sair limpa só a sessão, não os dados da demonstração).
- Comportamento: mostrar/ocultar senha (botão com `aria-pressed`), aviso de Caps Lock, validação por campo com `aria-describedby` e mensagens diferentes para campo vazio, usuário inexistente e senha errada (em demonstração vale dizer qual; comentário no código explica que em produção a mensagem seria única), botão com estado de carregamento (`comEspera`), bloco "Acesso de demonstração" recolhido por padrão com as credenciais, sessão em `sessionStorage`, redirecionamento ao login correto quando falta sessão ou o perfil não confere, comentário de protótipo em `auth.js`.
- Alteração de comportamento a confirmar: hoje qualquer pessoa abre `escola/`, `professor/` etc. direto; depois só com sessão. Os meus testes automáticos passam a entrar por login.
- Dados: `usuarios.json`, campos novos em `estudantes.json` e `professores.json`.

**1.2 Tour de primeiro acesso**
- Visão: as cinco. Um tour de 4 a 6 passos por visão.
- Arquivos: + `assets/js/tour.js`, + `assets/css/tour.css`, ~`app.js` (botão "Como usar" no cabeçalho e disparo no primeiro acesso), + `data/tour.json`.
- Comportamento: balão posicionado junto ao alvo (com o alvo destacado por contorno, sem escurecer a página inteira), foco preso no balão, `role="dialog"`, `aria-live` para o passo, setas ← → e Enter avançam/voltam, Esc fecha, botão "Pular"; cada passo tem "Ouvir" (`speechSynthesis`, pt-BR; sem voz o botão some e o texto segue); flag em `localStorage` por visão (`tour-visto-<perfil>`); `prefers-reduced-motion` sem animação. Se o alvo não existir (menu recolhido no celular), o passo cai no botão do menu.
- Dados: `tour.json`.

### Fase 2 — Matrícula inclusiva

O fluxo em etapas **já existe** (`familia-matricula.js`, com etapas, rascunho e validação); os itens abaixo se apoiam nele, sem criar um segundo.

**2.1 Modo balcão**
- Visão: Escola (Secretaria); botão "Atendimento presencial" na página de matrículas.
- Arquivos: ~`familia-matricula.js` (extrair o formulário para `assets/js/matricula/formulario.js`, que recebe `{ modo: 'online' | 'presencial' }`); + `matricula/balcao.html` (mesma lógica, layout ampliado, protegido pelo perfil Secretaria); + `assets/css/balcao.css` (fonte maior, botões de 56 px); ~`escola-matriculas.js`; ~`dominio/matricula.js` (campo `origem`).
- Comportamento: um só código de formulário; o modo só troca classe de layout e a origem gravada. A tabela de pedidos da Secretaria ganha a coluna "Origem".
- Dados: campo `origem` nos pedidos (padrão `online` nos existentes).

**2.2 Continuar em outro aparelho**
- Visão: família (portal) e balcão.
- Arquivos: + `assets/js/matricula/rascunho-link.js` (serializa o rascunho em JSON compactado e base64url no `#`), + `assets/js/qr.js`; ~`formulario.js` (botão "Continuar em outro aparelho", restauração pelo fragmento e aviso "Você está continuando uma matrícula iniciada por …").
- Comportamento: painel com o link (botão copiar, `navigator.share` quando existir) e o QR; abrir o link restaura dados e a etapa exata. Compactação com `CompressionStream('deflate-raw')` quando o navegador tiver, senão só base64 (o link fica mais longo). O `qrcodejs` vem do cdnjs; se falhar, só o link.
- Limitações que vou registrar: o QR tem limite de tamanho (a partir de uns 2 mil caracteres não lê bem); por isso o rascunho leva só os campos de texto e **nunca** documentos anexados; o link contém dados pessoais do aluno, e não há como revogá-lo (sem servidor).

**2.3 Navegação guiada por voz**
- Visão: portal da família (Matrícula, sem login).
- Arquivos: + `assets/js/paginas/familia-guia.js` (ou seção na página de início da família), + `data/arvore-voz.json`, ~`familia-inicio.js`/`app.js`, `voz-saida.js`.
- Comportamento: botão grande "Ouvir instruções" abre o guia: a pergunta aparece em texto e é lida; as opções são botões grandes com ícone, texto e cor (cor nunca sozinha); "Repetir" e "Voltar" sempre visíveis; cada folha da árvore leva a uma página real (matrícula, mapa de vagas, notas). Sem reconhecimento de fala. Sem voz instalada, o texto e os botões funcionam do mesmo jeito.

**2.4 Mapa de vagas**
- Visão: família (escolas por proximidade) e Rede/Secretaria (círculos de demanda × oferta).
- Arquivos: + `familia/mapa.html`, + `assets/js/paginas/familia-mapa.js`, + `assets/js/mapa/{leaflet.js,distancia.js}`; ~`rede-vagas.js` (aba "Mapa" ao lado da tabela); + `data/localidades.json`, `data/demanda.json`; campos `lat`, `lng`, `bairro` em `escolas.json`.
- Comportamento: Leaflet e CSS pelo cdnjs, tiles do OpenStreetMap com atribuição visível. Família: escolhe bairro/município em uma lista (sem geolocalização automática, para não pedir permissão), as escolas são ordenadas por Haversine e listadas ao lado do mapa, com popup de vagas por série. Rede: círculo por município, raio e cor proporcionais à razão demanda/oferta, legenda em texto e faixas (não só cor). Sem internet, a lista/tabela substitui o mapa e o aviso explica. Marcadores navegáveis por teclado (`keyboard: true`, botões com `aria-label`); a lista repete toda informação do mapa.
- Limitação: coordenadas e demanda fictícias.

### Fase 3 — Documentos e aluno

**3.1 Declaração com QR verificável**
- Visão: Aluno e Escola (Secretaria). A declaração que já existe na família passa a ser do Aluno.
- Arquivos: ~`familia-declaracao.js` → `assets/js/paginas/declaracao.js` (compartilhada), + `assets/css/documento.css` (`@media print`), + `assets/js/dominio/verificacao.js`, + `verificar.html`, + `assets/js/paginas/verificar.js`.
- Código: SHA-256 (`crypto.subtle.digest`) de uma string canônica (matrícula, nome, escola, série, turma, ano letivo, data de nascimento), primeiros 10 caracteres em hexadecimal, formato `XXXX-XXXX-XX`. O QR aponta para `verificar.html?codigo=…`.
- Verificação pública: sem login; recalcula a partir de `data/estudantes.json` (o arquivo central, nunca `localStorage`), percorre os estudantes e mostra "Documento autêntico" com os dados essenciais ou "Documento não encontrado". Campo para digitar o código.
- Limitações a registrar: **só valida quem está no arquivo central**; matrículas novas criadas durante a demonstração (guardadas no navegador) não verificam em outro aparelho. O código atesta que os dados coincidem com o arquivo, não a data de emissão (a data não entra na conta, para o código não mudar a cada dia). Sem `https`, o cálculo não roda (Q7).

**3.2 Carteirinha digital e PWA**
- Visão: Aluno.
- Arquivos: + `assets/js/paginas/aluno-carteirinha.js`, + `aluno/carteirinha.html`, + `manifest.json`, + `sw.js`, + `assets/img/` (ícones 192 e 512 em SVG/PNG gerados, sem marca real), ~`app.js` (registro do service worker e botão "Adicionar à tela inicial" a partir de `beforeinstallprompt`).
- Comportamento: cartão com avatar fictício (iniciais, sem foto real), nome, escola, série, matrícula, validade e QR (o mesmo código da 3.1); faixa com data e hora atuais atualizando por segundo, com animação sutil desligada em `prefers-reduced-motion`; o QR precisa de `qrcodejs` local no cache (baixado do cdnjs no primeiro acesso e guardado pelo service worker).
- Service worker: pré-cache das páginas do aluno, do diário do professor (fase 5), dos CSS/JS locais e dos JSON de dados; estratégia "rede primeiro, cache depois" para dados e "cache primeiro" para os arquivos estáticos, com versão do cache para atualizar.
- Limitações: o botão de instalar depende do navegador (iOS não tem o evento); a faixa de data/hora **não impede** print falsificado, só dificulta; o service worker só roda em `https`/`localhost`.

**3.3 Linha do tempo da vida escolar**
- Visão: Aluno e ficha do aluno na Secretaria (nova página `escola/estudante.html?id=…`, aberta a partir da tabela de matrículas/enturmação).
- Arquivos: + `assets/js/componentes/linha-do-tempo.js`, + `data/trajetorias.json`, + `data/matrizes.json` (campo `mudou`), + `escola/estudante.html`, + `assets/js/paginas/escola-estudante.js`.
- Comportamento: `<ol>` vertical (leitor de tela lê como lista ordenada), item por ano com série, escola, transferência e versão da matriz; quando a versão muda entre um ano e outro, o item ganha um destaque em texto ("Matriz mudou: 2019 → 2025") com a explicação curta.

**3.4 Boletim falado semanal**
- Visão: Aluno.
- Arquivos: + `assets/js/paginas/aluno-boletim-falado.js`, + `assets/js/dominio/boletim-semanal.js`.
- Comportamento: modelo de texto fixo ("Nesta semana, [nome] teve [n] faltas. A nota de [disciplina] foi [x]. Aviso da escola: [aviso]."), com regras para 0 faltas, uma falta, sem nota nova, sem aviso. Botão "Ouvir" (fase 1) e pré-visualização em balão no estilo de mensagem (horário, dois vistos), com rótulo fixo "Simulação: nenhuma mensagem é enviada". A "semana" é a das faltas/notas de referência (`letivo.json`), pois o protótipo não guarda faltas por dia. Isso limita "faltas da semana": vou usar as faltas lançadas na última chamada do diário (`chamadas.json`).

### Fase 4 — Gestão

**4.1 Painel de impacto de atos**
- Visão: Rede (SEDUC) e Escola (Secretaria, filtrada pela escola). Substitui/estende `rede-atos.js`.
- Arquivos: ~`rede-atos.js`, + `assets/js/dominio/impacto-atos.js`, `data/atos.json` (campos `tipo`, `curso`).
- Cálculo: dias restantes até `validade`; turmas afetadas = turmas da escola naquela etapa; alunos afetados = soma dos matriculados dessas turmas (de `turmas.json`/`enturmacao.json`), com um teste que confere a soma.
- Faixas (cor + texto): vencido, até 30 dias, até 90 dias, mais de 90. Filtros por município e por escola, ordenação por urgência. O painel atual (120 dias) muda para as faixas do pedido; renovação continua.

**4.2 Mapa de falta de professores habilitados**
- Visão: Rede; a Escola vê só a sua linha.
- Arquivos: + `assets/js/dominio/habilitacao.js` (função única `componentesSemProfessor(escola, matriz, professores, lotacoes)`, documentada, com testes na verificação), + `rede/professores.html`, + `assets/js/paginas/rede-professores.js`, ~`professores.json` (`escolaId`), dados de matriz já existentes.
- Comportamento: tabela escola × componente (célula marcada quando falta, com texto "falta" e não só cor), resumo por município, botão "Imprimir" com CSS de impressão.

### Fase 5 — Professor sem internet

**5.1 Diário offline**
- Visão: Professor (`professor/diario.html`).
- Arquivos: + `assets/js/idb.js`, + `assets/js/offline.js` (fila e sincronização), ~`professor-diario.js` (grava na fila quando offline), ~`sw.js` (diário no cache), ~`app.js` (indicador fixo online/offline e contador de pendentes).
- Comportamento: registros de nota e chamada salvos em IndexedDB com `status: 'pendente'` e carimbo de tempo; indicador fixo (texto + ícone) com `aria-live` polido; evento `online` dispara a sincronização com o "servidor" simulado (grava no `localStorage`/API local) e mostra confirmação; conflito simples = vale o registro mais recente, com aviso do que foi sobrescrito; botão "Ficar offline" (simulação) que força o estado sem depender da rede.
- Limitações: o "servidor" é o navegador; se o professor limpar os dados do navegador, a fila se perde; sincronização em segundo plano (Background Sync) não usada por falta de suporte geral.

## 5. Ordem, commits e o que eu entrego em cada parada

| Fase | Commits (um por item, em português) | Você testa |
| --- | --- | --- |
| 1 | `feat: entrada e login por perfil com proteção de rotas` · `feat: tour de primeiro acesso com leitura em voz alta` | Entrar com cada perfil, tentar abrir página de outro perfil, Caps Lock, "Como usar" |
| 2 | `refactor: extrai formulário de matrícula` (preparação) · `feat: modo balcão` · `feat: continuar matrícula em outro aparelho` · `feat: navegação guiada por voz` · `feat: mapa de vagas` | Matrícula online e presencial, link/QR em outro aparelho, guia de voz, mapa com e sem internet |
| 3 | `feat: declaração com QR verificável` · `feat: carteirinha digital e PWA` · `feat: linha do tempo da vida escolar` · `feat: boletim falado semanal` | Imprimir declaração, verificar em `verificar.html`, instalar PWA, carteirinha offline |
| 4 | `feat: painel de impacto de atos` · `feat: mapa de falta de professores habilitados` | Faixas de urgência, filtros, tabela de faltas |
| 5 | `feat: diário offline com sincronização` | Ficar offline, lançar, voltar, conferir a fila e o conflito |
| Final | `docs: README com credenciais, publicação, roteiro de 10 minutos e limitações` | — |

Fases e commits no fim de cada uma vão para a mesma branch/PR (#1) ou, se preferir, para uma branch nova a partir dela: veja a pergunta 4.

## 6. Riscos que já vejo

- **Rotas protegidas quebram meus testes e os seus atalhos** (`iniciar-visao.bat` abre uma visão direta). Vou ajustar o `.bat` para abrir a entrada.
- **Service worker em cache antigo** pode servir tela velha durante os testes; a versão do cache muda a cada fase e vou documentar como limpar.
- **CDNs novos** (Leaflet, qrcodejs, tiles do OSM) só funcionam com internet; há alternativa em texto nos dois casos, mas o QR sem `qrcodejs` só mostra o link.
- **Tamanho do trabalho:** são 14 itens. Sugiro executar fase por fase como você pediu; a Fase 2 é a maior.

## 7. Perguntas de que preciso (o padrão de cada uma está nas seções acima)

1. **Q1:** manter o assistente com IA opcional que já existe no projeto, ou removê-lo para cumprir "nenhuma IA no sistema"? (Padrão: manter, fora do que for novo.)
2. **Q2:** de acordo com Aluno como visão nova, Secretaria = Escola e Rede como quinto acesso com login? (Padrão: sim.)
3. **Q4:** o protótipo em arquivo único fica de fora das funções novas? (Padrão: sim.)
4. **Branch:** continuo na `claude/friendly-goodall-9bwbbq` (PR #1, que já tem as duas etapas anteriores) ou abro outra? Este ambiente só me deixa publicar em `claude/friendly-goodall-9bwbbq`; se quiser branch separada, diga o nome.
5. **Login da família:** o acesso "Matrícula" deve continuar levando à visão Família inteira (início, notas, documentos) sem login, ou só ao formulário de matrícula, mapa e guia por voz? (Padrão: só formulário de matrícula, mapa e guia; notas e documentos passam para o Aluno.)

## 8. Como ficou (execução, 30/09/2026)

Tudo foi feito com os padrões das respostas da seção 7 (a aprovação veio sem alterações). Diferenças em relação ao plano:

- **Modo balcão:** o formulário está em `assets/js/matricula/formulario.js` e a página é `escola/atendimento.html` (não `matricula/balcao.html`), para herdar o login e o menu da Secretaria.
- **Fichas da secretaria:** além da ficha, foram criadas `escola/estudantes.html` (lista) e `escola/professores.html` (linha da própria escola).
- **Turmas de outras escolas:** entram em `data/turmas-rede.json`, lido só pelo painel de atos; as telas da secretaria seguem só com as turmas da escola `e1`.
- **Fundamental no mapa de professores:** componentes em `data/componentes-etapa.json`; o Médio vem de `data/matrizes.json`.
- **Service worker:** a lista de arquivos e a versão são geradas por `tools/gerar-sw.mjs`.
- **Não testado:** Leaflet, `qrcodejs` e tiles do OpenStreetMap foram testados com cópias locais das mesmas bibliotecas (o ambiente de teste não alcança o cdnjs); a instalação do PWA e o `beforeinstallprompt` não foram exercitados; a voz do `speechSynthesis` foi testada com um substituto que registra o texto; o workflow do GitHub Pages não foi executado.
