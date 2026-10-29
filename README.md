# Portal Acadêmico — Squad 6

Protótipo front-end do Sistema Acadêmico para a Rede Estadual de Ensino de Sergipe (SEED/SE), desenvolvido na Residência RiseUp. Tem cinco acessos (aluno, professor, secretaria, rede e matrícula pela família, sem login), carteirinha e declarações verificáveis por QR Code, mapa de vagas, matrícula inclusiva (balcão, outro aparelho, guia por voz), diário que funciona sem internet e um **Assistente de Matrícula e Dúvidas** com IA opcional, por texto e voz.

Todos os dados são **simulados**. O projeto não se conecta a sistemas da SEED.

## O que tem aqui

| Pasta | Conteúdo |
| --- | --- |
| `index.html`, `login.html`, `verificar.html`, `aluno/`, `responsavel/`, `professor/`, `coordenador/`, `diretor/`, `escola/` (secretaria), `rede/`, `profin/`, `familia/` | Entrada, login, verificação pública de documentos e páginas de cada perfil (`familia/` é a matrícula aberta, sem login) |
| `manifest.json`, `sw.js`, `assets/img/` | PWA: manifesto, service worker (gerado por `tools/gerar-sw.mjs`) e ícones |
| `assets/css/` | `tema.css` (tokens do design system), `componentes.css`, `layout.css` (cabeçalho, menu, breadcrumb), `painel.css` (semáforo, anel de frequência, mapa de calor, barras, visual por faixa etária, agenda, quiz, reunião) e `assistente.css` |
| `assets/js/` | Núcleo (`app`, `estado`, `dados`, `regras`, `acessibilidade`, `ui`) e páginas |
| `assets/js/dominio/` | Regras de negócio por domínio: `matricula`, `notas`, `turmas`, `equivalencias` (`regras.js` reexporta todas), mais `painel` (semáforo, margem de faltas, nota necessária, agenda, prioridades), `horario`, `profin`, `codigos`, `verificacao`, `impacto-atos`, `habilitacao`, `boletim-semanal`, `trajetoria` e `sincronizacao` |
| `assets/js/matricula/`, `assets/js/mapa/`, `assets/js/componentes/` | Formulário de matrícula único (online e balcão) e rascunho por link; mapa (Leaflet, Haversine); linha do tempo |
| `assets/js/auth.js`, `tour.js`, `qr.js`, `idb.js`, `offline.js` | Login de protótipo, guia de primeiro acesso, QR Code, IndexedDB e estado de conexão |
| `sistema-academico-seed-prototipo.html` | Protótipo em arquivo único, abre com duplo clique. Usa os mesmos dados e regras do portal (ver `tools/gerar-prototipo.mjs`) |
| `assets/js/assistente/` | Assistente: interface, chamada à IA, erros, perguntas frequentes, voz |
| `data/` | Dados simulados em JSON e a base de conhecimento do assistente |
| `prompts/` | Prompt de sistema versionado, registro de alterações e bateria de testes |
| `worker/` | Proxy do assistente (Cloudflare Workers), que guarda a chave da IA |
| `tools/` | Servidor local, bateria de perguntas do assistente, `gerar-prototipo.mjs` (sincroniza o protótipo em arquivo único), `verificar-contraste.mjs` (confere o contraste dos tokens, inclusive os do `painel.css`) e `testar-painel.mjs` (testes das regras dos painéis) |
| `wireframes/` | Wireframes e fluxos de todas as telas (110 quadros, inclusive mobile, login centralizado, Configurações, cadastros da rede, prestação de contas, justificativa de falta, registro e plano de aula, transferência de matrícula, senha temporária e fluxos), em HTML comum: abra `wireframes/index.html` com duplo clique, sem servidor e sem internet |
| `CHECKLIST-PROTOTIPACAO.md` | Conferência item a item do checklist de prototipação por perfil: o que já existia, o que foi acrescentado e o que ficou para a fase 2 |
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

**Arquivos `.bat` (Windows, dois cliques):**

| Arquivo | O que faz |
| --- | --- |
| `iniciar.bat` | Menu: portal no computador, em janela de celular, protótipo ou reiniciar a demonstração. Se o PowerShell estiver bloqueado, tenta com Python |
| `iniciar-local.bat` | Um clique: sobe o servidor local (Python; sem Python, o do PowerShell), abre a entrada no navegador e mostra as contas de demonstração |
| `iniciar-visao.bat` | Abre o portal direto em uma visão (Família, Professor, Escola ou Rede) |
| `iniciar-python.bat` | Sobe o portal com o servidor do Python, sem PowerShell e sem API (dados ficam no navegador). Aceita a página como argumento: `iniciar-python.bat professor/index.html` |
| `iniciar-mobile.bat` | Abre só o protótipo em arquivo único, em janela de celular |
| `verificar.bat` | Atualiza o protótipo com os dados e regras do portal e confere o contraste das cores nos quatro temas (precisa de Node.js 18+) |

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

**Abrir com duplo clique:** só o protótipo `sistema-academico-seed-prototipo.html` funciona assim. Depois de mudar `data/` ou `assets/js/dominio/notas.js`, rode `node tools/gerar-prototipo.mjs` para atualizá-lo.

## Acesso e contas de demonstração

O login é **só de protótipo**: as contas ficam em `data/usuarios.json` (senhas em texto simples, todas fictícias), a conferência é feita no navegador e a sessão fica em `sessionStorage`. Não protege nada.

| Perfil | Login | Senha |
| --- | --- | --- |
| Aluno | `202610317` (Iasmim, 1ª série EM), `202610842` (Ravi, 7º ano) ou `202610955` (Heitor, 3º ano) | `aluno2026` |
| Responsável | `RESP-20417` (Edilene Cardoso de Jesus, mãe dos três) | `resp2026` |
| Professor | `PF-30412` (Profa. Rosângela Tavares Góis) | `prof2026` |
| Coordenação pedagógica | `coord.osvaldo` | `coord2026` |
| Direção | `dir.osvaldo` | `diretor2026` |
| Secretaria | `secretaria.osvaldo` (C. E. Prof. Osvaldo Tavares Rezende) | `secretaria2026` |
| Rede (SEED e DRE) | `seed.tecnico` | `rede2026` |
| PROFIN | `profin.seed` | `profin2026` |
| Matrícula (família) | não pede login | |

A tela de login tem um bloco "Acesso de demonstração" com essas contas e um botão que preenche os campos.

A senha pode ser trocada em **Configurações › Conta › Alterar senha**. A troca vale só no aparelho (fica como resumo SHA-256 no `localStorage`); **Restaurar dados de demonstração** volta às senhas da tabela. A sessão encerra sozinha depois de 30 minutos sem uso.

## Funcionalidades

| Item | Onde | O que faz |
| --- | --- | --- |
| Login por perfil e proteção de rotas | `login.html`, `assets/js/auth.js` | Mostrar senha, aviso de Caps Lock, erros específicos, redireciona ao login certo |
| Guia de primeiro acesso | botão **Como usar** no cabeçalho | 4 a 6 passos por visão, com leitura em voz alta, setas e Esc |
| Modo balcão | Secretaria › Matrículas › Atendimento presencial | Mesmo formulário da família em layout ampliado; o pedido grava a origem (presencial ou online) |
| Continuar em outro aparelho | qualquer passo da matrícula | Link e QR Code com o rascunho no fragmento `#` do endereço |
| Ouvir instruções | `familia/guia.html` | Árvore de decisão em `data/arvore-voz.json`, lida por `speechSynthesis`, com Repetir e Voltar |
| Mapa de vagas | `familia/mapa.html` (escolas por distância) e `rede/mapa.html` (demanda x oferta) | Leaflet com tiles do OpenStreetMap; sem internet, lista e tabela no lugar do mapa |
| Declaração verificável | `aluno/declaracao.html`, `verificar.html` | Código SHA-256 e QR; a página pública recalcula o código a partir de `data/` |
| Carteirinha digital e PWA | `aluno/carteirinha.html`, `sw.js` | QR, faixa com data e hora, abre sem internet, Adicionar à tela inicial |
| Linha do tempo | `aluno/linha-do-tempo.html`, `escola/estudante.html` | Anos, escolas, transferências e versão da matriz, com destaque quando a matriz mudou |
| Boletim falado | `aluno/boletim-falado.html` | Modelo de texto fixo, botão Ouvir e prévia em balão de conversa (simulação) |
| Painel de impacto de atos | `rede/atos.html` | Faixas de prioridade, turmas e estudantes afetados, filtros por município e escola |
| Professores habilitados | `rede/professores.html`, `escola/professores.html` | Tabela escola x componente sem professor habilitado (`assets/js/dominio/habilitacao.js`) |
| Diário offline | `professor/diario.html` | Fila em IndexedDB, faixa online/offline, botão **Ficar offline** e sincronização com conflito pelo registro mais recente |
| Visual por faixa etária | início do aluno | Anos iniciais (mascote e cartões grandes), anos finais (barra de frequência e selos) e ensino médio (painel denso); vem da série, com o seletor "Ver visual de" para comparar |
| Frequência proativa | `aluno/frequencia.html` | Anel e barra que mudam de cor, margem de faltas em linguagem neutra e **Simular falta hoje** |
| Provas e rotina | `aluno/rotina.html` | Agenda por urgência, calculadora "Quanto preciso tirar" e modo **Dia de Prova** |
| Quiz por unidade | `aluno/quiz.html`, `data/quiz.json` | Uma pergunta por vez, retorno imediato e histórico só no navegador |
| Responsável | `responsavel/` | Painel "o que precisa da sua atenção", semáforo, modo simplificado, calendário com reunião de pais e matrícula e documentos |
| Professor: mapa de calor, painel de hoje e observações rápidas | `professor/` | Mapa de calor da turma, trocador de turma fixo, chips de observação (Alt+1 a Alt+6), materiais e comunicados |
| Direção e coordenação | `diretor/`, `coordenador/` | Visão da escola, mapa de calor, comparativo de turmas, marcador de atenção manual, horários e telas de reunião para projetar ou imprimir |
| Central de solicitações e busca com dois códigos | `escola/solicitacoes.html`, `escola/estudantes.html` | Fila de pedidos com prazo em cor; busca que mostra o código do aluno e o da matrícula lado a lado |
| PROFIN | `profin/` | Painel por escola e categoria, anotações de contexto e rascunho de relatório (modelo fixo) |

**Sem IA no que é novo:** todas essas telas usam regras fixas, modelos de texto e árvores de decisão. O assistente com IA opcional (`worker/`) continua como era e segue desligado sem `assistenteUrl` em `config.js`.

## Leitura por perfil (melhorias essenciais)

Depois de ler o sistema como cada usuário, foram acrescentadas as peças que faltavam para o trabalho do dia, em duas rodadas. O detalhe de cada perfil, os erros achados no caminho e os limites que continuam estão em [`ANALISE-POR-PERFIL.md`](ANALISE-POR-PERFIL.md).

| Perfil | O que ganhou | Onde |
| --- | --- | --- |
| Todos | **Alterar senha**, "Esqueci minha senha", encerramento da sessão depois de 30 minutos sem uso e **senha temporária com troca obrigatória** no primeiro acesso | `configuracoes.html`, `login.html`, `assets/js/app.js` |
| Responsável | **Justificar falta** (período, motivo, anexo, protocolo e andamento) e **Imprimir boletim**; aviso quando a matrícula do estudante foi transferida ou cancelada | `responsavel/justificar.html`, `responsavel/boletim.html` |
| Aluno | **Imprimir boletim**, frequência já **sem as faltas abonadas** | `aluno/notas.html`, `aluno/frequencia.html` |
| Aluno, responsável, professor e secretaria | **Avisos lidos**: etiqueta *Novo*, marcar como lido, marcar todos e contador no menu | `aluno/calendario.html`, `professor/avisos.html`, `escola/avisos.html` |
| Secretaria | **Justificativas** (aceitar abona a falta; recusar pede explicação), **Transferências** (transferir para outra escola ou cancelar matrícula, com desfazer) e **Acessos e senhas** (senha temporária) | `escola/justificativas.html`, `escola/movimentacoes.html`, `escola/acessos.html` |
| Professor | **Registro de aula** (conteúdo, tarefa, nº de aulas) e **Plano de aula** com habilidades da BNCC pelo código (confere o formato e o ano da turma) | `professor/registro-aula.html`, `professor/plano-aula.html` |
| Coordenação | **Registros de aula** (consulta por turma, **alerta de turma sem registro há mais de 7 dias** e planos de aula) | `coordenador/registros-aula.html` |
| Rede | **Editar escola**, **registrar ato renovado**, **editar e desligar professor**, **mudar o professor de escola** (com histórico de lotação) e **Acessos e senhas** das contas institucionais | `rede/escolas.html`, `rede/atos.html`, `rede/professores.html`, `rede/acessos.html` |
| PROFIN | **Lançar repasse** e **estornar repasse** (só se o valor ainda estiver livre) | `profin/index.html` |

As regras ficam em `assets/js/dominio/` (`senha.js`, `vida-escolar.js`, `plano-aula.js`, `movimentacao.js`, `avisos.js`, `hoje.js`, e `cadastros.js` e `prestacao.js` ampliados) e têm testes em `tools/testar-cadastros.mjs`.

## Roteiro de demonstração de 10 minutos

1. **Entrada e tour (1 min).** Abra `index.html`, entre como Aluno (`202610317` / `aluno2026`) e deixe o guia de primeiro acesso rodar; clique em Ouvir em um passo.
2. **Carteirinha e offline (2 min).** Abra Carteirinha: QR e faixa com data e hora. Em um celular, use Adicionar à tela inicial; nas ferramentas do navegador, marque Offline e recarregue: a carteirinha abre.
3. **Declaração verificável (1 min).** Em Documentos, emita a declaração de matrícula, leia o QR com outro aparelho (ou copie o código para `verificar.html` em outra aba): Documento autêntico.
4. **Vida escolar e boletim falado (1 min).** Veja a linha do tempo (a matriz mudou em 2024) e ouça o boletim falado da semana.
5. **Matrícula inclusiva (2 min).** Saia e entre em Matrícula, sem login. Comece o pedido, use Continuar em outro aparelho e abra o link em outra aba: volta ao mesmo passo. Depois abra Ouvir instruções e Escolas com vaga (escolha um bairro).
6. **Secretaria (1 min).** Entre como Secretaria (`secretaria.osvaldo` / `secretaria2026`), abra Atendimento presencial, faça um pedido e veja a origem "Presencial" na lista; abra a ficha de um estudante.
7. **Rede (1 min).** Entre como Rede (`seed.tecnico` / `rede2026`): Atos autorizativos (impacto em turmas e estudantes), Mapa de vagas e Professores habilitados. Depois, **Escolas** (cadastre uma escola com o ato e os níveis liberados e abra as vagas), **Matrizes e carga horária** e **Equipe do PROFIN**.
8. **Visual por idade (2 min).** Entre com `202610955` (3º ano), `202610842` (7º ano) e `202610317` (1ª série) e compare o início de cada um. No de 1ª série, abra Frequência e use **Simular falta hoje**; em Provas e rotina, abra o modo **Dia de Prova**.
9. **Responsável (1 min).** Entre como Responsável (`RESP-20417` / `resp2026`), troque de filho no alto e ligue o **Modo simplificado**.
10. **Direção e coordenação (2 min).** Entre como Coordenação (`coord.osvaldo` / `coord2026`), marque a atenção de uma turma e abra Comparar turmas; depois, como Direção (`dir.osvaldo` / `diretor2026`), abra a Tela de reunião.
11. **PROFIN (1 min).** Entre como PROFIN (`profin.seed` / `profin2026`), anote o contexto de uma escola e gere o rascunho do relatório. Abra a **Análise das declarações**, confira os gastos de uma escola e devolva o retorno; a direção (`dir.osvaldo` / `diretor2026`) vê o retorno em **Prestação de contas**, onde também declara os gastos.
12. **Professor sem internet (1 min).** Entre como Professor (`PF-30412` / `prof2026`), abra o Diário, clique em Ficar offline, lance uma nota e registre a chamada, depois Voltar online: os registros pendentes são sincronizados.
13. **Justificar falta (2 min).** Como Responsável, abra **Justificar falta**, escolha uma data sugerida e o motivo e envie. Entre como Secretaria, abra **Justificativas** e aceite ou recuse (a recusa pede uma explicação); volte como Responsável e veja a decisão.
14. **Registro de aula e senha (1 min).** Como Professor (`PF-30412` / `prof2026`), abra **Registro de aula** e registre o conteúdo de um dia; a Coordenação vê em **Registros de aula**. Em **Configurações › Conta**, troque a senha e saia; entre com a nova.
15. **Transferência e senha temporária (2 min).** Como Secretaria, abra **Transferências**, transfira um estudante para outra escola (a lista mostra as vagas de cada destino) e depois **Desfazer**; abra **Acessos e senhas**, gere uma senha temporária para a aluna e entre como ela: o portal só abre as Configurações até ela definir a senha nova.
16. **Abono e avisos (1 min).** Aceite uma justificativa de falta e veja a frequência da aluna subir (as faltas abonadas aparecem no boletim e no diário, que não muda). Em **Calendário e avisos**, marque avisos como lidos e acompanhe o contador no menu.

Antes de repetir a demonstração, use **Restaurar dados de demonstração** na entrada (apaga também a fila offline).

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

## Publicar gratuitamente

O **QR Code que abre em outro aparelho, o PWA (service worker) e a verificação de documentos** só funcionam em `https` ou `localhost`. Publicar em GitHub Pages resolve isso, com endereço público para o celular de quem for testar.

**GitHub Pages (recomendado):**

1. No repositório, abra **Settings → Pages → Build and deployment** e escolha **Source: GitHub Actions**.
2. Faça merge na branch `main` (ou rode **Actions → Publicar no GitHub Pages → Run workflow**). O arquivo `.github/workflows/pages.yml` monta a pasta do site e publica.
   Se o Pages não estiver ativado, o workflow não falha: ele mostra um aviso e pula a publicação (o site continua no Netlify). Repositório **privado** só publica no Pages em plano pago; em conta gratuita, deixe o repositório público para ativar.
3. O endereço é `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`. Todos os caminhos do código são relativos, então funciona dentro de uma subpasta.
4. Depois de acrescentar arquivos às telas que abrem sem internet, rode `node tools/gerar-sw.mjs` antes do commit.

**GitLab Pages:** o arquivo `.gitlab-ci.yml` publica o site a cada commit na branch principal. O endereço aparece em **Deploy → Pages**.

Sem `https` (Live Server em outro computador da rede, por exemplo) o portal abre, mas o código de verificação, a instalação do PWA e o diário offline pelo service worker não funcionam.

## Rodar a bateria de testes do assistente

Com o proxy no ar:

```bash
node tools/testar-assistente.mjs https://SEU-PROXY.workers.dev/api/assistente https://SEU-GRUPO.gitlab.io
```

O script faz as 30 perguntas de `prompts/testes/perguntas-teste.json`, mostra acertos e tempo mediano e salva o resultado em `prompts/testes/`. Registre o resultado e cada ajuste no `prompts/CHANGELOG.md`. As datas e prazos das respostas precisam de revisão manual.

## Testes das regras e do contraste

Sem instalar nada (Node 22 ou mais novo):

```bash
node tools/testar-painel.mjs        # semáforo, margem de faltas, calculadora, agenda, horários, prioridades e PROFIN
node tools/testar-cadastros.mjs     # cadastro e edição de escola e ato, professor e lotação, equipe do PROFIN, carga horária, declaração dos gastos, repasse e estorno, senha, aula e plano de aula, justificativa e abono, avisos lidos, transferência e cancelamento
node tools/verificar-contraste.mjs  # contraste dos tokens nos quatro temas, inclusive as cores do painel.css
```

As telas foram conferidas em Chromium (Playwright) em 360, 768 e 1440 px; esses roteiros de navegador não fazem parte do repositório.

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
- Semáforo (sempre com cor, símbolo e palavra): nota verde com média 6,0 ou mais, amarelo de 4,0 a 5,9, vermelho abaixo de 4,0; frequência verde com 85% ou mais, amarelo de 75% a 84,9%, vermelho abaixo de 75%; prazo vermelho se vencido ou em até 3 dias, amarelo até 14 dias, verde depois (`assets/js/dominio/painel.js`).
- Margem de faltas: o limite é 25% das aulas dadas até hoje (83 aulas, 20 faltas) e a margem é o que sobra dele. Faltar um dia perde as aulas do dia no horário da turma.
- Nota necessária: a média do ano é a média dos quatro bimestres; a calculadora mostra a nota por bimestre que falta para a média escolhida.
- PROFIN: prestação entregue é verde; atrasada é vermelha (pode suspender o repasse); a vencer em até 30 dias é amarela. O pior caso decide a situação da escola.
- Ações irreversíveis pedem confirmação, e confirmações, recusas, aprovações, enturmações, alocações, chamadas e declarações ficam no histórico de ações (quem e quando).

## Limitações por funcionalidade

Tudo é protótipo sem servidor: o "servidor" é o `localStorage` do navegador (ou a API local do `iniciar.bat`).

- **Senha trocada ou temporária:** vale só no navegador em que foi feita; não há servidor de contas.
- **Justificativa de falta:** só o nome e o tamanho do anexo ficam registrados. O abono vale para a falta que veio da chamada, com data; o diário do professor guarda a falta como foi lançada.
- **Transferência:** o pedido chega à secretaria de destino, mas a demonstração só tem a secretaria de uma escola; a outra ponta é testada, não demonstrável.
- **Plano de aula:** a tela confere o formato do código da BNCC e se ele combina com o ano da turma, não o texto da habilidade.
- **Login:** contas no arquivo de dados, senha em texto simples e sessão em `sessionStorage`. Serve para separar as visões na demonstração, não para proteger dados.
- **Tour:** usa a voz em português instalada no aparelho; sem ela, só o texto. O "já visto" fica em `localStorage`, por navegador.
- **Modo balcão:** o pedido só existe no navegador em que foi feito.
- **Continuar em outro aparelho:** o rascunho vai no endereço, sem servidor. O link contém dados pessoais e não pode ser revogado. Passa de uns 1.800 caracteres, o QR deixa de ser gerado (só o link). Documentos anexados não vão no link. O `qrcodejs` vem do cdnjs, então precisa de internet na primeira vez.
- **Guia por voz:** só leitura em voz alta; a árvore é fixa. Não há reconhecimento de fala.
- **Mapa:** Leaflet e tiles do OpenStreetMap exigem internet (sem ela, a lista e a tabela substituem). Coordenadas, distâncias em linha reta e a demanda são fictícias.
- **Declaração e verificação:** o código prova que os dados do papel batem com `data/`, não quem emitiu nem quando. Matrículas feitas ou confirmadas durante a demonstração não estão em `data/` e por isso não verificam em outro aparelho. Precisa de `https` ou `localhost` (`crypto.subtle`).
- **Carteirinha e PWA:** a faixa com data e hora só dificulta print falso. O botão de instalar depende do navegador (no iPhone é pelo menu Compartilhar). O QR offline depende de o `qrcodejs` ter sido guardado numa visita anterior com internet.
- **Linha do tempo:** trajetórias e versões de matriz do Ensino Fundamental são fictícias.
- **Boletim falado:** usa as chamadas do diário; nada é enviado a ninguém. A "semana" termina na última chamada registrada.
- **Impacto de atos:** turmas de outras escolas vêm de `data/turmas-rede.json` (fictício); a secretaria só gerencia as da própria escola.
- **Professores habilitados:** conta só a habilitação e a lotação. Não olha carga horária. A matriz do Ensino Fundamental está em `data/componentes-etapa.json`.
- **Painéis por perfil:** a data de referência (07/10/2026, em `data/letivo.json`) é o "hoje" da agenda, dos prazos e do horário do dia. O diário só tem Matemática; as outras matérias e as turmas sem diário vêm de `data/desempenho.json`. Os valores do PROFIN são inventados. Materiais do professor guardam só o nome do arquivo. O mapa de calor tem três níveis, de propósito, para cada um ter símbolo e palavra. Streak, arrastar e soltar e widgets reordenáveis ficaram para a fase 2 (ver `CHECKLIST-PROTOTIPACAO.md`).
- **Diário offline:** a fila fica em IndexedDB e some se a pessoa limpar os dados do navegador. Não usa Background Sync (sincroniza com a página aberta). Conflito: vale o registro mais recente pelo horário do aparelho, que pode estar errado. Duas abas gravam no mesmo `localStorage`, então o último a gravar leva o estado inteiro (a sincronização relê antes de gravar para reduzir o problema).

## Padrões da equipe

- Uma branch por história (`hu04-matricula`, `ia04-falhas`) e merge request revisado por outra pessoa.
- Conteúdo com contribuição relevante de ferramentas de IA leva “Assistido por IA” na descrição do merge request.
- Nunca commitar `worker/.dev.vars` nem colar chaves ou dados pessoais em ferramentas de IA.

Documentação completa: Entrega Parcial, Tópicos 1.1, 2.1, 3.1, 4.1 e 4.2.
