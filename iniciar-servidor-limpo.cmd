@echo off
echo MATANDO PROCESSOS ANTIGOS...
taskkill /F /IM node.exe 2>nul
echo.
echo PORTA 3000 LIBERADA!
echo.
echo Iniciando SERVIDOR COMPLETO...
cd /d "C:\Users\Usuario\Downloads\ERP"
echo.
echo Acesse: http://localhost:3000
echo Acesse: http://192.168.1.101:3000
echo Teste: http://192.168.1.101:3000/debug
echo.
echo Mantenha esta janela aberta!
echo.
node server-completo.js
pause
