# PowerShell script to find Eclipse ADT Communication Logs

Write-Host "🔍 Searching for Eclipse ADT Communication Logs..." -ForegroundColor Cyan
Write-Host ""

# Common Eclipse log locations
$searchPaths = @(
    "$env:USERPROFILE\.eclipse",
    "$env:USERPROFILE\workspace\.metadata\.plugins",
    "$env:USERPROFILE\eclipse-workspace\.metadata\.plugins",
    "$env:USERPROFILE\Documents\SAP\workspace\.metadata\.plugins",
    "C:\SAP"
)

Write-Host "Searching in common locations..." -ForegroundColor Yellow
Write-Host ""

foreach ($path in $searchPaths) {
    if (Test-Path $path) {
        Write-Host "✓ Found: $path" -ForegroundColor Green
        
        # Look for .xml files (communication logs)
        $xmlFiles = Get-ChildItem -Path $path -Filter "*.xml" -Recurse -ErrorAction SilentlyContinue | 
                    Where-Object { $_.Name -like "*_GET_*" -or $_.Name -like "*_POST_*" } |
                    Sort-Object LastWriteTime -Descending |
                    Select-Object -First 5
        
        if ($xmlFiles) {
            Write-Host "  📄 Found recent log files:" -ForegroundColor Cyan
            foreach ($file in $xmlFiles) {
                Write-Host "     - $($file.FullName)" -ForegroundColor White
                Write-Host "       (Modified: $($file.LastWriteTime))" -ForegroundColor Gray
            }
            Write-Host ""
        }
    }
}

Write-Host ""
Write-Host "💡 If no files found above, try this:" -ForegroundColor Yellow
Write-Host "1. In Eclipse, open: Window → Show View → Communication Log"
Write-Host "2. Right-click on any entry"
Write-Host "3. Select 'Show in File Manager' or 'Properties'"
Write-Host "4. This will show you the log file location"
Write-Host ""

Write-Host "📍 Alternative: Search your entire user folder" -ForegroundColor Yellow
Write-Host "This might take a minute..." -ForegroundColor Gray
Write-Host ""

$allXmlFiles = Get-ChildItem -Path $env:USERPROFILE -Filter "*.xml" -Recurse -ErrorAction SilentlyContinue |
               Where-Object { $_.Name -like "*_sap_bc_adt_*" } |
               Sort-Object LastWriteTime -Descending |
               Select-Object -First 10

if ($allXmlFiles) {
    Write-Host "✓ Found ADT communication log files:" -ForegroundColor Green
    foreach ($file in $allXmlFiles) {
        Write-Host "  📄 $($file.FullName)" -ForegroundColor White
        Write-Host "     Modified: $($file.LastWriteTime)" -ForegroundColor Gray
    }
} else {
    Write-Host "❌ No ADT log files found yet" -ForegroundColor Red
    Write-Host ""
    Write-Host "This might mean:" -ForegroundColor Yellow
    Write-Host "1. Communication log isn't enabled yet"
    Write-Host "2. No requests have been made since enabling it"
    Write-Host "3. Logs are saved to a non-standard location"
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")


