// ---------------------------------------------------
// DADOS (mockados, escritos na mão)
// ---------------------------------------------------

var escolas = [
  { nome: "E.M. Zélia Menezes", rede: "Municipal", alunos: 612, professores: 34, status: "Ativa" },
  { nome: "E.E. Barão do Rio Branco", rede: "Estadual", alunos: 845, professores: 47, status: "Ativa" },
  { nome: "E.M. Vereador Antônio Freire", rede: "Municipal", alunos: 398, professores: 21, status: "Ativa" },
  { nome: "E.E. Dom Pedro II", rede: "Estadual", alunos: 720, professores: 39, status: "Manutenção" }
];

var turmas = [
  { nome: "6º Ano A", turno: "Manhã", alunos: 28, professor: "Renata Macedo" },
  { nome: "7º Ano B", turno: "Tarde", alunos: 26, professor: "Marcelo Andrade" },
  { nome: "8º Ano A", turno: "Manhã", alunos: 24, professor: "Patrícia Lins" }
];

var alunos = [
  { nome: "Ana Silva", turma: "6º Ano A", frequencia: 96, nota: 8.2 },
  { nome: "Bruno Souza", turma: "6º Ano A", frequencia: 88, nota: 6.5 },
  { nome: "Carla Oliveira", turma: "7º Ano B", frequencia: 79, nota: 5.8 },
  { nome: "Diego Santos", turma: "7º Ano B", frequencia: 94, nota: 7.9 },
  { nome: "Elisa Pereira", turma: "8º Ano A", frequencia: 99, nota: 9.1 }
];

var avisos = [
  { titulo: "Reunião de Pais", data: "12/09/2026", texto: "Reunião de entrega de boletins às 19h no auditório." },
  { titulo: "Suspensão de aula de Ed. Física", data: "10/09/2026", texto: "Aulas substituídas por atividade em sala por causa da reforma da quadra." },
  { titulo: "Semana de provas", data: "08/09/2026", texto: "Cronograma da semana de avaliações já está disponível." }
];

var horario = [
  { horario: "07:00 - 07:50", segunda: "Matemática", terca: "Português", quarta: "Ciências", quinta: "História", sexta: "Geografia" },
  { horario: "07:50 - 08:40", segunda: "Matemática", terca: "Português", quarta: "Ciências", quinta: "História", sexta: "Geografia" },
  { horario: "08:55 - 09:45", segunda: "Inglês", terca: "Artes", quarta: "Ed. Física", quinta: "Matemática", sexta: "Português" }
];

var filhos = ["Ana Silva", "Diego Santos"];
var filhoSelecionado = "Ana Silva";

// ---------------------------------------------------
// MENUS POR PERFIL
// ---------------------------------------------------

var menus = {
  secretaria: [
    { id: "dashboard", texto: "Visão Geral" },
    { id: "escolas", texto: "Escolas" }
  ],
  diretor: [
    { id: "painel", texto: "Painel da Escola" },
    { id: "turmas", texto: "Turmas" },
    { id: "avisos", texto: "Avisos" }
  ],
  professor: [
    { id: "notas", texto: "Lançar Notas" },
    { id: "faltas", texto: "Lançar Faltas" },
    { id: "horario", texto: "Meu Horário" }
  ],
  aluno: [
    { id: "boletim", texto: "Boletim" },
    { id: "faltasAluno", texto: "Minhas Faltas" },
    { id: "horarioAluno", texto: "Horário" }
  ],
  responsavel: [
    { id: "boletimFilho", texto: "Boletim do Filho" },
    { id: "avisosResp", texto: "Avisos" }
  ]
};

var perfilAtual = "secretaria";
var telaAtual = "dashboard";

// ---------------------------------------------------
// NAVEGAÇÃO
// ---------------------------------------------------

function trocarPerfil(perfil) {
  perfilAtual = perfil;
  telaAtual = menus[perfil][0].id;
  render();
}

function irPara(tela) {
  telaAtual = tela;
  render();
}

function render() {
  renderMenu();
  document.getElementById("conteudo").innerHTML = renderTela();
}

function renderMenu() {
  var itens = menus[perfilAtual];
  var html = "";
  for (var i = 0; i < itens.length; i++) {
    var classe = itens[i].id === telaAtual ? "ativo" : "";
    html += '<button class="' + classe + '" onclick="irPara(\'' + itens[i].id + '\')">' + itens[i].texto + '</button>';
  }
  document.getElementById("menu").innerHTML = html;
}

function renderTela() {
  if (telaAtual === "dashboard") return telaDashboard();
  if (telaAtual === "escolas") return telaEscolas();
  if (telaAtual === "painel") return telaPainel();
  if (telaAtual === "turmas") return telaTurmas();
  if (telaAtual === "avisos" || telaAtual === "avisosResp") return telaAvisos();
  if (telaAtual === "notas") return telaNotas();
  if (telaAtual === "faltas") return telaFaltas();
  if (telaAtual === "horario" || telaAtual === "horarioAluno") return telaHorario();
  if (telaAtual === "boletim") return telaBoletim("Ana Silva");
  if (telaAtual === "faltasAluno") return telaFaltasAluno();
  if (telaAtual === "boletimFilho") return telaBoletimFilho();
  return "<p>Página não encontrada.</p>";
}

// ---------------------------------------------------
// TELAS - SECRETARIA
// ---------------------------------------------------

function telaDashboard() {
  var totalAlunos = 0, totalProf = 0;
  for (var i = 0; i < escolas.length; i++) {
    totalAlunos += escolas[i].alunos;
    totalProf += escolas[i].professores;
  }

  var html = "<h2>Visão Geral da Rede</h2>";
  html += '<div class="cards">';
  html += '<div class="card"><div class="numero">' + escolas.length + '</div><div class="label">Escolas</div></div>';
  html += '<div class="card"><div class="numero">' + totalAlunos + '</div><div class="label">Alunos</div></div>';
  html += '<div class="card"><div class="numero">' + totalProf + '</div><div class="label">Professores</div></div>';
  html += '</div>';

  html += "<table><tr><th>Escola</th><th>Rede</th><th>Alunos</th><th>Status</th></tr>";
  for (var i = 0; i < escolas.length; i++) {
    var e = escolas[i];
    html += "<tr><td>" + e.nome + "</td><td>" + e.rede + "</td><td>" + e.alunos + "</td><td>" + statusHtml(e.status) + "</td></tr>";
  }
  html += "</table>";
  return html;
}

function telaEscolas() {
  var html = "<h2>Gestão de Escolas</h2>";
  html += '<button class="acao" onclick="abrirModalNovaEscola()">+ Nova Escola</button><br><br>';
  html += "<table><tr><th>Escola</th><th>Rede</th><th>Alunos</th><th>Professores</th><th>Status</th></tr>";
  for (var i = 0; i < escolas.length; i++) {
    var e = escolas[i];
    html += "<tr><td>" + e.nome + "</td><td>" + e.rede + "</td><td>" + e.alunos + "</td><td>" + e.professores + "</td><td>" + statusHtml(e.status) + "</td></tr>";
  }
  html += "</table>";
  return html;
}

function abrirModalNovaEscola() {
  var html = "<h3>Nova Escola</h3>";
  html += "<label>Nome</label><input id='novaEscolaNome' type='text'>";
  html += "<label>Rede</label><select id='novaEscolaRede'><option>Municipal</option><option>Estadual</option></select>";
  html += "<button class='acao' onclick='salvarEscola()'>Salvar</button> ";
  html += "<button class='acao vermelho' onclick='fecharModal()'>Cancelar</button>";
  abrirModal(html);
}

function salvarEscola() {
  var nome = document.getElementById("novaEscolaNome").value;
  var rede = document.getElementById("novaEscolaRede").value;
  if (nome === "") {
    alert("Digite o nome da escola.");
    return;
  }
  escolas.push({ nome: nome, rede: rede, alunos: 0, professores: 0, status: "Ativa" });
  fecharModal();
  render();
  alert("Escola cadastrada!");
}

// ---------------------------------------------------
// TELAS - DIRETOR
// ---------------------------------------------------

function telaPainel() {
  var html = "<h2>Painel da Escola</h2>";
  html += '<div class="cards">';
  html += '<div class="card"><div class="numero">' + turmas.length + '</div><div class="label">Turmas</div></div>';
  html += '<div class="card"><div class="numero">' + alunos.length + '</div><div class="label">Alunos</div></div>';
  html += '</div>';
  return html;
}

function telaTurmas() {
  var html = "<h2>Turmas</h2>";
  html += "<table><tr><th>Turma</th><th>Turno</th><th>Alunos</th><th>Professor Responsável</th></tr>";
  for (var i = 0; i < turmas.length; i++) {
    var t = turmas[i];
    html += "<tr><td>" + t.nome + "</td><td>" + t.turno + "</td><td>" + t.alunos + "</td><td>" + t.professor + "</td></tr>";
  }
  html += "</table>";
  return html;
}

function telaAvisos() {
  var html = "<h2>Avisos</h2>";
  html += '<button class="acao" onclick="abrirModalNovoAviso()">+ Novo Aviso</button><br><br>';
  for (var i = 0; i < avisos.length; i++) {
    var a = avisos[i];
    html += '<div class="aviso-item"><strong>' + a.titulo + '</strong> (' + a.data + ')<p>' + a.texto + '</p></div>';
  }
  return html;
}

function abrirModalNovoAviso() {
  var html = "<h3>Novo Aviso</h3>";
  html += "<label>Título</label><input id='avisoTitulo' type='text'>";
  html += "<label>Mensagem</label><textarea id='avisoTexto' rows='4'></textarea>";
  html += "<button class='acao' onclick='salvarAviso()'>Publicar</button> ";
  html += "<button class='acao vermelho' onclick='fecharModal()'>Cancelar</button>";
  abrirModal(html);
}

function salvarAviso() {
  var titulo = document.getElementById("avisoTitulo").value;
  var texto = document.getElementById("avisoTexto").value;
  if (titulo === "" || texto === "") {
    alert("Preencha todos os campos.");
    return;
  }
  var hoje = new Date().toLocaleDateString("pt-BR");
  avisos.unshift({ titulo: titulo, data: hoje, texto: texto });
  fecharModal();
  render();
  alert("Aviso publicado!");
}

// ---------------------------------------------------
// TELAS - PROFESSOR
// ---------------------------------------------------

function telaNotas() {
  var html = "<h2>Lançar Notas</h2>";
  html += "<table><tr><th>Aluno</th><th>Turma</th><th>Nota</th></tr>";
  for (var i = 0; i < alunos.length; i++) {
    var a = alunos[i];
    html += "<tr><td>" + a.nome + "</td><td>" + a.turma + "</td><td>";
    html += "<input type='number' min='0' max='10' step='0.1' value='" + a.nota + "' onchange='mudarNota(" + i + ", this.value)'></td></tr>";
  }
  html += "</table>";
  html += "<button class='acao verde' onclick=\"alert('Notas salvas!')\">Salvar</button>";
  return html;
}

function mudarNota(indice, valor) {
  alunos[indice].nota = parseFloat(valor);
}

function telaFaltas() {
  var html = "<h2>Lançar Faltas</h2>";
  html += "<table><tr><th>Aluno</th><th>Turma</th><th>Presença hoje</th></tr>";
  for (var i = 0; i < alunos.length; i++) {
    var a = alunos[i];
    html += "<tr><td>" + a.nome + "</td><td>" + a.turma + "</td><td>";
    html += "<select onchange='alert(\"Presença registrada\")'><option>Presente</option><option>Ausente</option></select></td></tr>";
  }
  html += "</table>";
  html += "<button class='acao verde' onclick=\"alert('Chamada confirmada!')\">Confirmar Chamada</button>";
  return html;
}

function telaHorario() {
  var html = "<h2>Horário</h2>";
  html += "<table><tr><th>Horário</th><th>Segunda</th><th>Terça</th><th>Quarta</th><th>Quinta</th><th>Sexta</th></tr>";
  for (var i = 0; i < horario.length; i++) {
    var h = horario[i];
    html += "<tr><td>" + h.horario + "</td><td>" + h.segunda + "</td><td>" + h.terca + "</td><td>" + h.quarta + "</td><td>" + h.quinta + "</td><td>" + h.sexta + "</td></tr>";
  }
  html += "</table>";
  return html;
}

// ---------------------------------------------------
// TELAS - ALUNO
// ---------------------------------------------------

function telaBoletim(nomeAluno) {
  var aluno = buscarAluno(nomeAluno);
  var html = "<h2>Boletim - " + aluno.nome + "</h2>";
  html += '<div class="cards">';
  html += '<div class="card"><div class="numero">' + aluno.nota + '</div><div class="label">Média Geral</div></div>';
  html += '<div class="card"><div class="numero">' + aluno.frequencia + '%</div><div class="label">Frequência</div></div>';
  html += '</div>';
  html += "<table><tr><th>Disciplina</th><th>Nota</th><th>Situação</th></tr>";
  var disciplinas = ["Matemática", "Português", "Ciências", "História", "Geografia"];
  for (var i = 0; i < disciplinas.length; i++) {
    var nota = (aluno.nota + (i % 3 === 0 ? 0.3 : -0.2)).toFixed(1);
    var situacao = nota >= 6 ? statusHtml("ok", "Aprovado") : statusHtml("erro", "Atenção");
    html += "<tr><td>" + disciplinas[i] + "</td><td>" + nota + "</td><td>" + situacao + "</td></tr>";
  }
  html += "</table>";
  return html;
}

function telaFaltasAluno() {
  var aluno = buscarAluno("Ana Silva");
  var html = "<h2>Minhas Faltas</h2>";
  html += '<div class="cards"><div class="card"><div class="numero">' + aluno.frequencia + '%</div><div class="label">Frequência Geral</div></div></div>';
  return html;
}

function buscarAluno(nome) {
  for (var i = 0; i < alunos.length; i++) {
    if (alunos[i].nome === nome) return alunos[i];
  }
  return alunos[0];
}

// ---------------------------------------------------
// TELAS - RESPONSÁVEL
// ---------------------------------------------------

function telaBoletimFilho() {
  var html = "<h2>Boletim do Filho</h2>";
  html += "<label>Selecione o filho:</label>";
  html += "<select onchange='mudarFilho(this.value)'>";
  for (var i = 0; i < filhos.length; i++) {
    var sel = filhos[i] === filhoSelecionado ? "selected" : "";
    html += "<option " + sel + ">" + filhos[i] + "</option>";
  }
  html += "</select><br><br>";
  html += telaBoletim(filhoSelecionado);
  return html;
}

function mudarFilho(nome) {
  filhoSelecionado = nome;
  render();
}

// ---------------------------------------------------
// FUNÇÕES AUXILIARES
// ---------------------------------------------------

function statusHtml(status, texto) {
  var classe = "ok";
  if (status === "Manutenção" || status === "alerta") classe = "alerta";
  if (status === "erro") classe = "erro";
  return '<span class="status ' + classe + '">' + (texto || status) + '</span>';
}

function abrirModal(html) {
  document.getElementById("modalCaixa").innerHTML = html;
  document.getElementById("modalFundo").style.display = "flex";
}

function fecharModal(evento) {
  if (evento && evento.target.id !== "modalFundo") return;
  document.getElementById("modalFundo").style.display = "none";
}

// ---------------------------------------------------
// INÍCIO
// ---------------------------------------------------

render();
