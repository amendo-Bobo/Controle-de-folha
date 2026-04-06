@echo off
title Iniciar Sistema ERP
color 0A

echo ========================================
echo     SISTEMA ERP - MÁQUINAS DE COSTURA
echo ========================================
echo.
echo Iniciando o servidor...
echo.

cd /d "%~dp0"

REM Verificar se o Node.js está instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    echo Por favor, instale o Node.js em: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Verificar se o npm está instalado
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] npm nao encontrado!
    echo Por favor, instale o Node.js em: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js encontrado
echo [OK] npm encontrado
echo.
echo Iniciando servidor na porta 3000...
echo.
echo O sistema estara disponivel em: http://localhost:3000
echo.
echo Pressione CTRL+C para parar o servidor
echo ========================================
echo.

npm start

pause
