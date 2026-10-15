# Melhorias de interface (UI/UX) — Portal Acadêmico

Documento para a equipe. Resume o redesenho visual, as decisões de design e traz o **guia rápido do design system** para quem for mexer no front-end daqui em diante. O estado anterior está em [`DIAGNOSTICO-UI.md`](DIAGNOSTICO-UI.md).

**Escopo respeitado:** só HTML, CSS e JavaScript puro (o Bootstrap por CDN, que o projeto já usava, foi mantido só para a grade); nenhuma tela, função, regra de negócio ou dado novo; todos os fluxos continuam funcionando. Mudanças em JavaScript foram só de apresentação (marcação, classes, indicadores calculados com dados que já existiam).

## 1. O que mudou em cada fase (antes × depois)

### Fase 1 · Design system (`assets/css/tema.css`)
| Antes | Depois |
| --- | --- |
| Preto, cinza e branco; só o assistente tinha cor | Paleta institucional: azul de governo como cor primária, neutros frios e quatro cores de estado (sucesso, alerta, erro, informação), cada uma com fundo, borda e texto |
| Fonte Atkinson Hyperlegible, 20 tamanhos de texto soltos | **Inter** (com reserva de sistema) e escala de 8 tamanhos, 4 pesos |
| Espaços, raios e sombras soltos (`.7rem`, `18px`, `22px`) | Espaçamento em base de 4 px (`--sp-1…16`), 3 raios, 3 sombras, 3 tempos de transição |
| Todas as visões iguais | **Cor de destaque por visão**: Família turquesa, Professor índigo, Escola verde, Rede âmbar (via `body[data-visao]`) |
| Tema escuro com tokens próprios espalhados | Tema escuro e alto contraste **só redefinem tokens**; seguem `prefers-color-scheme` quando não há escolha do usuário |

### Fase 2 · Componentes (`assets/css/componentes.css`)
| Componente | Antes | Depois |
| --- | --- | --- |
| Botões | Preto cheio e contorno; hover só escurecia | Primário, secundário, perigo e texto; hover, active, focus, disabled e "salvando" (spinner); 44 px (grande 52 px) |
| Cartões | Contorno grosso igual em tudo | Superfície com sombra leve; variantes com cabeçalho/corpo/ações, destaque e interativo |
| Indicadores | Número solto | Cartão com faixa na cor da visão, ícone e (quando faz sentido) link |
| Selos de status | Só texto e cor | **Cor + ícone + texto** (aprovado, recuperação, reprovado, vigente, vencido…) |
| Tabelas | Sem cabeçalho fixo nem zebra | Cabeçalho fixo, zebra, destaque ao passar o mouse, números à direita; **no celular cada linha vira um cartão** |
| Formulários | Erro em local fixo | Rótulo sempre visível, erro logo abaixo do campo, foco no primeiro erro |
| Aviso rápido | Caixa preta sem ícone | Ícone por tipo (ok/erro/info), botão fechar, anunciado por leitor de tela |
| Janelas | Bordas grossas | `<dialog>` com animação curta, foco preso e Esc |
| Ícones | 30 ícones de traço | Mesmo estilo, agora também nos selos, avisos e indicadores |

### Fase 3 · Layout e navegação (`assets/css/layout.css`, `assets/js/app.js`)
- **Cabeçalho institucional:** monograma "SE", "Portal Acadêmico · SEED/SE · Governo de Sergipe", **usuário simulado** da visão, controles de letra e exibição, faixa superior na cor da visão.
- **Menu lateral em todas as visões** (a Família ganhou o dela): item ativo destacado; **recolhe para só ícones** no desktop (preferência guardada); **vira gaveta no celular**, com foco preso, Esc e fundo que fecha.
- **Breadcrumb e título de página** padronizados; largura de conteúdo consistente (formulários e documentos em coluna mais estreita).
- **Painéis com indicadores no topo:** Família (presença, matérias que precisam de atenção, próxima data, pedidos), Professor (turmas, estudantes, carga horária, frequência abaixo de 75 %), Escola e Rede (números com ícone e plural correto).
- Tela inicial com um cartão por perfil, cada um na sua cor.

### Fase 4 · Experiência de uso
- **Esqueleto** no lugar do texto "Carregando…"; estados vazios com ícone e explicação; erros com "Tentar de novo".
- **Feedback imediato:** botões mostram "salvando"; aviso rápido com ícone; conteúdo entra com transição curta (150–250 ms; desligada por `prefers-reduced-motion`).
- **Menos esforço nas tarefas frequentes:** no diário, o campo já vem selecionado, `Enter` desce para o mesmo campo do próximo estudante, há aviso de "alterações não salvas", a situação (aprovado, recuperação, reprovado) aparece por estudante e o botão Salvar fica fixo no rodapé; na Família, os indicadores levam direto ao boletim.
- **Botão do assistente** recolhido em círculo (expande no hover/foco) e sobe quando há barra de ações, para não cobrir o botão Continuar nem colunas de tabela.

### Fase 5 · Responsividade
- Verificadas as 20 páginas do portal em **360, 390, 768, 1024, 1280 e 1440 px**: sem rolagem horizontal da página e sem erros no console.
- Tabelas: cartões no celular; matriz de vagas com a coluna da escola fixa ao rolar; cabeçalho fixo nas longas.
- Áreas de toque de **44 px** em botões, campos, menu, breadcrumb e fechar do aviso. Exceção: links dentro de frases (não são alvos isolados).

### Fase 6 · Acessibilidade
- **Contraste conferido por script** (`node tools/verificar-contraste.mjs`): 92 combinações nos quatro temas (claro, escuro, alto contraste claro e escuro) cumprem 4,5:1 para texto e 3:1 para bordas e foco.
- Foco visível em anel duplo (contorno + folga de 2 px na cor da superfície), válido sobre fundos claros e escuros.
- Menu gaveta e janelas com foco preso e Esc; `aria-expanded`/`aria-label` no botão do menu; `aria-current` no item ativo e no breadcrumb; região `status` do aviso presente desde o carregamento; tabelas com `caption` e `th scope`; link "Pular para o conteúdo".
- Status nunca só por cor: todo selo tem ícone e texto; a chamada usa ícone + texto "Presente/Faltou".

## 2. Decisões de design e justificativas
1. **Azul de governo como primária.** Familiar em sistemas públicos e com 7,3:1 sobre branco; as cores por visão entram só em detalhes (faixa do cabeçalho, item ativo do menu, indicadores, avatar), para manter uma identidade única.
2. **Inter no lugar de Atkinson Hyperlegible.** Mais neutra e comum em sistemas institucionais; a legibilidade para baixa visão continua atendida pelo zoom de letra, pelo alto contraste e pelo leitor de voz que já existiam.
3. **Marca em texto e monograma.** Sem brasão nem logotipo, porque não há arquivo oficial autorizado no projeto. Para usar o logotipo, troque o `.marca-selo` no `assets/js/app.js`.
4. **Usuário simulado.** O sistema não tem login; os nomes vêm dos dados de demonstração (constante `USUARIOS` em `app.js`).
5. **Menu na Família também.** Cumpre a estrutura padrão pedida e troca o "voltar" por navegação previsível; a tela continua usável no celular pela gaveta.
6. **Tokens antigos mantidos como apelidos** (`--tinta`, `--suave`, `--linha`…) para nada quebrar; código novo não deve usá-los.
7. **Tabelas em cartões no celular** em vez de rolagem lateral, exceto a matriz escola × série (rolagem com coluna fixa), que perderia o sentido em cartões.
8. **Tema escuro por tokens.** Mesma marcação, nenhuma regra duplicada.

## 3. Guia rápido do design system

### 3.1 Onde mexer
| Arquivo | Conteúdo |
| --- | --- |
| `assets/css/tema.css` | **Tokens** e estilos-base. Mudou uma cor ou tamanho? É aqui |
| `assets/css/componentes.css` | Componentes (botões, cartões, selos, formulários, tabelas, avisos, janelas) |
| `assets/css/layout.css` | Cabeçalho, menu, breadcrumb, área de conteúdo, início do portal |
| `assets/css/assistente.css` | Assistente de IA |
| `assets/js/ui.js` | `etiqueta()`, `avisar()`, `confirmar()`, `pedirTexto()`, `vazio()`, `comEspera()`, `icone()` |
| `assets/js/app.js` | `iniciar()` monta cabeçalho, menu, breadcrumb; `MENUS`, `USUARIOS` |

### 3.2 Tokens
| Grupo | Tokens |
| --- | --- |
| Cor de marca | `--cor-primaria` (+ `-hover`, `-ativa`, `-suave`), `--sobre-primaria`, `--acento` (cor da visão), `--acento-suave` |
| Superfícies e texto | `--fundo-app`, `--superficie`, `--superficie-2`, `--texto`, `--texto-suave`, `--borda`, `--borda-forte`, `--foco` |
| Estados | `--sucesso`, `--alerta`, `--erro`, `--info`, cada um com `-fundo` e `-borda` |
| Tipografia | `--fonte`, `--texto-xs` a `--texto-4xl`, `--peso-normal/medio/forte/negrito` |
| Espaçamento (4 px) | `--sp-1` (4) `--sp-2` (8) `--sp-3` (12) `--sp-4` (16) `--sp-5` (20) `--sp-6` (24) `--sp-8` (32) `--sp-10` `--sp-12` `--sp-16` |
| Forma e movimento | `--raio-sm/-/-lg/-pill`, `--sombra-1/2/3`, `--transicao-rapida/transicao/transicao-lenta`, `--toque` (44 px) |

Regra: **componentes usam só tokens**; nada de `#hex`, `px` ou `rem` soltos (exceção: a folha de declaração, que é papel e tem variáveis próprias `--papel*`).

### 3.3 Componentes (classes)
| Componente | Classes |
| --- | --- |
| Botão | `.botao` (primário), `.botao-secundario`, `.botao-perigo`, `.botao-texto`; tamanhos `.botao-grande`, `.botao-mini`, `.botao-largo`; estado "salvando": `aria-busy="true"` (ou `comEspera(botao, fn)`) |
| Cartão | `.cartao` (+ `.cartao-cabecalho`, `.cartao-acoes`, `.destaque`, `.cartao-interativo`), `.bloco` (atalho com ícone), `.estudante` |
| Indicador | `.numeros` > `.numero` (`.ok`, `.atencao`, `.alerta`; ícone em `.numero-icone`) |
| Selo | `etiqueta(texto, 'ok' \| 'atencao' \| 'erro' \| 'info' \| 'neutra')` |
| Alerta | `.alerta-erro`, `.alerta-sucesso`, `.alerta-atencao`, `.alerta-info` |
| Formulário | `.campo` > `label` + `.entrada` + `.erro` (+ `.dica`); `aria-invalid="true"` no campo com erro |
| Tabela | `.tabela-rolagem` > `.tabela`; `th.num`/`td.num` (números à direita); `.tabela-cartoes` (vira cartões no celular; use `data-rotulo` nas células, `titulo-linha` na primeira e `acoes` na de botões) |
| Filtros e opções | `.filtros` (botões com `aria-pressed`), `.opcoes` > `.opcao` |
| Feedback | `avisar(texto, tipo?)`, `confirmar({...})`, `pedirTexto({...})`, `vazio(titulo, texto, icone)`, `.esqueleto` |
| Layout | `.com-menu` > `.menu` + `.area`; `.grade-2`, `.grade-3`; `.pagina-descricao` |
| Espaço e texto | `.esp-t-N` / `.esp-b-N` (N de 0 a 6), `.texto-pequeno`, `.texto-suave`, `.negrito` |

### 3.4 Receita: nova tela
1. Copie o `<head>` de uma página existente (Inter, Bootstrap, `tema.css`, `componentes.css`, `layout.css`, `assistente.css`).
2. Chame `iniciar({ perfil, assistente: true })` e desenhe dentro do elemento devolvido.
3. Comece a tela com `<h1>`; use indicadores no topo e `.cartao` ou `.tabela` no corpo.
4. Todo estado tem tratamento: `falhaDados` (erro), `vazio()` (sem dados) e o esqueleto do HTML (carregando).
5. Status sempre com `etiqueta()` (ícone + texto), nunca só cor.
6. Rode `node tools/verificar-contraste.mjs` depois de mudar cores.

## 4. Limitações conhecidas
- Inter e Bootstrap vêm de CDN; sem internet o sistema funciona, mas com a fonte de reserva do sistema e sem a grade do Bootstrap.
- Sem brasão nem logotipo oficial (ver decisão 3).
- `404.html` continua com estilo próprio simples.
- Verificação feita em Chromium e com roteiros automáticos; não testado em Safari e Firefox nem com leitor de tela real (NVDA, VoiceOver).
- Links dentro de frases têm altura de texto (exceção comum de área de toque).
- O protótipo em arquivo único ganhou o mesmo cabeçalho, breadcrumb, selos e avisos, mas não tem menu lateral (tem só três telas).
