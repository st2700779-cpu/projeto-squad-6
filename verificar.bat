@echo off
rem Atualiza o prototipo em arquivo unico com os dados e as regras do portal
rem e confere o contraste das cores nos quatro temas. Precisa do Node.js 18 ou mais novo.
title Portal Academico - verificacao
cd /d "%~dp0"

node --version >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js nao encontrado. Instale em https://nodejs.org versao 18 ou mais nova.
  echo  So estas duas verificacoes precisam dele: o portal em si roda sem Node.
  echo.
  pause
  exit /b 1
)

echo.
echo  [1 de 2] Atualizando o prototipo em arquivo unico...
node tools\gerar-prototipo.mjs
if errorlevel 1 (
  echo.
  echo  Nao foi possivel atualizar o prototipo. Veja a mensagem acima.
  pause
  exit /b 1
)

echo.
echo  [2 de 2] Conferindo o contraste das cores nos quatro temas...
node tools\verificar-contraste.mjs
set "RESULTADO=%errorlevel%"

echo.
if "%RESULTADO%"=="0" (
  echo  Tudo certo.
) else (
  echo  Ha combinacoes de cores abaixo do minimo. Veja as linhas FALHA acima.
)
echo.
pause
exit /b %RESULTADO%
