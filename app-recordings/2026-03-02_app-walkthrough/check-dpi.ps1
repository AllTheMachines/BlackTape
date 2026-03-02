Add-Type -TypeDefinition '
using System;
using System.Runtime.InteropServices;
public class DpiCheck {
    [DllImport("user32.dll")] public static extern int GetDpiForSystem();
    [DllImport("user32.dll")] public static extern int GetDpiForWindow(IntPtr hwnd);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    [DllImport("user32.dll")] public static extern int GetSystemMetrics(int nIndex);
    [DllImport("shcore.dll")] public static extern int GetDpiForMonitor(IntPtr hmonitor, int dpiType, out uint dpiX, out uint dpiY);
    [DllImport("user32.dll")] public static extern IntPtr MonitorFromWindow(IntPtr hwnd, uint dwFlags);
}
public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
'

$proc = Get-Process -Name mercury -ErrorAction SilentlyContinue | Select-Object -First 1
if ($proc) {
    $handle = $proc.MainWindowHandle
    Write-Host "Mercury handle: $handle"

    $sysDpi = [DpiCheck]::GetDpiForSystem()
    Write-Host "System DPI: $sysDpi (scaling: $([math]::Round($sysDpi / 96 * 100))%)"

    try {
        $winDpi = [DpiCheck]::GetDpiForWindow($handle)
        Write-Host "Window DPI: $winDpi"
    } catch {
        Write-Host "GetDpiForWindow failed"
    }

    # SM_CXSCREEN (0) and SM_CYSCREEN (1)
    $screenW = [DpiCheck]::GetSystemMetrics(0)
    $screenH = [DpiCheck]::GetSystemMetrics(1)
    Write-Host "GetSystemMetrics screen: ${screenW}x${screenH}"

    # SM_CXVIRTUALSCREEN (78) and SM_CYVIRTUALSCREEN (79)
    $vw = [DpiCheck]::GetSystemMetrics(78)
    $vh = [DpiCheck]::GetSystemMetrics(79)
    Write-Host "Virtual screen: ${vw}x${vh}"

    $rect = New-Object RECT
    [DpiCheck]::GetWindowRect($handle, [ref]$rect) | Out-Null
    Write-Host "Window rect: Left=$($rect.Left) Top=$($rect.Top) Right=$($rect.Right) Bottom=$($rect.Bottom)"
    Write-Host "Window size: $($rect.Right - $rect.Left) x $($rect.Bottom - $rect.Top)"

    try {
        $monitor = [DpiCheck]::MonitorFromWindow($handle, 2)
        $dpiX = [uint32]0
        $dpiY = [uint32]0
        [DpiCheck]::GetDpiForMonitor($monitor, 0, [ref]$dpiX, [ref]$dpiY) | Out-Null
        Write-Host "Monitor DPI: ${dpiX}x${dpiY} (scaling: $([math]::Round($dpiX / 96 * 100))%)"
    } catch {
        Write-Host "Monitor DPI check failed: $_"
    }
} else {
    Write-Host "blacktape.exe not found"
}
