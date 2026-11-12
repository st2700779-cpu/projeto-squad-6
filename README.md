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
| `PUT` | `/api/{nome}` | Grava um conjunto alterável (lista `$ALTERAVEIS` em `tools/servidor.ps1`: matrículas, turmas, diário, escolas novas, atos novos, cursos, lista de espera…); os demais são só leitura |
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
| Rede: SEED central (vê todas as DREs) | `seed.tecnico` | `rede2026` |
| Rede: técnico de uma diretoria (vê só a sua regional) | `dea.aracaju`, `dre1.estancia`, `dre2.lagarto`, `dre3.itabaiana`, `dre4.japaratuba`, `dre5.dores`, `dre6.propria`, `dre7.gararu`, `dre8.socorro` ou `dre9.gloria` | `rede2026` |
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
| Notas por bimestre | `professor/notas.html` | Prova (60%), atividade (30%) e presença (10%, da chamada); cada nota é lançada uma vez e fica travada; só o bimestre em andamento abre |
| Retirada de falta | `professor/diario.html` | Faltas vêm da chamada do registro de aula; retirar exige escolher a data e um motivo da lista, que fica registrado na chamada |
| Visual por faixa etária | início do aluno | Anos iniciais (mascote e cartões grandes), anos finais (barra de frequência e selos) e ensino médio (painel denso); vem da série, com o seletor "Ver visual de" para comparar |
| Frequência proativa | `aluno/frequencia.html` | Anel e barra que mudam de cor, margem de faltas em linguagem neutra e **Simular falta hoje** |
| Provas e rotina | `aluno/rotina.html` | Agenda por urgência, calculadora "Quanto preciso tirar" e modo **Dia de Prova** |
| Quiz por unidade | `aluno/quiz.html`, `data/quiz.json` | Uma pergunta por vez, retorno imediato e histórico só no navegador |
| Responsável | `responsavel/` | Painel "o que precisa da sua atenção", semáforo, modo simplificado, calendário com reunião de pais e matrícula e documentos |
| Professor: mapa de calor, painel de hoje e observações rápidas | `professor/` | Mapa de calor da turma, trocador de turma fixo, chips de observação (Alt+1 a Alt+6), materiais e comunicados |
| Direção e coordenação | `diretor/`, `coordenador/` | Visão da escola, estrutura da escola (séries, salas, turnos), turmas e vagas, financeiro, mapa de calor, comparativo de turmas, marcador de atenção manual, horários com escolha de disciplina e professor e telas de reunião para projetar ou imprimir |
| Central de solicitações e busca com dois códigos | `escola/solicitacoes.html`, `escola/estudantes.html` | Fila de pedidos com prazo em cor; busca que mostra o código do aluno e o da matrícula lado a lado |
| PROFIN | `profin/` | **Prestação de contas** (painel com Ver como técnico ou gestor, cartão por escola, pendências e contexto, rascunho do relatório), **ficha da escola** (saldo, o que falta, como gasta, declarações, contexto) e relatório consolidado (modelo fixo) |

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

### Rede: dados que se calculam sozinhos (terceira rodada)

| O que mudou | Como funciona agora | Onde |
| --- | --- | --- |
| **Vagas calculadas** | Ninguém digita o número de vagas. Vaga = vagas da turma − estudantes nas turmas aprovadas, menos os pedidos de matrícula que ainda não têm turma, separado por turno. Pedir matrícula segura a vaga; recusar devolve; transferir libera na origem, sem ninguém mexer no número. Desde a quarta rodada, quem cria as turmas e diz as vagas de cada uma é a **direção da escola** | `assets/js/dominio/vagas.js`, `diretor/turmas.html`, `diretor/vagas.html` |
| **Procura por bairro** | O mapa compara, por bairro, a procura (pedidos aguardando + lista de espera) com as vagas das escolas do bairro. A família informa o bairro na matrícula e, se nenhuma escola da cidade tem vaga, entra na **lista de espera** pelo portal | `assets/js/dominio/demanda.js`, `rede/mapa.html`, `familia/matricula.html`, `data/lista-espera.json` |
| **Dados que já existem** | **Buscar no Censo Escolar** pelo código INEP preenche a escola; **Buscar no RH** pelo CPF preenche o professor (as duas bases são simuladas) | `data/censo-escolar.json`, `data/rh-servidores.json` |
| **Atos com histórico e PDF** | Cada nível mostra o ato atual e todos os anteriores, com o PDF da resolução. A coluna da lista mostra um ato por nível (antes os atos dos níveis apareciam misturados) | `rede/escolas.html` (botão **Atos**), `assets/js/arquivos.js` |
| **Acesso por DRE** | A conta de uma DRE vê e altera só as escolas da sua regional; a SEED central vê todas. Matrizes e Equipe do PROFIN ficam só com a SEED | `assets/js/dre.js`, `data/dres.json`, `data/usuarios.json` |
| **DRE → município** | No cadastro e na edição, escolha a DRE primeiro: a lista de municípios mostra só os dela. As listas da rede filtram por DRE e município | `rede/escolas.html`, `rede/atos.html`, `rede/mapa.html` |
| **Ponto de referência** | Campo opcional no endereço da escola | `rede/escolas.html` |
| **Séries que a escola tem** | A rede libera os níveis pelo ato; dentro de cada nível, a **direção** escolhe as séries que a escola oferece (Direção › Estrutura da escola). A série que sai some da matrícula e das vagas | `diretor/escola.html`, `assets/js/dominio/estrutura.js`, `assets/js/dominio/matricula.js` (`atoDaEtapa`) |
| **Cursos** | Tela nova para cadastrar cursos (regular, tempo integral, técnico integrado, EJA…). O cadastro da escola escolhe o curso de cada nível, que fica no ato | `rede/cursos.html`, `data/cursos.json` |
| **Data em dd/mm/aaaa** | Todos os campos de data aparecem no padrão brasileiro em qualquer navegador (o `<input type="date">` mostrava mm/dd/yyyy em navegador em inglês). O valor guardado continua AAAA-MM-DD | `assets/js/componentes/data-br.js` |

### Quarta rodada: tudo vem de um cadastro, a escola gerencia as turmas, PROFIN consolidado e matrícula como a oficial

| O que mudou | Como funciona agora | Onde |
| --- | --- | --- |
| **Cadastros da rede** | Tela nova da SEED com duas listas que alimentam o portal inteiro. **Níveis e séries**: todos os níveis (Educação Infantil, Anos Iniciais, Anos Finais, Ensino Médio, **EJA** Fundamental e Médio, **Técnico subsequente** dos centros de educação profissional), como cada um se divide (**anos, séries, etapas ou módulos**), as séries, a carga mínima e se aparece na matrícula on-line. **Tipos de vínculo**: efetivo, contratado temporário (PSS), comissionado, cedido, estagiário, terceirizado. O que está em uso não é apagado, só desativado | `rede/cadastros.html`, `data/niveis.json`, `data/vinculos.json`, `assets/js/dominio/niveis.js`, `assets/js/dominio/vinculos.js` |
| **Níveis como lista, não como texto fixo** | As caixas de marcar do cadastro de escola, os níveis dos cursos, as séries da matrícula, a carga horária das matrizes e a ordem das turmas vêm de `data/niveis.json`. A série seguinte da rematrícula segue o campo "depois vai para" do nível | `rede/escolas.html`, `rede/cursos.html`, `rede/matrizes.html`, `familia/matricula.html` |
| **Vínculo em todo cadastro de pessoa** | Professor e equipe do PROFIN exigem o tipo de vínculo, escolhido da lista. Os 25 professores e a equipe ganharam vínculo. "Contratado (REDA)" é o nome da Bahia: em Sergipe o contrato temporário é por PSS, e o nome antigo aparece trocado. Filtro por vínculo na lista de professores | `rede/professores.html`, `escola/professores.html`, `rede/equipe-profin.html` |
| **Quem cadastra a escola não cadastra vagas** | A SEED/DRE cadastra a escola, o ato e os níveis. "Vagas por escola" saiu da rede e a rede não abre mais turmas. A SEED central acompanha pelo Mapa de vagas; só as contas das DREs e da DEA consultam as turmas de cada escola (botão Turmas e vagas, só consulta) | `rede/escolas.html`, `rede/vagas.html` (aviso) |
| **Estrutura da escola (só a direção)** | Séries que a escola oferece dentro dos níveis do ato, **salas** com o número de lugares e **turnos** (manhã, tarde, noite e **integral**). Série, sala ou turno com turma não sai | `diretor/escola.html`, `data/salas.json`, `assets/js/dominio/estrutura.js` |
| **Turmas na direção** | A direção cria a turma em passos (série → turno → sala → vagas → nome, com resumo ao vivo) e diz quantas vagas ela tem, até os lugares da sala. Sala ocupada no turno fica bloqueada; a **turma integral** ocupa a sala de manhã e de tarde e tem 9 aulas por dia. Turma com estudante só muda sala e vagas; sem estudante, pode ser apagada (alocações e grade saem junto). A secretaria só consulta | `diretor/turmas.html`, `diretor/vagas.html`, `escola/turmas.html` (consulta) |
| **Alocação por disciplina** | Duas formas: por turma (as disciplinas da matriz, agrupadas por área) ou por disciplina (Matemática, Linguagens, Ciências...: todas as turmas que têm a disciplina e os professores habilitados nela, com a carga). Só aparecem professores habilitados; bloqueia carga acima do limite e aula em outra turma no mesmo horário. Os anos finais também têm matriz agora | `escola/alocacao.html`, `assets/js/dominio/alocacao.js`, `data/matrizes.json` (`fundamental`) |
| **Horários com escolha de disciplina e professor** | Na grade, clique na aula: escolha a disciplina (filtrada por área) e depois o professor, entre os habilitados, vendo quem está livre naquele horário, quem já tem aula em outra turma e quem está sem carga. O professor escolhido vale para todas as aulas da disciplina na turma e fica alocado. Também: **Horário do professor**, **Professores por disciplina**, destacar as aulas de um professor e **montar a grade a partir da matriz** | `coordenador/horarios.html` |
| **PROFIN consolidado** | **Ficha da escola**: saldo por recurso (recebido, executado, em análise, comprovado no portal), **o que falta** (prestação atrasada ou perto do prazo, declaração devolvida com os documentos recusados, rascunho sem comprovante, valor glosado, saldo parado), **como a escola gasta** (por natureza e fornecedor, últimos gastos com o comprovante), declarações, contexto escolar (estudantes, frequência, atos, anotações) e linha do tempo. A mesma ficha aparece para o PROFIN (todas as escolas) e para a direção (Direção › Financeiro). O painel mostra as pendências de cada escola e leva à ficha | `profin/escola.html`, `diretor/financeiro.html`, `assets/js/componentes/ficha-profin.js`, `assets/js/dominio/ficha-profin.js` |
| **PROFIN · Prestação de contas (novo modelo do painel)** | O painel virou **PROFIN · Prestação de contas**, com os mesmos dados de antes. **Ver como**: *Técnico do PROFIN* (todas as escolas, com as anotações internas) ou *Gestor da escola* (só o que a direção vê). Indicadores (escolas acompanhadas, com pendências, pendências abertas, contextos registrados, em dia, vencendo, com atraso e % executado), busca, regional, município, situação e **só com pendências**. Um **cartão por escola**, do mais grave ao menos grave, com a situação, as pendências abertas e um chip por recurso (executado e prazo da prestação); aberto, mostra os valores, as pendências calculadas pelo portal, as anotações e a **nova anotação**: **pendência** (com documento, por exemplo NF 101) ou **contexto da escola**, **compartilhada com a gestão** ou interna, e **marcar como resolvida** / reabrir. **Gerar rascunho do relatório** no próprio painel (modelo fixo, sem IA), com **Aprovar rascunho** e baixar. As anotações antigas viram contexto compartilhado, sem mudar `data/profin-notas.json` | `profin/index.html`, `assets/js/dominio/notas-profin.js`, `assets/js/componentes/notas-profin.js` |
| **Matrícula como a Matrícula Online da SEDUC** | **CPF do estudante obrigatório** (sem dois pedidos ativos para o mesmo CPF), calendário em **fases** (renovação, transferência interna, novos alunos) e matrícula contínua enquanto houver vaga, **lista oficial de documentos** (vacinação só até 12 anos, guia de transferência só na transferência), **comprovante para imprimir** e **Acompanhar pedido** pelo protocolo e pela data de nascimento | `familia/matricula.html`, `familia/acompanhar.html`, `data/matricula-online.json`, `assets/js/dominio/matricula-online.js` |

**Inconsistências corrigidas nesta rodada:** as turmas dos anos finais da escola de demonstração estavam em `data/turmas-rede.json` e a escola não conseguia gerenciá-las (passaram para `data/turmas.json`); a lista de salas era fixa no código e uma turma de 40 vagas estava numa sala de 32 lugares (agora `data/salas.json`); a grade de horário tinha professores que não estavam alocados (a alocação foi completada e a carga dos professores ajustada para caber); a alocação só funcionava no Ensino Médio; a tela de horários escolhia a versão da matriz pelo nome da turma; o conflito de professor só olhava o mesmo turno (agora compara a hora, e vale para a turma integral); o período da rematrícula estava escrito no código das telas (agora vem de `data/calendario.json`); um rascunho de declaração sem comprovante quebrava a tela de prestação de contas; o curso de EJA estava no nível Ensino Médio; e "Contratado (REDA)" não é vínculo de Sergipe.

#### As 10 diretorias de Sergipe (`data/dres.json`)

A rede estadual de Sergipe é dividida em **10 diretorias**: a **DEA** (Diretoria de Educação de Aracaju) e as **DRE 1 a DRE 9**. Juntas, elas atendem os 75 municípios, e cada município fica em uma só. A lista segue a página institucional da SEDUC/SE (seduc.se.gov.br, "Institucional – Composição"). Os municípios da DRE 1 vêm das Perguntas Frequentes da SEDUC, e Boquim e Salgado vêm das listas de escolas da SEDUC, que os colocam na DRE 2.

| Diretoria | Sede | Território | Municípios |
| --- | --- | --- | --- |
| DEA | Aracaju | Grande Aracaju (capital) | Aracaju |
| DRE 1 | Estância | Sul Sergipano | Arauá, Cristinápolis, Estância, Indiaroba, Itabaianinha, Pedrinhas, Santa Luzia do Itanhy, Tomar do Geru, Umbaúba |
| DRE 2 | Lagarto | Centro-Sul Sergipano | Boquim, Lagarto, Poço Verde, Riachão do Dantas, Salgado, Simão Dias, Tobias Barreto |
| DRE 3 | Itabaiana | Agreste Central Sergipano | Areia Branca, Campo do Brito, Carira, Frei Paulo, Itabaiana, Macambira, Malhador, Moita Bonita, Nossa Senhora Aparecida, Pedra Mole, Pinhão, Ribeirópolis, São Domingos, São Miguel do Aleixo |
| DRE 4 | Japaratuba | Leste Sergipano | Capela, Carmópolis, Divina Pastora, General Maynard, Japaratuba, Pirambu, Rosário do Catete, Santa Rosa de Lima, Siriri |
| DRE 5 | Nossa Senhora das Dores | Médio Sertão Sergipano | Aquidabã, Cumbe, Feira Nova, Graccho Cardoso, Itabi, Nossa Senhora das Dores |
| DRE 6 | Propriá | Baixo São Francisco | Amparo de São Francisco, Brejo Grande, Canhoba, Cedro de São João, Ilha das Flores, Japoatã, Malhada dos Bois, Muribeca, Neópolis, Pacatuba, Propriá, Santana do São Francisco, São Francisco, Telha |
| DRE 7 | Gararu | Alto Sertão Sergipano | Gararu, Nossa Senhora de Lourdes, Porto da Folha |
| DRE 8 | Nossa Senhora do Socorro | Grande Aracaju | Barra dos Coqueiros, Itaporanga d'Ajuda, Laranjeiras, Maruim, Nossa Senhora do Socorro, Riachuelo, Santo Amaro das Brotas, São Cristóvão |
| DRE 9 | Nossa Senhora da Glória | Alto Sertão Sergipano | Canindé de São Francisco, Monte Alegre de Sergipe, Nossa Senhora da Glória, Poço Redondo |

**Bairros (`data/localidades.json`).** Os bairros de cada município vêm da base de CEPs dos Correios (consultada em out/2026), sem as entradas que não são bairro ("Área Rural de…", distritos industriais). A base dos Correios só separa bairros nas cidades com CEP por rua: Aracaju (48 bairros), Nossa Senhora do Socorro (28), Barra dos Coqueiros (23), Lagarto (18, contando 3 povoados), Itabaiana (15), São Cristóvão (15), Capela (4, contando os povoados), Estância (3) e Tobias Barreto (2). Os outros municípios têm CEP único e aparecem só com **Centro**. Se a família mora num bairro que não está na lista, a matrícula tem a opção **Outro bairro**. Esses bairros aparecem no **Mapa de vagas** (`rede/mapa.html`), na matrícula e na lista de espera, e em **Escolas com vaga** (`familia/mapa.html`), onde agora se escolhe a cidade e depois o bairro. A lista de espera de exemplo ganhou pedidos em bairros de outras regionais (DRE 1, 6 e 9, por exemplo), para o mapa mostrar procura no estado todo. A posição de cada bairro no mapa é aproximada: em Aracaju, ela foi marcada bairro a bairro; nos outros municípios, os bairros ficam espalhados em volta do centro da cidade.

**Escolas reais (10 por diretoria).** Além das 5 escolas de demonstração (que têm alunos, professores, turmas e PROFIN), o portal traz 100 escolas reais da rede estadual: 10 de cada diretoria, espalhadas pelos municípios. Nome, município, DRE e bairro vêm do Portal da Educação da SEDUC/SE (páginas da Rede Estadual e Perguntas Frequentes). O código INEP aparece nas 51 escolas em que ele foi confirmado; nas outras, fica em branco. Quando a página da escola mostra as turmas, as séries e os turnos são os reais. Nas outras escolas, as séries foram definidas pelo tipo de escola (por exemplo, Centro de Excelência: Ensino Médio). Quando a SEDUC não informa o bairro, a escola fica no Centro do município. **As turmas, os atos ("Ato de exemplo nº…") e as vagas dessas escolas são de demonstração**: nas telas, elas aparecem com a etiqueta *Vagas de exemplo*. Ficam de fora do PROFIN (`profin/`), que continua só com as 5 escolas de demonstração. Os ids vão de `ee001` a `ee100` e os dados estão em `data/escolas.json`, `data/atos.json` e `data/turmas-rede.json`.

A SEDUC já mudou alguns municípios de diretoria ao longo dos anos. Em documentos de 2018, por exemplo, Siriri e Divina Pastora aparecem na DRE 5, e Muribeca aparece na DRE 4. Se a SEDUC mudar de novo, basta editar `data/dres.json`: as telas leem tudo de lá. As coordenadas de `data/localidades.json` são aproximadas, da sede de cada município, e servem só para o mapa. As escolas salvas no navegador com os nomes antigos das regionais (por exemplo, "DRE — Centro-Sul") passam a aparecer na diretoria certa sozinhas (`nomeAtualDaDre`, em `assets/js/dados.js`).

`data/vagas.json` e `data/demanda.json` não são mais lidos pelas telas (ficam só como referência dos números antigos e para os testes de `aplicarAjusteDeVagas`).

As regras ficam em `assets/js/dominio/` (`senha.js`, `vida-escolar.js`, `plano-aula.js`, `movimentacao.js`, `avisos.js`, `hoje.js`, e `cadastros.js` e `prestacao.js` ampliados) e têm testes em `tools/testar-cadastros.mjs`.

## Roteiro de demonstração de 10 minutos

1. **Entrada e tour (1 min).** Abra `index.html`, entre como Aluno (`202610317` / `aluno2026`) e deixe o guia de primeiro acesso rodar; clique em Ouvir em um passo.
2. **Carteirinha e offline (2 min).** Abra Carteirinha: QR e faixa com data e hora. Em um celular, use Adicionar à tela inicial; nas ferramentas do navegador, marque Offline e recarregue: a carteirinha abre.
3. **Declaração verificável (1 min).** Em Documentos, emita a declaração de matrícula, leia o QR com outro aparelho (ou copie o código para `verificar.html` em outra aba): Documento autêntico.
4. **Vida escolar e boletim falado (1 min).** Veja a linha do tempo (a matriz mudou em 2024) e ouça o boletim falado da semana.
5. **Matrícula inclusiva (2 min).** Saia e entre em Matrícula, sem login. Abra "Como funciona a matrícula" (fases), comece o pedido com o CPF do estudante (para testar, `529.982.247-25`), use Continuar em outro aparelho e abra o link em outra aba: volta ao mesmo passo. Envie, imprima o comprovante e abra **Acompanhar pedido** com o protocolo e a data de nascimento. Depois abra Ouvir instruções e Escolas com vaga (escolha um bairro).
6. **Secretaria (1 min).** Entre como Secretaria (`secretaria.osvaldo` / `secretaria2026`), abra Atendimento presencial, faça um pedido e veja a origem "Presencial" na lista; abra a ficha de um estudante.
7. **Rede (1 min).** Entre como Rede (`seed.tecnico` / `rede2026`): Atos autorizativos (impacto em turmas e estudantes), Mapa de vagas e Professores habilitados. Em **Cadastros**, veja os níveis (com EJA e técnico) e acrescente uma etapa; em **Tipos de vínculo**, cadastre um vínculo. Depois, **Escolas**: cadastre uma escola começando pelo INEP `28031512` (**Buscar no Censo Escolar**), marque os níveis, escolha o curso e anexe um PDF. As turmas e as vagas ficam com a direção da escola.
8. **Visual por idade (2 min).** Entre com `202610955` (3º ano), `202610842` (7º ano) e `202610317` (1ª série) e compare o início de cada um. No de 1ª série, abra Frequência e use **Simular falta hoje**; em Provas e rotina, abra o modo **Dia de Prova**.
9. **Responsável (1 min).** Entre como Responsável (`RESP-20417` / `resp2026`), troque de filho no alto e ligue o **Modo simplificado**.
10. **Direção e coordenação (3 min).** Como Direção (`dir.osvaldo` / `diretor2026`), abra **Estrutura da escola** e acrescente o turno Integral; em **Turmas**, crie uma turma integral (série, turno, sala e vagas) e veja as vagas em **Vagas**; abra o **Financeiro** e a Tela de reunião. Depois, como Coordenação (`coord.osvaldo` / `coord2026`), abra **Horários**, clique numa aula e troque a disciplina e o professor; veja **Professores por disciplina**.
11. **PROFIN (2 min).** Entre como PROFIN (`profin.seed` / `profin2026`): no painel **Prestação de contas**, abra uma escola, anote uma **pendência** (com NF) ou um **contexto**, compartilhado com a gestão ou interno, marque a pendência como resolvida, troque para **Ver como: Gestor da escola** e gere o rascunho do relatório. Depois abra a **Ficha da escola** (o que falta, como gasta, contexto). Abra a **Análise das declarações**, confira os gastos de uma escola e devolva o retorno; a direção vê o retorno em **Prestação de contas** e no **Financeiro**.
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
node tools/testar-cadastros.mjs     # níveis e vínculos, estrutura da escola e turmas (integral), alocação e grade, ficha e anotações do PROFIN, matrícula on-line, cadastro e edição de escola e ato, vagas calculadas, procura por bairro, séries, cursos, DRE, histórico de atos, professor e lotação, equipe do PROFIN, carga horária, declaração dos gastos, repasse e estorno, senha, aula e plano de aula, justificativa e abono, avisos lidos, transferência e cancelamento
node tools/verificar-contraste.mjs  # contraste dos tokens nos quatro temas, inclusive as cores do painel.css
```

As telas foram conferidas em Chromium (Playwright) em 360, 768 e 1440 px; esses roteiros de navegador não fazem parte do repositório.

## Regras de negócio implementadas

- Escola sem ato autorizativo vigente não aparece como opção na matrícula e não pode abrir turma na etapa.
- Só a direção da escola cria, muda e apaga turmas, salas, turnos e as séries oferecidas. Turma: série oferecida com ato vigente, turno da escola, sala livre no turno (a integral ocupa manhã e tarde) e vagas até os lugares da sala; turma com estudante não é apagada e não fica com menos vagas que estudantes.
- Níveis, séries e tipos de vínculo vêm dos cadastros da SEED; série ou nível em uso não é apagado, só desativado.
- O professor de uma disciplina numa turma é um só: a alocação e a grade de horário mudam juntas. Professor não pode ter duas aulas no mesmo dia e hora.
- Matrícula on-line: CPF do estudante obrigatório e sem dois pedidos ativos para o mesmo CPF; o acompanhamento pede o protocolo e a data de nascimento.
- A matrícula só oferece escolas com vaga. As vagas são calculadas: lugares livres nas turmas aprovadas (capacidade − matriculados − enturmados), menos os pedidos aguardando confirmação e os confirmados ainda sem turma (`assets/js/dominio/vagas.js`). Pedir segura a vaga, recusar devolve.
- A escola só oferece as séries marcadas no ato de cada nível (sem a lista, todas as séries do nível); quem marca é a direção, em Estrutura da escola.
- Procura por bairro = pedidos aguardando (no bairro onde a família mora) + lista de espera; acima de 120% das vagas é falta, de 90% a 120% é equilíbrio, abaixo de 90% é sobra.
- O município da escola tem de ser da DRE escolhida (`data/dres.json`). A conta de uma DRE vê e altera só as escolas da sua regional.
- Ato renovado: o atual vai para o histórico do nível, com o PDF; curso em uso por alguma escola não pode ser desativado.
- Na transferência, o estudante fica na mesma série.
- Turmas: a direção cria e diz as vagas (as turmas montadas antes pela coordenação esperam a direção aprovar ou apagar).
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
- **Impacto de atos:** turmas de outras escolas vêm de `data/turmas-rede.json` (fictício); a direção só gerencia as da própria escola.
- **Estrutura e turmas:** só a escola de demonstração (e1) tem conta de direção. As turmas que a rede abriu em rodadas anteriores para outras escolas continuam contando nas vagas, mas não há tela para mudá-las.
- **Matrícula on-line:** as datas das fases são as do calendário de 2026 publicado pela SEDUC; o portal não bloqueia pedidos fora delas (a matrícula é contínua enquanto houver vaga). O CPF é conferido só pelos dígitos verificadores.
- **Ficha do PROFIN:** "comprovado no portal" conta só as declarações aprovadas pelo portal; o executado da base inicial (`data/profin.json`) não tem comprovante.
- **Professores habilitados:** conta só a habilitação e a lotação. Não olha carga horária. Os componentes do Ensino Fundamental estão em `data/componentes-etapa.json`; as aulas por semana dos anos finais, em `data/matrizes.json` (`fundamental`).
- **Painéis por perfil:** a data de referência (07/10/2026, em `data/letivo.json`) é o "hoje" da agenda, dos prazos e do horário do dia. O diário só tem Matemática; as outras matérias e as turmas sem diário vêm de `data/desempenho.json`. Os valores do PROFIN são inventados. Materiais do professor guardam só o nome do arquivo. O mapa de calor tem três níveis, de propósito, para cada um ter símbolo e palavra. Streak, arrastar e soltar e widgets reordenáveis ficaram para a fase 2 (ver `CHECKLIST-PROTOTIPACAO.md`).
- **Censo Escolar e RH:** as buscas usam bases simuladas (`data/censo-escolar.json`, `data/rh-servidores.json`), com escolas, pessoas e CPFs fictícios.
- **PDF do ato:** fica no IndexedDB do navegador em que foi anexado (até 5 MB); em outro computador o ato aparece com o nome do PDF, mas ele não abre.
- **Acesso por DRE:** a regra é aplicada nas telas; em produção o servidor também filtraria os dados pela DRE da conta.
- **Lista de espera:** a família entra pelo portal; os números iniciais por bairro são registros simulados das DREs.
- **Diário offline:** a fila fica em IndexedDB e some se a pessoa limpar os dados do navegador. Não usa Background Sync (sincroniza com a página aberta). Conflito: vale o registro mais recente pelo horário do aparelho, que pode estar errado. Duas abas gravam no mesmo `localStorage`, então o último a gravar leva o estado inteiro (a sincronização relê antes de gravar para reduzir o problema).

## Como o cadastro é salvo

Os arquivos de `data/` são a base e nunca são alterados pelas telas. O que alguém cadastra ou muda fica num **conjunto alterável** e é somado à base quando a tela lê os dados:

1. A tela chama `salvar('escolas-novas', lista)` (em `assets/js/dados.js`).
2. Sem a API (Live Server, GitHub Pages), o conjunto vai para o `localStorage` do navegador, na chave `portal-academico-squad6-v1` (`assets/js/estado.js`). Com o `iniciar.bat`, vai para `dados-salvos/escolas-novas.json`, pela API do `tools/servidor.ps1`.
3. Quando uma tela chama `carregar('escolas')`, a função `mesclar` junta `data/escolas.json` com `escolas-novas`: registro com o mesmo `id` substitui o da base (é assim que a edição funciona) e registro novo entra no fim. O mesmo vale para `atos` (chave escola + nível) e `professores`.
4. Conjuntos sem base para somar (matrículas, turmas, salas, níveis, vínculos, cursos, lista de espera…) são lidos direto do `localStorage` ou da API; na primeira vez, vêm do arquivo de `data/`.
5. O PDF do ato não cabe no `localStorage`: fica no IndexedDB (`assets/js/arquivos.js`) e o ato guarda só `{ id, nome, tamanho }`.
6. **Restaurar dados de demonstração** apaga o `localStorage`, a pasta `dados-salvos/` e os PDFs, e tudo volta a ser só a base de `data/`.

Consequência: cada navegador (ou cada computador com o `iniciar.bat`) tem a sua própria versão das alterações. Para todos verem a mesma coisa, seria preciso um servidor com banco de dados.

## Padrões da equipe

- Uma branch por história (`hu04-matricula`, `ia04-falhas`) e merge request revisado por outra pessoa.
- Conteúdo com contribuição relevante de ferramentas de IA leva “Assistido por IA” na descrição do merge request.
- Nunca commitar `worker/.dev.vars` nem colar chaves ou dados pessoais em ferramentas de IA.

Documentação completa: Entrega Parcial, Tópicos 1.1, 2.1, 3.1, 4.1 e 4.2.
