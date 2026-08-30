# ============================================================
#  generate-og.ps1
#  Builds public/assets/og-image.png — the 1200x630 card that shows
#  when alexball.dev is shared on iMessage, Slack, Discord, LinkedIn, X.
#
#  Run from the repo root:  powershell -File scripts\generate-og.ps1
#
#  Brand fonts (Space Grotesk / Inter / JetBrains Mono) are not installed
#  on Windows, so they're pulled from Google Fonts as static TrueType and
#  loaded per-file into their own PrivateFontCollection. Falls back to
#  Segoe UI — loudly — if the network is unavailable.
# ============================================================

Add-Type -AssemblyName System.Drawing
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# GDI+ PathGradientBrush interpolates low-alpha stops badly — it bands into
# concentric rings and shifts hue green over a near-black ground. Compositing
# the halo per pixel gives an exactly smooth falloff instead.
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;

public static class Halo {
  public static void Radial(Bitmap bmp, float cx, float cy, float radius,
                            int cr, int cg, int cb, float maxAlpha) {
    int x0 = Math.Max(0, (int)(cx - radius)), x1 = Math.Min(bmp.Width,  (int)(cx + radius) + 1);
    int y0 = Math.Max(0, (int)(cy - radius)), y1 = Math.Min(bmp.Height, (int)(cy + radius) + 1);
    if (x1 <= x0 || y1 <= y0) return;

    Rectangle rect = new Rectangle(x0, y0, x1 - x0, y1 - y0);
    BitmapData d = bmp.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
    int w = rect.Width, h = rect.Height;
    byte[] buf = new byte[Math.Abs(d.Stride) * h];
    System.Runtime.InteropServices.Marshal.Copy(d.Scan0, buf, 0, buf.Length);

    for (int y = 0; y < h; y++) {
      int row = y * d.Stride;
      float dy = (y0 + y) - cy;
      for (int x = 0; x < w; x++) {
        float dx = (x0 + x) - cx;
        float t = (float)Math.Sqrt(dx * dx + dy * dy) / radius;
        if (t >= 1f) continue;
        // smoothstep, squared: dense core, long soft tail, no visible terminus
        float s = 1f - t;
        float f = s * s * (3f - 2f * s) * s;
        float a = maxAlpha * f;
        int i = row + x * 4;                       // BGRA
        buf[i]     = (byte)(cb * a + buf[i]     * (1 - a));
        buf[i + 1] = (byte)(cg * a + buf[i + 1] * (1 - a));
        buf[i + 2] = (byte)(cr * a + buf[i + 2] * (1 - a));
        buf[i + 3] = 255;
      }
    }

    System.Runtime.InteropServices.Marshal.Copy(buf, 0, d.Scan0, buf.Length);
    bmp.UnlockBits(d);
  }
}
'@

$root     = Split-Path -Parent $PSScriptRoot
$headshot = Join-Path $root 'public\assets\headshot.png'   # actually a JPEG; loaded by content, not extension
$outPath  = Join-Path $root 'public\assets\og-image.png'
$fontDir  = Join-Path $env:TEMP 'alexball-og-fonts'

if (-not (Test-Path $headshot)) { throw "Headshot not found: $headshot" }
if (-not (Test-Path $fontDir))  { New-Item -ItemType Directory -Path $fontDir | Out-Null }

# ---- Canvas ------------------------------------------------
$W = 1200; $H = 630

# ---- Palette (src/styles/styles.css) -----------------------
function RGB([int]$r,[int]$g,[int]$b,[int]$a=255) { [System.Drawing.Color]::FromArgb($a,$r,$g,$b) }
$BG      = RGB 0x0B 0x0F 0x14
$BG2     = RGB 0x0E 0x14 0x1C
$BLUE    = RGB 0x2D 0x7F 0xF9
$GOLD    = RGB 0xD4 0xAF 0x37
$WHITE   = RGB 0xFF 0xFF 0xFF
$MUTED   = RGB 0x94 0xA3 0xB8
# --faint (#5B6676) is too dim to survive the thumbnail downscale most link
# unfurlers apply, so the statement sits between --faint and --muted.
$SUBTLE  = RGB 0x7C 0x8A 0x9C

# ---- Copy (src/data/siteData.js identity block) ------------
$NAME      = 'ALEXANDER D. BALL'
$TITLE     = 'Software Engineer'
$STATEMENT = 'Building modern software with clarity, reliability, and purpose.'
$DOMAIN    = 'alexball.dev'

# ---- Fonts -------------------------------------------------
# An old Android UA makes the Google Fonts v1 API serve static-instance
# TrueType at the exact weight asked for. A modern UA gets woff2, and the
# IE6 UA gets EOT — neither of which GDI+ can load.
$UA = 'Mozilla/5.0 (Linux; U; Android 4.0.3; en-us) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30'
$script:usedFallback = $false
$script:collections  = @()   # keep alive: GDI+ reads these lazily at draw time

function Get-BrandFamily {
  param([string] $Query, [string] $CacheName)

  $file = Join-Path $fontDir "$CacheName.ttf"
  if (-not (Test-Path $file)) {
    try {
      $css = (Invoke-WebRequest -Uri "https://fonts.googleapis.com/css?family=$Query" `
                -UserAgent $UA -UseBasicParsing -TimeoutSec 30).Content
      $url = ([regex]'url\((https://[^)]+\.ttf)\)').Match($css).Groups[1].Value
      if (-not $url) { throw 'no truetype url in css' }
      Invoke-WebRequest -Uri $url -OutFile $file -UserAgent $UA -UseBasicParsing -TimeoutSec 40
    } catch {
      Write-Warning "Could not fetch '$Query' ($($_.Exception.Message)) — falling back to Segoe UI."
      $script:usedFallback = $true
      return [System.Drawing.FontFamily]::new('Segoe UI')
    }
  }

  # Each file gets its own collection so the file -> family binding is exact;
  # static VF instances carry unreliable family names when pooled together.
  try {
    $pfc = New-Object System.Drawing.Text.PrivateFontCollection
    $pfc.AddFontFile($file)
    $script:collections += $pfc
    return $pfc.Families[0]
  } catch {
    Write-Warning "Could not load $file — falling back to Segoe UI."
    $script:usedFallback = $true
    return [System.Drawing.FontFamily]::new('Segoe UI')
  }
}

$famName  = Get-BrandFamily 'Space+Grotesk:600'  'space-grotesk-600'
$famTitle = Get-BrandFamily 'Inter:500'          'inter-500'
$famBody  = Get-BrandFamily 'Inter:400'          'inter-400'
$famMono  = Get-BrandFamily 'JetBrains+Mono:500' 'jetbrains-mono-500'

# ---- Surface -----------------------------------------------
$bmp = New-Object System.Drawing.Bitmap $W, $H, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g   = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$g.TextRenderingHint  = [System.Drawing.Text.TextRenderingHint]::AntiAlias

# Background: near-black with a faint diagonal lift toward --bg-2
$bgRect  = New-Object System.Drawing.Rectangle 0, 0, $W, $H
$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $bgRect, $BG, $BG2, 35.0
$g.FillRectangle($bgBrush, $bgRect)
$bgBrush.Dispose()

# ---- Portrait ----------------------------------------------
$cx = 292.0; $cy = 315.0; $r = 196.0

# Accent halo behind the portrait — composited per pixel (see Halo above).
$g.Flush()
[Halo]::Radial($bmp, $cx, $cy, 330.0, 0x2D, 0x7F, 0xF9, 0.30)

# Head-and-shoulders crop from the 1254x1254 source, then a circular clip.
$photo = [System.Drawing.Image]::FromFile($headshot)
$side  = [double]$photo.Width
$cropSide = $side * 0.72
$cropX = ($side - $cropSide) / 2.0
$cropY = $side * 0.045
$srcRect = New-Object System.Drawing.RectangleF $cropX, $cropY, $cropSide, $cropSide

$clip = New-Object System.Drawing.Drawing2D.GraphicsPath
$clip.AddEllipse($cx - $r, $cy - $r, $r * 2, $r * 2)
$g.SetClip($clip)
$dstRect = New-Object System.Drawing.RectangleF ($cx - $r), ($cy - $r), ($r * 2), ($r * 2)
$g.DrawImage($photo, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
$g.ResetClip()
$photo.Dispose(); $clip.Dispose()

# Ring: soft outer halo + crisp inner stroke
foreach ($ring in @(@(14.0, 26), @(7.0, 52), @(2.5, 150))) {
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb($ring[1], 0x2D, 0x7F, 0xF9)), $ring[0]
  $pad = $ring[0] / 2.0
  $g.DrawEllipse($pen, ($cx - $r - $pad), ($cy - $r - $pad), (($r + $pad) * 2), (($r + $pad) * 2))
  $pen.Dispose()
}

# ---- Text column -------------------------------------------
$colX  = 556.0
$colW  = 1200.0 - $colX - 74.0

$fmt = New-Object System.Drawing.StringFormat
$fmt.FormatFlags = [System.Drawing.StringFormatFlags]::NoWrap
$fmt.Trimming    = [System.Drawing.StringTrimming]::None

function Measure-Text([string]$text, [System.Drawing.Font]$font) {
  $g.MeasureString($text, $font, [System.Drawing.SizeF]::new(10000, 10000), $fmt)
}

# Name: shrink until it fits the column
$nameSize = 54.0
do {
  if ($nameFont) { $nameFont.Dispose() }
  $nameFont = New-Object System.Drawing.Font $famName, $nameSize, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
  $nameW = (Measure-Text $NAME $nameFont).Width
  $nameSize -= 1.0
} while ($nameW -gt $colW -and $nameSize -gt 30)

$titleFont = New-Object System.Drawing.Font $famTitle, 31.0, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
$bodyFont  = New-Object System.Drawing.Font $famBody,  23.0, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
$monoFont  = New-Object System.Drawing.Font $famMono,  21.0, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)

# Greedy word wrap for the statement
$lines = @(); $cur = ''
foreach ($word in $STATEMENT.Split(' ')) {
  $try = if ($cur) { "$cur $word" } else { $word }
  if ((Measure-Text $try $bodyFont).Width -le $colW) { $cur = $try }
  else { $lines += $cur; $cur = $word }
}
if ($cur) { $lines += $cur }

# Vertical rhythm, centered on the portrait's axis
$nameH  = (Measure-Text $NAME $nameFont).Height
$titleH = (Measure-Text $TITLE $titleFont).Height
$bodyLH = 33.0
$monoH  = (Measure-Text $DOMAIN $monoFont).Height

$total = $nameH + 20 + 2 + 22 + $titleH + 26 + ($lines.Count * $bodyLH) + 30 + $monoH
$y = $cy - ($total / 2.0)

$brushWhite = New-Object System.Drawing.SolidBrush $WHITE
$brushMuted = New-Object System.Drawing.SolidBrush $MUTED
$brushFaint = New-Object System.Drawing.SolidBrush $SUBTLE
$brushGold  = New-Object System.Drawing.SolidBrush $GOLD

$g.DrawString($NAME, $nameFont, $brushWhite, $colX, $y, $fmt)
$y += $nameH + 20

# Hairline rule, accent blue fading into gold
$ruleW = 268.0
$ruleRect = New-Object System.Drawing.RectangleF $colX, $y, $ruleW, 2.0
$ruleBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $ruleRect, $BLUE, $GOLD, 0.0
$g.FillRectangle($ruleBrush, $ruleRect)
$ruleBrush.Dispose()
$y += 2 + 22

$g.DrawString($TITLE, $titleFont, $brushMuted, $colX, $y, $fmt)
$y += $titleH + 26

foreach ($line in $lines) {
  $g.DrawString($line, $bodyFont, $brushFaint, $colX, $y, $fmt)
  $y += $bodyLH
}
$y += 30

$g.DrawString($DOMAIN, $monoFont, $brushGold, $colX, $y, $fmt)

# ---- Save --------------------------------------------------
$g.Dispose()
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

foreach ($d in @($nameFont,$titleFont,$bodyFont,$monoFont,$brushWhite,$brushMuted,$brushFaint,$brushGold,$fmt)) { $d.Dispose() }

$kb = [Math]::Round((Get-Item $outPath).Length / 1KB, 1)
Write-Host "og-image.png written — ${W}x${H}, $kb KB"
Write-Host "  name rendered at $([int]($nameSize + 1))px, statement on $($lines.Count) line(s)"
if ($script:usedFallback) { Write-Warning 'One or more brand fonts fell back to Segoe UI.' }
