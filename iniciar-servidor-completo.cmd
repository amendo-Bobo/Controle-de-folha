@echo off
cd /d "C:\Users\Usuario\Downloads\ERP"
echo Iniciando SERVIDOR COMPLETO...
echo.
echo Acesse: http://localhost:3000
echo Acesse: http://192.168.1.101:3000
echo Teste: http://192.168.1.101:3000/debug
echo.
echo Mantenha esta janela aberta!
echo.
node server-completo.js
pause
