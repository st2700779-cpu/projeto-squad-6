@echo off
rem Abre o portal no seu computador com dois cliques: sobe um servidor local e abre a entrada no navegador.
rem Usa o Python se existir; sem Python, usa o servidor do PowerShell (tools\servidor.ps1).
rem Em localhost funcionam o login, o QR Code, a verificacao de documentos, o PWA e o diario offline.
rem Para parar, feche esta janela.
title Portal Academico - local
cd /d "%~dp0"
set "PORTA=5500"

echo.
echo  Portal Academico - Squad 6 (local)
echo  ---------------------------------------------
echo   Endereco:   http://localhost:%PORTA%/
echo.
echo   Contas de demonstracao
echo     Aluno       202610317          senha aluno2026
echo     Professor   PF-30412           senha prof2026
echo     Secretaria  secretaria.osvaldo senha secretaria2026
echo     Rede        seed.tecnico      senha rede2026
echo     Matricula (familia): sem login
echo  ---------------------------------------------
echo   Para parar o servidor, feche esta janela.
echo.

netstat -ano | findstr ":%PORTA% " | findstr LISTENING >nul
if not errorlevel 1 (
  echo  A porta %PORTA% ja esta em uso. Abrindo o portal no servidor que ja esta rodando.
  start "" "http://localhost:%PORTA%/"
  timeout /t 3 /nobreak >nul
  exit /b 0
)

set "PY="
py -3 --version >nul 2>nul
if not errorlevel 1 set "PY=py -3"
if not defined PY python --version >nul 2>nul
if not defined PY if not errorlevel 1 set "PY=python"

if defined PY (
  echo  Servidor: Python. As alteracoes ficam salvas so neste navegador.
  start "" "http://localhost:%PORTA%/"
  %PY% -m http.server %PORTA%
  exit /b
)

echo  Python nao encontrado. Usando o servidor do PowerShell.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\servidor.ps1" -Porta %PORTA% -Abrir
if errorlevel 1 (
  echo.
  echo  Nao foi possivel abrir nenhum servidor.
  echo  Instale o Python em https://www.python.org/downloads ^(marque Add Python to PATH^)
  echo  ou de dois cliques em iniciar-mobile.bat para abrir so o prototipo em arquivo unico.
  echo.
  pause
)
