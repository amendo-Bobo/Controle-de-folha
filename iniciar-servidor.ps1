# Script PowerShell para iniciar o servidor ERP
Write-Host "========================================" -ForegroundColor Green
Write-Host "    SISTEMA ERP - MÁQUINAS DE COSTURA" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Set-Location "C:\Users\Usuario\Downloads\ERP"

Write-Host "Iniciando servidor..." -ForegroundColor Yellow
Write-Host "Acesse: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Acesse: http://192.168.1.101:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Mantenha esta janela aberta!" -ForegroundColor Red
Write-Host ""

try {
    node server-teste-local.js
} catch {
    Write-Host "Erro ao iniciar servidor: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Pressione qualquer tecla para fechar..." -ForegroundColor Yellow
Read-Host
