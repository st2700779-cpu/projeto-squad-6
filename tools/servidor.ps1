# Servidor estatico local para o portal (alternativa ao Live Server, sem Node nem Python).
# Uso: powershell -ExecutionPolicy Bypass -File tools/servidor.ps1 [-Porta 5500]
# Usado pelo VS Code (F5) via .vscode/tasks.json.
param([int]$Porta = 5500)

$raiz = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$prefixo = "http://localhost:$Porta/"

# Se ja houver um servidor na porta (outra execucao ou o Live Server), so avisa e sai.
$ocupada = Get-NetTCPConnection -LocalPort $Porta -State Listen -ErrorAction SilentlyContinue
if ($ocupada) {
  Write-Host "Servidor pronto em $prefixo (porta ja estava em uso)"
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

$ouvinte = New-Object System.Net.HttpListener
$ouvinte.Prefixes.Add($prefixo)
$ouvinte.Start()
Write-Host "Servidor pronto em $prefixo (Ctrl+C para parar)"

try {
  while ($ouvinte.IsListening) {
    $ctx = $ouvinte.GetContext()
    $resp = $ctx.Response
    try {
      $caminho = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
      if ($caminho -eq '' -or $caminho.EndsWith('/')) { $caminho += 'index.html' }
      $arquivo = [System.IO.Path]::GetFullPath((Join-Path $raiz $caminho))
      $status = 200
      if (-not $arquivo.StartsWith($raiz, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $arquivo -PathType Leaf)) {
        $arquivo = Join-Path $raiz '404.html'
        $status = 404
      }
      $ext = [System.IO.Path]::GetExtension($arquivo).ToLower()
      $tipo = $tipos[$ext]
      if (-not $tipo) { $tipo = 'application/octet-stream' }
      $bytes = [System.IO.File]::ReadAllBytes($arquivo)
      $resp.StatusCode = $status
      $resp.ContentType = $tipo
      $resp.Headers.Add('Cache-Control', 'no-store')
      $resp.ContentLength64 = $bytes.Length
      $resp.OutputStream.Write($bytes, 0, $bytes.Length)
      Write-Host "$status $($ctx.Request.Url.AbsolutePath)"
    } catch {
      $resp.StatusCode = 500
    } finally {
      $resp.OutputStream.Close()
    }
  }
} finally {
  $ouvinte.Stop()
}
