# Servidor local do portal: entrega o site e a API de dados, sem Node nem Python.
# Uso: powershell -ExecutionPolicy Bypass -File tools/servidor.ps1 [-Porta 5500] [-Abrir] [-Celular] [-Pagina familia/index.html]
#   -Abrir abre o portal no navegador; com -Celular, numa janela do tamanho de um celular (Edge ou Chrome).
#   -Pagina escolhe a pagina que abre (vazio = tela inicial).
# Chamado pelo iniciar.bat e pelo VS Code (F5, via .vscode/tasks.json).
#
# API (JSON):
#   GET    /api/saude                 -> { ok: true }
#   GET    /api/{nome}                -> dados de data/{nome}.json (ou a versao salva, se for alteravel)
#   PUT    /api/{nome}                -> salva matriculas, vagas, turmas ou diario em dados-salvos/
#   POST   /api/protocolo/{PREFIXO}   -> { protocolo: "MAT-2026-0003" }
#   DELETE /api/dados                 -> apaga as alteracoes salvas (reinicia a demonstracao)
param([int]$Porta = 5500, [switch]$Abrir, [switch]$Celular, [string]$Pagina = '')

$raiz = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\') + '\'
$pastaDados = Join-Path $raiz 'data'
$pastaSalvos = Join-Path $raiz 'dados-salvos'
$prefixo = "http://localhost:$Porta/"
$destino = $prefixo + $Pagina.TrimStart('/')
$utf8 = New-Object System.Text.UTF8Encoding $false
$ALTERAVEIS = @('matriculas', 'vagas', 'turmas', 'diario', 'chamadas', 'historico', 'enturmacao', 'alocacoes', 'renovacoes', 'equivalencias', 'diario-meta', 'solicitacoes', 'comunicados', 'materiais', 'horarios', 'atencao-turmas', 'profin-notas', 'escolas-novas', 'atos-novos', 'professores-novos', 'equipe-profin', 'declaracoes-gastos', 'carga-horaria', 'repasses-lancados', 'registros-aula', 'justificativas')
$LIMITE_CORPO = 1MB

# Abre o portal. Com -Celular, usa uma janela de app do Edge/Chrome com perfil proprio,
# para o tamanho de celular valer mesmo com o navegador ja aberto.
function AbrirNavegador {
  if ($Celular) {
    $navegador = @(
      "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
      "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
      "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
      "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
    ) | Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($navegador) {
      Start-Process $navegador -ArgumentList "--app=$destino", "--window-size=412,915", "--window-position=100,40", "--user-data-dir=$env:LOCALAPPDATA\PortalAcademicoCelular", "--no-first-run"
      return
    }
    Write-Host "Edge e Chrome nao encontrados: abrindo no navegador padrao (F12 e Ctrl+Shift+M simulam o celular)."
  }
  Start-Process $destino
}

# Se ja houver um servidor na porta (outra execucao ou o Live Server), so abre o navegador e sai.
if (Get-NetTCPConnection -LocalPort $Porta -State Listen -ErrorAction SilentlyContinue) {
  Write-Host "Servidor pronto em $prefixo (porta ja estava em uso)"
  if ($Abrir) { AbrirNavegador }
  exit 0
}

$tipos = @{
  '.html' = 'text/html; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.mjs'  = 'text/javascript; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.md'   = 'text/markdown; charset=utf-8'
  '.svg'  = 'image/svg+xml'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.ico'  = 'image/x-icon'
  '.woff2' = 'font/woff2'
}

function Enviar($resp, [int]$status, [string]$tipo, [byte[]]$bytes) {
  $resp.StatusCode = $status
  $resp.ContentType = $tipo
  $resp.Headers.Add('Cache-Control', 'no-store')
  $resp.Headers.Add('X-Portal-Api', '1')   # o front-end usa este cabecalho para saber que a API existe
  $resp.ContentLength64 = $bytes.Length
  $resp.OutputStream.Write($bytes, 0, $bytes.Length)
}
function EnviarJson($resp, [int]$status, [string]$json) {
  Enviar $resp $status 'application/json; charset=utf-8' $utf8.GetBytes($json)
}
function LerTexto([string]$arquivo) { [System.IO.File]::ReadAllText($arquivo, $utf8) }
function GravarTexto([string]$arquivo, [string]$texto) {
  if (-not (Test-Path $pastaSalvos)) { New-Item -ItemType Directory $pastaSalvos | Out-Null }
  [System.IO.File]::WriteAllText($arquivo, $texto, $utf8)
}

# Dados atuais de um conjunto: a versao salva, se houver; senao, a base simulada de data/.
function LerConjunto([string]$nome) {
  $salvo = Join-Path $pastaSalvos "$nome.json"
  if (($ALTERAVEIS -contains $nome) -and (Test-Path $salvo)) { return LerTexto $salvo }
  if ($nome -eq 'diario') {
    # O diario inicial fica dentro de professor.json.
    $prof = LerTexto (Join-Path $pastaDados 'professor.json') | ConvertFrom-Json
    return ($prof.diario | ConvertTo-Json -Depth 20 -Compress)
  }
  $arquivo = Join-Path $pastaDados "$nome.json"
  if (Test-Path $arquivo -PathType Leaf) { return LerTexto $arquivo }
  return $null
}

function ProximoProtocolo([string]$pref) {
  $arquivo = Join-Path $pastaSalvos 'contadores.json'
  $cont = @{}
  if (Test-Path $arquivo) {
    (LerTexto $arquivo | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $cont[$_.Name] = [int]$_.Value }
  }
  # A base simulada ja tem os protocolos 0001 a 0005.
  $n = if ($cont.ContainsKey($pref)) { $cont[$pref] + 1 } else { 6 }
  $cont[$pref] = $n
  GravarTexto $arquivo ($cont | ConvertTo-Json -Compress)
  return '{0}-{1}-{2:D4}' -f $pref, (Get-Date).Year, $n
}

function TratarApi($req, $resp, [string]$rota) {
  $metodo = $req.HttpMethod
  if ($rota -eq 'saude' -and $metodo -eq 'GET') { return EnviarJson $resp 200 '{"ok":true}' }

  if ($rota -eq 'dados' -and $metodo -eq 'DELETE') {
    if (Test-Path $pastaSalvos) { Remove-Item (Join-Path $pastaSalvos '*.json') -Force }
    return EnviarJson $resp 200 '{"ok":true}'
  }

  if ($rota -match '^protocolo/([A-Z]{2,5})$' -and $metodo -eq 'POST') {
    $p = ProximoProtocolo $Matches[1]
    return EnviarJson $resp 201 ('{"protocolo":"' + $p + '"}')
  }

  if ($rota -notmatch '^[a-z][a-z0-9-]*$') { return EnviarJson $resp 404 '{"erro":"NAO_ENCONTRADO"}' }

  if ($metodo -eq 'GET') {
    $json = LerConjunto $rota
    if ($null -eq $json) { return EnviarJson $resp 404 '{"erro":"NAO_ENCONTRADO"}' }
    return EnviarJson $resp 200 $json
  }

  if ($metodo -eq 'PUT') {
    if ($ALTERAVEIS -notcontains $rota) { return EnviarJson $resp 405 '{"erro":"SOMENTE_LEITURA"}' }
    if ($req.ContentLength64 -gt $LIMITE_CORPO) { return EnviarJson $resp 413 '{"erro":"MUITO_GRANDE"}' }
    $leitor = New-Object System.IO.StreamReader($req.InputStream, $utf8)
    $corpo = $leitor.ReadToEnd()
    $leitor.Close()
    try { $null = $corpo | ConvertFrom-Json } catch { return EnviarJson $resp 400 '{"erro":"JSON_INVALIDO"}' }
    GravarTexto (Join-Path $pastaSalvos "$rota.json") $corpo
    return EnviarJson $resp 200 '{"ok":true}'
  }

  EnviarJson $resp 405 '{"erro":"METODO_NAO_PERMITIDO"}'
}

function TratarArquivo($req, $resp, [string]$caminho) {
  if ($caminho -eq '' -or $caminho.EndsWith('/')) { $caminho += 'index.html' }
  $arquivo = [System.IO.Path]::GetFullPath((Join-Path $raiz $caminho))
  $status = 200
  if (-not $arquivo.StartsWith($raiz, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $arquivo -PathType Leaf)) {
    $arquivo = Join-Path $raiz '404.html'
    $status = 404
  }
  $tipo = $tipos[[System.IO.Path]::GetExtension($arquivo).ToLower()]
  if (-not $tipo) { $tipo = 'application/octet-stream' }
  Enviar $resp $status $tipo ([System.IO.File]::ReadAllBytes($arquivo))
}

$ouvinte = New-Object System.Net.HttpListener
$ouvinte.Prefixes.Add($prefixo)
$ouvinte.Start()
Write-Host "Servidor pronto em $prefixo (API em ${prefixo}api/) - feche esta janela ou aperte Ctrl+C para parar"
if ($Abrir) { AbrirNavegador }

try {
  while ($ouvinte.IsListening) {
    # Espera em pedacos de 500 ms para o Ctrl+C conseguir interromper.
    $tarefa = $ouvinte.GetContextAsync()
    while (-not $tarefa.AsyncWaitHandle.WaitOne(500)) { }
    $ctx = $tarefa.GetAwaiter().GetResult()
    $req = $ctx.Request
    $resp = $ctx.Response
    try {
      $caminho = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath).TrimStart('/')
      if ($caminho -like 'api/*') { TratarApi $req $resp $caminho.Substring(4).TrimEnd('/') }
      else { TratarArquivo $req $resp $caminho }
      Write-Host "$($resp.StatusCode) $($req.HttpMethod) $($req.Url.AbsolutePath)"
    } catch {
      Write-Host "500 $($req.HttpMethod) $($req.Url.AbsolutePath): $_"
      try { EnviarJson $resp 500 '{"erro":"ERRO_INTERNO"}' } catch { }
    } finally {
      $resp.OutputStream.Close()
    }
  }
} finally {
  $ouvinte.Stop()
}
