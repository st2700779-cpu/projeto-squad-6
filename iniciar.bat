@echo off
rem Inicia o Portal Academico: sobe o servidor (site + API) e abre o navegador.
rem Basta dar dois cliques neste arquivo. Para parar, feche a janela.
title Portal Academico - Squad 6
cd /d "%~dp0"

echo.
echo  Portal Academico - Squad 6
echo  Site: http://localhost:5500
echo  API:  http://localhost:5500/api/
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\servidor.ps1" -Porta 5500 -Abrir
if errorlevel 1 (
  echo.
  echo  O servidor parou com erro. Veja a mensagem acima.
  pause
)
