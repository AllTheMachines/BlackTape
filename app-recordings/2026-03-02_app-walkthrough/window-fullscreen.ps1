Add-Type -TypeDefinition '
using System;
using System.Runtime.InteropServices;
public class WinAPI {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
}
public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
'

$proc = Get-Process -Name mercury -ErrorAction SilentlyContinue | Select-Object -First 1
if ($proc) {
    $handle = $proc.MainWindowHandle
    Write-Host "Found mercury PID: $($proc.Id), Handle: $handle"

    # Step 1: Restore from minimized state (SW_RESTORE = 9)
    [WinAPI]::ShowWindow($handle, 9) | Out-Null
    Start-Sleep -Milliseconds 500

    # Step 2: SetForegroundWindow
    [WinAPI]::SetForegroundWindow($handle) | Out-Null
    Start-Sleep -Milliseconds 300

    # Step 3: SetWindowPos — position 0,0, size 1920x1080, SWP_NOZORDER (no TOPMOST)
    [WinAPI]::SetWindowPos($handle, [IntPtr]::Zero, 0, 0, 1920, 1080, 0x0004) | Out-Null
    Start-Sleep -Milliseconds 500

    # Step 4: SetForegroundWindow again (belt and suspenders)
    [WinAPI]::SetForegroundWindow($handle) | Out-Null

    Start-Sleep -Seconds 1

    # Verify
    $rect = New-Object RECT
    [WinAPI]::GetWindowRect($handle, [ref]$rect) | Out-Null
    Write-Host "After:  Left=$($rect.Left) Top=$($rect.Top) Right=$($rect.Right) Bottom=$($rect.Bottom)"
    Write-Host "Size: $($rect.Right - $rect.Left) x $($rect.Bottom - $rect.Top)"
} else {
    Write-Host "mercury.exe not found"
}
