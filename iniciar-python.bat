@echo off
rem Abre o portal com o servidor simples do Python. Serve para computadores em que o PowerShell esta bloqueado.
rem Sem a API de dados: as alteracoes ficam salvas no navegador (localStorage), nao em disco.
rem Uso: dois cliques, ou iniciar-python.bat familia/index.html para abrir uma pagina especifica.
title Portal Academico - servidor com Python
cd /d "%~dp0"

set "PAGINA=%~1"
set "PORTA=5500"
set "PY="
py -3 --version >nul 2>nul
if not errorlevel 1 set "PY=py -3"
if not defined PY python --version >nul 2>nul
if not defined PY if not errorlevel 1 set "PY=python"

if not defined PY (
  echo.
  echo  Python nao encontrado neste computador.
  echo  Opcoes:
  echo    - Instale o Python em https://www.python.org/downloads e marque Add Python to PATH.
  echo    - Ou de dois cliques em iniciar-mobile.bat: o prototipo em arquivo unico abre sem servidor.
  echo.
  pause
  exit /b 1
)

netstat -ano | findstr ":%PORTA% " | findstr LISTENING >nul
if not errorlevel 1 (
  echo  A porta %PORTA% ja esta em uso. Abrindo o portal no servidor que ja esta rodando.
) else (
  echo  Iniciando o servidor em http://localhost:%PORTA%/ ...
  start "Servidor Portal" /min %PY% -m http.server %PORTA%
  timeout /t 2 /nobreak >nul
)

start "" "http://localhost:%PORTA%/%PAGINA%"
echo.
echo  Portal aberto em http://localhost:%PORTA%/%PAGINA%
echo  Sem a API de dados: as alteracoes ficam salvas so neste navegador.
echo  Para parar o servidor, aperte uma tecla aqui.
pause >nul
taskkill /fi "WINDOWTITLE eq Servidor Portal*" /t /f >nul 2>nul
