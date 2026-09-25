# Start Thin Client Servers
# This script starts both the HTTP MCP and the local agent

Write-Host "`n🚀 Starting Thin Client Servers..." -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

# Set environment variables
$env:REQUIRE_AUTH = "false"
$env:HTTP_PORT = "3000"
$env:PORT = "3001"

# Start HTTP MCP Server (port 3000)
Write-Host "📡 Starting HTTP MCP Server (port 3000)..." -ForegroundColor Yellow
Start-Process -FilePath "node" -ArgumentList "server_http_thin.js" -WorkingDirectory "$PSScriptRoot" -WindowStyle Normal

Start-Sleep -Seconds 3

# Start Local Agent (port 3001)
Write-Host "🛡️  Starting Local Agent (port 3001)..." -ForegroundColor Yellow
Start-Process -FilePath "node" -ArgumentList "simple-agent-server.js" -WorkingDirectory "$PSScriptRoot\secure-agent" -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host "`n✅ Servers started!" -ForegroundColor Green
Write-Host "`n📍 Endpoints:" -ForegroundColor Cyan
Write-Host "   • HTTP MCP:     http://localhost:3000/health" -ForegroundColor White
Write-Host "   • Local Agent:  http://localhost:3001/health" -ForegroundColor White
Write-Host "`n💡 Test with:" -ForegroundColor Cyan
Write-Host "   curl http://localhost:3000/health" -ForegroundColor Gray
Write-Host "   curl http://localhost:3001/health" -ForegroundColor Gray
Write-Host ""
