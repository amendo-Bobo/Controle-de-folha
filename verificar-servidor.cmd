@echo off
echo Verificando se o servidor esta rodando...
echo.
echo Testando conexao com o servidor...
curl http://localhost:3000/debug 2>nul
if %errorlevel% equ 0 (
    echo [OK] Servidor respondendo!
) else (
    echo [ERRO] Servidor nao esta respondendo!
    echo Talvez voce precise reiniciar o servidor.
)
echo.
echo Pressione qualquer tecla para fechar...
pause >nul
