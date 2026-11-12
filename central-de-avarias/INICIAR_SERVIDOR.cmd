@echo off
title Central de Avarias - Servidor Web Local
pushd "%~dp0"
echo Iniciando Central de Avarias na porta 5173...
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0iniciar_servidor.ps1"
pause
popd
