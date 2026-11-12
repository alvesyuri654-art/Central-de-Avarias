@echo off
title Central de Avarias - Sistema Corporativo
cls
pushd "%~dp0"

echo ========================================================
echo   CENTRAL DE AVARIAS - GESTAO MULTIUNIDADE
echo ========================================================
echo.
echo Iniciando servidor e abrindo aplicacao no navegador...
start "" wscript.exe "%~dp0abrir_sistema.vbs"

popd
exit
