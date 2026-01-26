Add-Type -AssemblyName System.Windows.Forms
$img = [System.Windows.Forms.Clipboard]::GetImage()
if ($img) {
    $img.Save('E:/Naraddon/homepage/public/popup/broker-warning.png', [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Saved: broker-warning.png"
} else {
    Write-Host "No image in clipboard"
}
