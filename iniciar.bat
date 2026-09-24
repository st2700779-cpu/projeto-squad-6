@echo off
rem Inicia o Portal Academico: escolha como abrir e o servidor (site + API) sobe sozinho.
rem Basta dar dois cliques neste arquivo. Para parar, feche a janela.
title Portal Academico - Squad 6
cd /d "%~dp0"

echo.
echo  Portal Academico - Squad 6
echo  ---------------------------------------------
echo   1  Portal no navegador (computador)
echo   2  Portal em janela de celular
echo   3  Prototipo mobile (arquivo unico, sem servidor)
echo   4  Reiniciar a demonstracao e abrir o portal
echo  ---------------------------------------------
echo.
choice /c 1234 /n /t 15 /d 1 /m " Digite 1, 2, 3 ou 4 (em 15 s abre a opcao 1): "
set "OPCAO=%errorlevel%"

if "%OPCAO%"=="3" (
  call "%~dp0iniciar-mobile.bat"
  exit /b
)

if "%OPCAO%"=="4" (
  rem Apaga o que foi salvo pela API (pedidos, turmas, chamadas, declaracoes...).
  if exist "%~dp0dados-salvos" rmdir /s /q "%~dp0dados-salvos"
  echo.
  echo  Dados da demonstracao apagados. Tudo volta ao inicio.
)

set "MODO=-Abrir"
if "%OPCAO%"=="2" set "MODO=-Abrir -Celular"

echo.
echo  Site: http://localhost:5500
echo  API:  http://localhost:5500/api/
echo  Para parar, feche esta janela.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\servidor.ps1" -Porta 5500 %MODO%
if errorlevel 1 (
  echo.
  echo  O servidor parou com erro. Veja a mensagem acima.
  pause
)
