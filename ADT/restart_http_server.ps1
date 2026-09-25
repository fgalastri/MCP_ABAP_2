# Quick Restart Script for HTTP MCP Server
# Run this whenever the SAP connection drops

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  HTTP MCP Server - Quick Restart" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Stop any running HTTP server
Write-Host "1. Stopping existing HTTP server..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Where-Object {
    $_.MainModuleName -eq "node.exe" -and 
    $_.CommandLine -like "*server_http*"
} | ForEach-Object {
    Write-Host "   Stopping process $($_.Id)..." -ForegroundColor Gray
    Stop-Process -Id $_.Id -Force
}
Start-Sleep -Seconds 2

# Change to ADT directory
Write-Host "`n2. Navigating to ADT directory..." -ForegroundColor Yellow
Set-Location -Path $PSScriptRoot

# Set environment variables
Write-Host "`n3. Setting environment variables..." -ForegroundColor Yellow
$env:HTTP_PORT = "3000"
$env:HTTP_API_KEY = "natura-mcp-2026"
$env:REQUIRE_AUTH = "true"
$env:SAP_SYSTEM = "DEV"

Write-Host "   HTTP_PORT: $env:HTTP_PORT" -ForegroundColor Gray
Write-Host "   SAP_SYSTEM: $env:SAP_SYSTEM" -ForegroundColor Gray
Write-Host "   REQUIRE_AUTH: $env:REQUIRE_AUTH" -ForegroundColor Gray

# Start the server
Write-Host "`n4. Starting HTTP MCP Server..." -ForegroundColor Yellow
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Server Starting..." -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

node server_http_v2.js

# This line will only execute if the server stops
Write-Host "`n========================================" -ForegroundColor Red
Write-Host "  Server Stopped" -ForegroundColor Red
Write-Host "========================================`n" -ForegroundColor Red
