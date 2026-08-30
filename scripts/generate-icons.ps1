# ============================================================
#  generate-icons.ps1
#  Builds the favicon / app-icon set from public/assets/icon-logo.png.
#  Run from the repo root:  powershell -File scripts\generate-icons.ps1
#  Then run:                node scripts\make-ico.mjs
# ============================================================

Add-Type -AssemblyName System.Drawing

$root   = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'public\assets\icon-logo.png'
$outDir = Join-Path $root 'public'
$tmpDir = Join-Path $root 'public\.ico-tmp'

if (-not (Test-Path $source)) { throw "Source icon not found: $source" }
if (-not (Test-Path $tmpDir)) { New-Item -ItemType Directory -Path $tmpDir | Out-Null }

# The logo sits inside a rounded-square frame with ~15% padding. At 16-32px the
# glyph turns into an unreadable smudge, so the small sizes crop past the padding.
$INSET = 0.12

function Save-Icon {
  param(
    [System.Drawing.Image] $Src,
    [string] $Path,
    [int]    $Size,
    [double] $Inset = 0.0
  )

  $crop = [int]([Math]::Round($Src.Width * (1.0 - 2.0 * $Inset)))
  $off  = [int]([Math]::Round($Src.Width * $Inset))
  $srcRect = New-Object System.Drawing.Rectangle $off, $off, $crop, $crop

  $bmp = New-Object System.Drawing.Bitmap $Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g   = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

  $dstRect = New-Object System.Drawing.Rectangle 0, 0, $Size, $Size
  $g.DrawImage($Src, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

  $g.Dispose()
  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()

  $kb = [Math]::Round((Get-Item $Path).Length / 1KB, 1)
  Write-Host ("  {0,-34} {1,4}x{1,-4} {2,7} KB" -f (Split-Path $Path -Leaf), $Size, $kb)
}

$img = [System.Drawing.Image]::FromFile($source)
Write-Host "Source: $($img.Width)x$($img.Height)`n"

Write-Host "Browser favicons (cropped ${INSET}):"
Save-Icon $img (Join-Path $outDir 'favicon-16x16.png')   16  $INSET
Save-Icon $img (Join-Path $outDir 'favicon-32x32.png')   32  $INSET

# Intermediate PNGs consumed by make-ico.mjs, deleted afterwards.
Save-Icon $img (Join-Path $tmpDir 'ico-16.png')          16  $INSET
Save-Icon $img (Join-Path $tmpDir 'ico-32.png')          32  $INSET
Save-Icon $img (Join-Path $tmpDir 'ico-48.png')          48  $INSET

Write-Host "`nApp icons (full frame):"
Save-Icon $img (Join-Path $outDir 'apple-touch-icon.png') 180 0.0
Save-Icon $img (Join-Path $outDir 'icon-192.png')         192 0.0
Save-Icon $img (Join-Path $outDir 'icon-512.png')         512 0.0

$img.Dispose()
Write-Host "`nDone. Next: node scripts\make-ico.mjs"
