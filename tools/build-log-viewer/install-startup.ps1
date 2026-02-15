$WshShell = New-Object -ComObject WScript.Shell
$startupPath = [System.IO.Path]::Combine($env:APPDATA, 'Microsoft\Windows\Start Menu\Programs\Startup', 'Mercury Build Log Viewer.lnk')
$Shortcut = $WshShell.CreateShortcut($startupPath)
$Shortcut.TargetPath = Join-Path $PSScriptRoot 'start-hidden.vbs'
$Shortcut.WorkingDirectory = $PSScriptRoot
$Shortcut.Description = 'Mercury Build Log Viewer - localhost:18800'
$Shortcut.Save()
Write-Host "Startup shortcut created at: $startupPath"
Write-Host "Build log viewer will auto-start on login at http://localhost:18800"
