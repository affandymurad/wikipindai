# Small image helper for the store-asset build (System.Drawing; no extra tools needed).
#   img.ps1 -Op resize -In a.png -Out b.png -W 128 -H 128        high-quality resize, alpha kept
#   img.ps1 -Op crop   -In a.png -Out b.png -X 0 -Y 0 -W 400 -H 700
#   img.ps1 -Op jpeg   -In a.png -Out b.jpg -Q 85 [-W 960]        flatten on white, optional width
#   img.ps1 -Op flatten -In a.png -Out b.png                      remove alpha (24-bit PNG for the store)
param([string]$Op, [string]$In, [string]$Out, [int]$W = 0, [int]$H = 0, [int]$X = 0, [int]$Y = 0, [int]$Q = 85)
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile($In)
function NewCanvas($w, $h, $alpha) {
  $fmt = if ($alpha) { [System.Drawing.Imaging.PixelFormat]::Format32bppArgb } else { [System.Drawing.Imaging.PixelFormat]::Format24bppRgb }
  $bmp = New-Object System.Drawing.Bitmap $w, $h, $fmt
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = 'HighQuality'; $g.PixelOffsetMode = 'HighQuality'; $g.CompositingQuality = 'HighQuality'
  if (-not $alpha) { $g.Clear([System.Drawing.Color]::White) }
  return @($bmp, $g)
}
switch ($Op) {
  'resize' { $bmp, $g = NewCanvas $W $H $true; $g.DrawImage($src, 0, 0, $W, $H); $fmt = [System.Drawing.Imaging.ImageFormat]::Png }
  'crop'   { $bmp, $g = NewCanvas $W $H $true; $g.DrawImage($src, (New-Object System.Drawing.Rectangle 0, 0, $W, $H), $X, $Y, $W, $H, [System.Drawing.GraphicsUnit]::Pixel); $fmt = [System.Drawing.Imaging.ImageFormat]::Png }
  'flatten' { $bmp, $g = NewCanvas $src.Width $src.Height $false; $g.DrawImage($src, 0, 0, $src.Width, $src.Height); $fmt = [System.Drawing.Imaging.ImageFormat]::Png }
  'jpeg'   {
    $tw = if ($W -gt 0) { $W } else { $src.Width }; $th = [int][math]::Round($src.Height * $tw / $src.Width)
    $bmp, $g = NewCanvas $tw $th $false; $g.DrawImage($src, 0, 0, $tw, $th); $fmt = $null
  }
}
$g.Dispose(); $src.Dispose()
if ($Op -eq 'jpeg') {
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $p = New-Object System.Drawing.Imaging.EncoderParameters 1
  $p.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]$Q)
  $bmp.Save($Out, $codec, $p)
} else { $bmp.Save($Out, $fmt) }
$bmp.Dispose()
