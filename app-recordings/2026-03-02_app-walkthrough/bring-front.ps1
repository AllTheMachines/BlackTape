Add-Type -TypeDefinition '
using System;
using System.Runtime.InteropServices;
public class WF {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
}
'
$p = Get-Process -Name mercury -ErrorAction SilentlyContinue | Select-Object -First 1
if ($p) {
    [WF]::ShowWindow($p.MainWindowHandle, 9) | Out-Null
    Start-Sleep -Milliseconds 300
    [WF]::SetForegroundWindow($p.MainWindowHandle) | Out-Null
    Write-Host "Foreground set for PID $($p.Id)"
} else {
    Write-Host "blacktape.exe not found"
}
