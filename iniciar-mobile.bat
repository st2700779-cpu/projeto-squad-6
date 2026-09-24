@echo off
rem Abre a versao mobile do prototipo (sistema-academico-seduc-prototipo.html)
rem numa janela do tamanho de um celular, sem abas nem barra de endereco.
rem Basta dar dois cliques. Para fechar, feche a janela.
title Portal Academico - versao mobile
cd /d "%~dp0"

set "PAGINA=%~dp0sistema-academico-seduc-prototipo.html"
set "URL=file:///%PAGINA:\=/%"
rem Perfil separado do navegador: garante que a janela abra no tamanho de celular.
set "PERFIL=%LOCALAPPDATA%\PortalAcademicoMobile"
set "OPCOES=--app="%URL%" --window-size=412,915 --window-position=100,40 --user-data-dir="%PERFIL%" --no-first-run"

if not exist "%PAGINA%" (
  echo Nao encontrei o arquivo:
  echo %PAGINA%
  pause
  exit /b 1
)

set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"

if exist "%EDGE%" (
  start "" "%EDGE%" %OPCOES%
) else if exist "%CHROME%" (
  start "" "%CHROME%" %OPCOES%
) else (
  echo Edge e Chrome nao encontrados. Abrindo no navegador padrao.
  echo Para ver como celular, aperte F12 e depois Ctrl+Shift+M.
  start "" "%URL%"
  pause
)
