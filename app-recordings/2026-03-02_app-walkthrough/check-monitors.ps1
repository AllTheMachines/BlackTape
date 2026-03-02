Add-Type -AssemblyName System.Windows.Forms

$screens = [System.Windows.Forms.Screen]::AllScreens
foreach ($s in $screens) {
    $b = $s.Bounds
    $w = $s.WorkingArea
    Write-Host "Monitor: $($s.DeviceName)"
    Write-Host "  Primary: $($s.Primary)"
    Write-Host "  Bounds: Left=$($b.Left) Top=$($b.Top) Width=$($b.Width) Height=$($b.Height)"
    Write-Host "  WorkingArea: Left=$($w.Left) Top=$($w.Top) Width=$($w.Width) Height=$($w.Height)"
    Write-Host ""
}

$vLeft = [System.Windows.Forms.SystemInformation]::VirtualScreen.Left
$vTop = [System.Windows.Forms.SystemInformation]::VirtualScreen.Top
$vWidth = [System.Windows.Forms.SystemInformation]::VirtualScreen.Width
$vHeight = [System.Windows.Forms.SystemInformation]::VirtualScreen.Height
Write-Host "Virtual Screen: Left=$vLeft Top=$vTop Width=$vWidth Height=$vHeight"
