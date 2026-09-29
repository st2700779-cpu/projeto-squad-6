@echo off
rem Abre o portal direto em uma visao, sem passar pela tela de escolha de perfil.
rem Sobe o servidor com API. Se o PowerShell estiver bloqueado, tenta com Python.
title Portal Academico - abrir uma visao
cd /d "%~dp0"

echo.
echo  Portal Academico - abrir direto em uma visao
echo  ---------------------------------------------
echo   1  Familia e estudante
echo   2  Professor
echo   3  Escola: secretaria, coordenacao e direcao
echo   4  Rede: SEDUC e DRE
echo  ---------------------------------------------
echo.
choice /c 1234 /n /m " Digite 1, 2, 3 ou 4: "

set "ALVO=familia/index.html"
if errorlevel 2 set "ALVO=professor/index.html"
if errorlevel 3 set "ALVO=escola/index.html"
if errorlevel 4 set "ALVO=rede/atos.html"

echo.
echo  Abrindo http://localhost:5500/%ALVO%
echo  Para parar, feche esta janela.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\servidor.ps1" -Porta 5500 -Abrir -Pagina "%ALVO%"
if errorlevel 1 (
  echo.
  echo  O servidor com API nao abriu. Tentando com Python: sem API, os dados ficam no navegador.
  call "%~dp0iniciar-python.bat" "%ALVO%"
)
