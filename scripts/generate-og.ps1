# ============================================================
#  generate-og.ps1
#  Builds public/assets/og-image.png — the 1200x630 card that shows
#  when alexball.dev is shared on iMessage, Slack, Discord, LinkedIn, X.
#
#  Run from the repo root:  powershell -File scripts\generate-og.ps1
#
#  The card is a still life of the site hero (src/components/Hero.jsx +
#  src/styles/layout.css .hero block): status pill, two-line display name,
#  role trailing into a rule, statement, domain, meta row — and the headshot
#  in its glass frame with corner accents, caption bar, and floating chips.
#  The CTA buttons are dropped; nothing on a share card is clickable.
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
# the background layers per pixel gives exactly smooth falloff instead.
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;

public static class Layers {
  // Shared BGRA blend: dst = src*a + dst*(1-a)
  private static void Blend(byte[] buf, int i, int cr, int cg, int cb, float a) {
    buf[i]     = (byte)(cb * a + buf[i]     * (1 - a));
    buf[i + 1] = (byte)(cg * a + buf[i + 1] * (1 - a));
    buf[i + 2] = (byte)(cr * a + buf[i + 2] * (1 - a));
    buf[i + 3] = 255;
  }

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
        Blend(buf, row + x * 4, cr, cg, cb, maxAlpha * f);
      }
    }

    System.Runtime.InteropServices.Marshal.Copy(buf, 0, d.Scan0, buf.Length);
    bmp.UnlockBits(d);
  }

  // .bg-grid — 1px lines on a `spacing` lattice, masked by
  // radial-gradient(maskRx maskRy at maskCx maskCy, #000 0%, transparent 72%).
  // The mask is applied inside the loop so no second bitmap is needed.
  public static void Grid(Bitmap bmp, float spacing, int cr, int cg, int cb, float maxAlpha,
                          float maskCx, float maskCy, float maskRx, float maskRy) {
    Rectangle rect = new Rectangle(0, 0, bmp.Width, bmp.Height);
    BitmapData d = bmp.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
    byte[] buf = new byte[Math.Abs(d.Stride) * bmp.Height];
    System.Runtime.InteropServices.Marshal.Copy(d.Scan0, buf, 0, buf.Length);

    for (int y = 0; y < bmp.Height; y++) {
      int row = y * d.Stride;
      bool hLine = (y % (int)spacing) == 0;
      float ndy = (y - maskCy) / maskRy;
      for (int x = 0; x < bmp.Width; x++) {
        if (!hLine && (x % (int)spacing) != 0) continue;
        float ndx = (x - maskCx) / maskRx;
        float t = (float)Math.Sqrt(ndx * ndx + ndy * ndy) / 0.72f;   // opaque core -> transparent at 72%
        if (t >= 1f) continue;
        float s = 1f - t;
        Blend(buf, row + x * 4, cr, cg, cb, maxAlpha * s * s * (3f - 2f * s));
      }
    }

    System.Runtime.InteropServices.Marshal.Copy(buf, 0, d.Scan0, buf.Length);
    bmp.UnlockBits(d);
  }

  // .headshot-grad — a vertical scrim over the photo, clear down to `start`
  // then ramping to maxAlpha at the bottom. A LinearGradientBrush would do
  // this, but GDI+ gamma-corrects alpha compositing and the ramp washes out;
  // per-pixel keeps it at the density the hero actually has.
  // `radius` keeps the ramp inside the photo's rounded corners so it can't
  // bleed onto the frame gutter.
  public static void ScrimY(Bitmap bmp, int x0, int y0, int w, int h, float start, float radius,
                            int cr, int cg, int cb, float maxAlpha) {
    x0 = Math.Max(0, x0); y0 = Math.Max(0, y0);
    int x1 = Math.Min(bmp.Width, x0 + w), y1 = Math.Min(bmp.Height, y0 + h);
    if (x1 <= x0 || y1 <= y0) return;

    Rectangle rect = new Rectangle(x0, y0, x1 - x0, y1 - y0);
    BitmapData d = bmp.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
    byte[] buf = new byte[Math.Abs(d.Stride) * rect.Height];
    System.Runtime.InteropServices.Marshal.Copy(d.Scan0, buf, 0, buf.Length);

    for (int y = 0; y < rect.Height; y++) {
      float t = y / (float)(h - 1);
      if (t <= start) continue;
      float f = (t - start) / (1f - start);
      float a = maxAlpha * f * f * (3f - 2f * f);
      int row = y * d.Stride;
      // horizontal inset of the rounded corner at this scanline
      float inset = 0f;
      float dyc = (y < radius) ? (radius - y) : ((y > h - 1 - radius) ? (y - (h - 1 - radius)) : 0f);
      if (dyc > 0f) inset = radius - (float)Math.Sqrt(Math.Max(0f, radius * radius - dyc * dyc));
      for (int x = 0; x < rect.Width; x++) {
        if (x < inset || x > rect.Width - 1 - inset) continue;
        Blend(buf, row + x * 4, cr, cg, cb, a);
      }
    }

    System.Runtime.InteropServices.Marshal.Copy(buf, 0, d.Scan0, buf.Length);
    bmp.UnlockBits(d);
  }

  // .bg-vignette — the inverse of Radial: clear inside `innerStop`, darkening
  // to maxAlpha at the ellipse edge and beyond.
  public static void Vignette(Bitmap bmp, float cx, float cy, float rx, float ry,
                              int cr, int cg, int cb, float maxAlpha, float innerStop) {
    Rectangle rect = new Rectangle(0, 0, bmp.Width, bmp.Height);
    BitmapData d = bmp.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
    byte[] buf = new byte[Math.Abs(d.Stride) * bmp.Height];
    System.Runtime.InteropServices.Marshal.Copy(d.Scan0, buf, 0, buf.Length);

    for (int y = 0; y < bmp.Height; y++) {
      int row = y * d.Stride;
      float ndy = (y - cy) / ry;
      for (int x = 0; x < bmp.Width; x++) {
        float ndx = (x - cx) / rx;
        float t = (float)Math.Sqrt(ndx * ndx + ndy * ndy);
        if (t <= innerStop) continue;
        float f = (t - innerStop) / (1f - innerStop);
        if (f > 1f) f = 1f;
        Blend(buf, row + x * 4, cr, cg, cb, maxAlpha * f * f * (3f - 2f * f));
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
$BG       = RGB 0x0B 0x0F 0x14
$BG2      = RGB 0x0E 0x14 0x1C
$BLUE     = RGB 0x2D 0x7F 0xF9
$BLUE_300 = RGB 0x6B 0xA5 0xFB   # --accent-300 resolves to this on the dark theme
$GOLD     = RGB 0xD4 0xAF 0x37
$WHITE    = RGB 0xFF 0xFF 0xFF
$TEXT     = RGB 0xD1 0xD5 0xDB
$MUTED    = RGB 0x94 0xA3 0xB8
$GREEN    = RGB 0x34 0xD0 0x7A   # .status-dot
# --faint (#5B6676) is too dim to survive the thumbnail downscale most link
# unfurlers apply, so the meta keys sit between --faint and --muted.
$SUBTLE   = RGB 0x7C 0x8A 0x9C

# ---- Copy (src/data/siteData.js + src/data/siteStrings.js) --
$AVAILABILITY = 'OPEN TO SOFTWARE ENGINEERING ROLES'
$NAME_L1      = 'Alexander'
$NAME_L2      = 'D. Ball'
$TITLE        = 'Software Engineer'
$STATEMENT    = 'Software engineer focused on full-stack development, backend systems, and DevOps.'
$DOMAIN       = 'alexball.dev'
$CAP_NAME     = 'Alexander D. Ball'
$SIG          = '</AB\>'
$CHIP1        = 'Full-Stack Developer'
$CHIP2        = 'Building & Learning'
$META = @(
  @{ k = 'FOCUS';      v = 'Full-Stack Development' },
  @{ k = 'CORE STACK'; v = 'JS · C# · SQL' },
  @{ k = 'BASED IN';   v = 'Arizona, USA' }
)

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

# ---- Helpers -----------------------------------------------

# GenericTypographic drops the invisible side bearing the default StringFormat
# adds — without it, per-character advances compound into visible drift.
$tf = [System.Drawing.StringFormat]::GenericTypographic.Clone()
$tf.FormatFlags = $tf.FormatFlags -bor [System.Drawing.StringFormatFlags]::MeasureTrailingSpaces

function Measure-Glyphs([string]$text, [System.Drawing.Font]$font) {
  $g.MeasureString($text, $font, [System.Drawing.PointF]::new(0,0), $tf).Width
}

# GDI+ has no letter-spacing, so tracked text is drawn a character at a time.
function Measure-Tracked([string]$text, [System.Drawing.Font]$font, [double]$tracking = 0) {
  $w = 0.0
  foreach ($ch in $text.ToCharArray()) { $w += (Measure-Glyphs ([string]$ch) $font) + $tracking }
  if ($text.Length -gt 0) { $w -= $tracking }   # no trailing gap
  $w
}

function Draw-Tracked([string]$text, [System.Drawing.Font]$font, [System.Drawing.Brush]$brush,
                      [double]$x, [double]$y, [double]$tracking = 0) {
  if ($tracking -eq 0) { $g.DrawString($text, $font, $brush, [single]$x, [single]$y, $tf); return }
  foreach ($ch in $text.ToCharArray()) {
    $s = [string]$ch
    $g.DrawString($s, $font, $brush, [single]$x, [single]$y, $tf)
    $x += (Measure-Glyphs $s $font) + $tracking
  }
}

function New-RoundedPath([double]$x, [double]$y, [double]$w, [double]$h, [double]$r) {
  $r = [Math]::Min($r, [Math]::Min($w, $h) / 2.0)
  $d = $r * 2.0
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  if ($r -le 0) { $p.AddRectangle((New-Object System.Drawing.RectangleF $x, $y, $w, $h)); return $p }
  $p.AddArc([single]$x,            [single]$y,            [single]$d, [single]$d, 180, 90)
  $p.AddArc([single]($x + $w - $d),[single]$y,            [single]$d, [single]$d, 270, 90)
  $p.AddArc([single]($x + $w - $d),[single]($y + $h - $d),[single]$d, [single]$d,   0, 90)
  $p.AddArc([single]$x,            [single]($y + $h - $d),[single]$d, [single]$d,  90, 90)
  $p.CloseFigure()
  $p
}

# Cheap stand-in for `box-shadow: 0 18px 40px -22px` — expanding rounded rects
# at decaying alpha. GDI+ has no blur, but at this scale it reads the same.
function Draw-SoftShadow([double]$x, [double]$y, [double]$w, [double]$h, [double]$r,
                         [double]$dy, [int]$spread = 7, [int]$alpha = 46) {
  for ($i = $spread; $i -ge 1; $i--) {
    $a = [int]($alpha * (1.0 - ($i - 1) / [double]$spread) / $spread)
    if ($a -lt 1) { continue }
    $p = New-RoundedPath ($x - $i) ($y - $i + $dy) ($w + $i * 2) ($h + $i * 2) ($r + $i)
    $b = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb($a, 0, 0, 0))
    $g.FillPath($b, $p); $b.Dispose(); $p.Dispose()
  }
}

# ---- Background layers (paint order mirrors Background.jsx) -
$bgRect  = New-Object System.Drawing.Rectangle 0, 0, $W, $H
$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $bgRect, $BG, $BG2, 35.0
$g.FillRectangle($bgBrush, $bgRect)
$bgBrush.Dispose()
$g.Flush()

# .bg-grid: 58px lattice at the site's viewport, scaled to the card
[Layers]::Grid($bmp, 52.0, 255, 255, 255, 0.055, ($W * 0.5), 0.0, ($W * 1.20), ($H * 0.90))
# .bg-glow-blue (top: -15vw; left: 42%) and .bg-glow-gold (bottom/right: -6vw)
[Layers]::Radial($bmp, ($W * 0.42), -100.0, 560.0, 0x2D, 0x7F, 0xF9, 0.30)
[Layers]::Radial($bmp, ($W * 1.03), ($H * 1.11), 520.0, 0xD4, 0xAF, 0x37, 0.16)
# .bg-vignette
[Layers]::Vignette($bmp, ($W * 0.5), ($H * 0.30), ($W * 0.60), ($H * 0.40), 0x07, 0x0A, 0x0E, 0.55, 0.40)

# ============================================================
#  Right column — the headshot card (.headshot-wrap / .headshot-frame)
#  Drawn first so the floating chips can overlap into the text gutter.
# ============================================================
$fx = 706.0; $fy = 82.0; $fw = 420.0; $fh = 470.0    # 1 / 1.12, like .headshot-wrap
$fr = 26.0                                            # --radius-lg
$pad = 12.0
$ir = $fr - 11.0                                      # calc(var(--radius-lg) - 11px)

# Accent bloom under the frame (the box-shadow spill on .headshot-frame)
[Layers]::Radial($bmp, ($fx + $fw / 2), ($fy + $fh * 0.62), 330.0, 0x2D, 0x7F, 0xF9, 0.15)

# Frame: 160deg blue -> gold -> white wash, hairline border.
# backdrop-filter: blur(14px) has no GDI+ equivalent; over an already-soft
# background the semi-opaque gradient reads the same at this size.
$framePath = New-RoundedPath $fx $fy $fw $fh $fr
$frameRect = New-Object System.Drawing.RectangleF ([single]$fx), ([single]$fy), ([single]$fw), ([single]$fh)
$frameBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $frameRect, $WHITE, $WHITE, 160.0
$blend = New-Object System.Drawing.Drawing2D.ColorBlend 3
$blend.Colors    = @((RGB 0x2D 0x7F 0xF9 62), (RGB 0xD4 0xAF 0x37 30), (RGB 0xFF 0xFF 0xFF 12))
$blend.Positions = @(0.0, 0.6, 1.0)
$frameBrush.InterpolationColors = $blend
$g.FillPath($frameBrush, $framePath)
$frameBrush.Dispose()

$framePen = New-Object System.Drawing.Pen (RGB 0xFF 0xFF 0xFF 18), 1.0
$g.DrawPath($framePen, $framePath)
$framePen.Dispose()

# Photo: object-fit: cover from the square source. The 420x470 box is taller
# than wide, so the crop is horizontal and full height is kept — which is why
# this shows the whole head with headroom, matching the hero.
$px = $fx + $pad; $py = $fy + $pad
$pw = $fw - $pad * 2; $ph = $fh - $pad * 2

$photo = [System.Drawing.Image]::FromFile($headshot)
$srcW = [double]$photo.Width; $srcH = [double]$photo.Height
$cropW = $srcH * ($pw / $ph)
if ($cropW -gt $srcW) { $cropW = $srcW }
$cropH = $cropW * ($ph / $pw)
$srcRect = New-Object System.Drawing.RectangleF `
  ([single](($srcW - $cropW) / 2.0)), ([single](($srcH - $cropH) * 0.18)), ([single]$cropW), ([single]$cropH)

$photoPath = New-RoundedPath $px $py $pw $ph $ir
$g.SetClip($photoPath)
$dstRect = New-Object System.Drawing.RectangleF ([single]$px), ([single]$py), ([single]$pw), ([single]$ph)
$g.DrawImage($photo, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

$g.ResetClip()
$photo.Dispose(); $photoPath.Dispose()

# .headshot-grad — transparent to 52%, then down to rgba(8,11,16,0.86)
$g.Flush()
[Layers]::ScrimY($bmp, [int]$px, [int]$py, [int]$pw, [int]$ph, 0.52, [single]$ir, 0x08, 0x0B, 0x10, 0.86)

# .corner — L-shaped brackets, 12px inset. tl/br accent, tr/bl gold.
$armLen = 21.0; $cIn = 12.0
$cx0 = $fx + $cIn; $cy0 = $fy + $cIn; $cx1 = $fx + $fw - $cIn; $cy1 = $fy + $fh - $cIn
foreach ($c in @(
  @{ x = $cx0; y = $cy0; dx =  1; dy =  1; col = $BLUE },
  @{ x = $cx1; y = $cy0; dx = -1; dy =  1; col = $GOLD },
  @{ x = $cx0; y = $cy1; dx =  1; dy = -1; col = $GOLD },
  @{ x = $cx1; y = $cy1; dx = -1; dy = -1; col = $BLUE }
)) {
  $pen = New-Object System.Drawing.Pen $c.col, 1.5
  $g.DrawLine($pen, [single]$c.x, [single]$c.y, [single]($c.x + $armLen * $c.dx), [single]$c.y)
  $g.DrawLine($pen, [single]$c.x, [single]$c.y, [single]$c.x, [single]($c.y + $armLen * $c.dy))
  $pen.Dispose()
}

# ---- Fonts in use ------------------------------------------
function NewFont([System.Drawing.FontFamily]$fam, [double]$px) {
  New-Object System.Drawing.Font $fam, ([single]$px), ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
}

$fCapName = NewFont $famName  22.0
$fCapRole = NewFont $famMono  13.0
$fSig     = NewFont $famMono  13.0
$fChip    = NewFont $famMono  14.0

$brWhite  = New-Object System.Drawing.SolidBrush $WHITE
$brText   = New-Object System.Drawing.SolidBrush $TEXT
$brSubtle = New-Object System.Drawing.SolidBrush $SUBTLE
$brGold   = New-Object System.Drawing.SolidBrush $GOLD
$brBlue3  = New-Object System.Drawing.SolidBrush $BLUE_300
$brGoldSig = New-Object System.Drawing.SolidBrush (RGB 0xD4 0xAF 0x37 217)   # opacity: 0.85

# .headshot-cap — name over role, bottom-left; signature bottom-right
$capL = $fx + 26.0
$capB = $fy + $fh - 24.0
$capRoleH = $fCapRole.GetHeight($g)
$capNameH = $fCapName.GetHeight($g)
$capRoleY = $capB - $capRoleH
$capNameY = $capRoleY - $capNameH + 2

Draw-Tracked $CAP_NAME $fCapName $brWhite $capL $capNameY -0.4
Draw-Tracked $TITLE    $fCapRole $brBlue3 $capL $capRoleY  1.0

$sigW = Measure-Tracked $SIG $fSig 0
Draw-Tracked $SIG $fSig $brGoldSig ($fx + $fw - 26.0 - $sigW) ($capB - $fSig.GetHeight($g)) 0

# .float-chip — two of them, overlapping the frame edges
function Draw-Chip {
  param([string]$Text, [double]$Cx, [double]$Cy, [System.Drawing.Color]$DotColor, [string]$Anchor)

  $dot = 7.0; $gapDot = 8.0; $padX = 13.0; $padY = 9.0
  $tw = Measure-Tracked $Text $fChip 0
  $th = $fChip.GetHeight($g)
  $w  = $padX * 2 + $dot + $gapDot + $tw
  $h  = $padY * 2 + $th
  $x  = if ($Anchor -eq 'right') { $Cx - $w } else { $Cx }
  $y  = $Cy

  Draw-SoftShadow $x $y $w $h 10.0 6.0 7 60

  $p = New-RoundedPath $x $y $w $h 10.0
  $fill = New-Object System.Drawing.SolidBrush (RGB 0x0D 0x12 0x19 232)
  $g.FillPath($fill, $p); $fill.Dispose()
  $pen = New-Object System.Drawing.Pen (RGB 0xFF 0xFF 0xFF 20), 1.0
  $g.DrawPath($pen, $p); $pen.Dispose(); $p.Dispose()

  # dot + its box-shadow glow
  $dcx = $x + $padX + $dot / 2.0
  $dcy = $y + $h / 2.0
  $g.Flush()
  [Layers]::Radial($bmp, [single]$dcx, [single]$dcy, 11.0, $DotColor.R, $DotColor.G, $DotColor.B, 0.5)
  $db = New-Object System.Drawing.SolidBrush $DotColor
  $g.FillEllipse($db, [single]($dcx - $dot / 2), [single]($dcy - $dot / 2), [single]$dot, [single]$dot)
  $db.Dispose()

  Draw-Tracked $Text $fChip $brText ($x + $padX + $dot + $gapDot) ($y + $padY) 0
}

# .float-chip.tl { top: -14px; left: -22px }  /  .br { bottom: 56px; right: -26px }
Draw-Chip -Text $CHIP1 -Cx ($fx - 22.0) -Cy ($fy - 16.0) -DotColor $BLUE -Anchor 'left'
Draw-Chip -Text $CHIP2 -Cx ($fx + $fw + 26.0) -Cy ($fy + $fh - 56.0 - 36.0) -DotColor $GOLD -Anchor 'right'

# ============================================================
#  Left column — the .hero-left stack, minus the CTA buttons
# ============================================================
$colX = 72.0
$colW = 560.0

$fBadge = NewFont $famMono  15.0
$fRole  = NewFont $famMono  19.0
$fBody  = NewFont $famBody  24.0
$fDomain = NewFont $famMono 21.0
$fMetaK = NewFont $famMono  14.0
$fMetaV = NewFont $famTitle 20.0

# Display name: shrink-to-fit guard against a font substitution widening it
$nameSize = 78.0
$nameTrack = 0.0
do {
  if ($fName) { $fName.Dispose() }
  $fName = NewFont $famName $nameSize
  $nameTrack = -0.035 * $nameSize                       # letter-spacing: -0.035em
  $nameW = [Math]::Max((Measure-Tracked $NAME_L1 $fName $nameTrack), (Measure-Tracked $NAME_L2 $fName $nameTrack))
  if ($nameW -le $colW) { break }
  $nameSize -= 2.0
} while ($nameSize -gt 44)

# Statement: greedy word wrap inside the column
$stLH = 36.0
$lines = @(); $cur = ''
foreach ($word in $STATEMENT.Split(' ')) {
  $try = if ($cur) { "$cur $word" } else { $word }
  if ((Measure-Tracked $try $fBody 0) -le ($colW - 40)) { $cur = $try }
  else { $lines += $cur; $cur = $word }
}
if ($cur) { $lines += $cur }

# ---- Vertical rhythm (mirrors the hero's margins) ----------
$badgeH   = $fBadge.GetHeight($g) + 18.0
$nameLH   = $nameSize * 0.98                              # line-height: 0.98
$roleH    = $fRole.GetHeight($g)
$domainH  = $fDomain.GetHeight($g)
$metaKH   = $fMetaK.GetHeight($g)
$metaVH   = $fMetaV.GetHeight($g)

$blockH = $badgeH + 26 + ($nameLH * 2) + 22 + $roleH + 28 + ($lines.Count * $stLH) +
          34 + $domainH + 36 + 1 + 26 + $metaKH + 6 + $metaVH
$y = ($H - $blockH) / 2.0

# .status-badge
$badgeText = Measure-Tracked $AVAILABILITY $fBadge 1.5
$badgeDot  = 8.0
$badgeW    = 15.0 + $badgeDot + 9.0 + $badgeText + 17.0
$badgePath = New-RoundedPath $colX $y $badgeW $badgeH ($badgeH / 2.0)
$badgeFill = New-Object System.Drawing.SolidBrush (RGB 0xFF 0xFF 0xFF 6)
$g.FillPath($badgeFill, $badgePath); $badgeFill.Dispose()
$badgePen = New-Object System.Drawing.Pen (RGB 0xFF 0xFF 0xFF 18), 1.0
$g.DrawPath($badgePen, $badgePath); $badgePen.Dispose(); $badgePath.Dispose()

$bdx = $colX + 15.0 + $badgeDot / 2.0
$bdy = $y + $badgeH / 2.0
$g.Flush()
[Layers]::Radial($bmp, [single]$bdx, [single]$bdy, 13.0, 0x34, 0xD0, 0x7A, 0.45)
$dotBrush = New-Object System.Drawing.SolidBrush $GREEN
$g.FillEllipse($dotBrush, [single]($bdx - $badgeDot / 2), [single]($bdy - $badgeDot / 2), [single]$badgeDot, [single]$badgeDot)
$dotBrush.Dispose()
Draw-Tracked $AVAILABILITY $fBadge $brText ($colX + 15.0 + $badgeDot + 9.0) ($y + ($badgeH - $fBadge.GetHeight($g)) / 2.0) 1.5
$y += $badgeH + 26

# .display — two lines
Draw-Tracked $NAME_L1 $fName $brWhite $colX $y $nameTrack
$y += $nameLH
Draw-Tracked $NAME_L2 $fName $brWhite $colX $y $nameTrack
$y += $nameLH + 22

# .hero .role — mono label trailing into a hairline rule
Draw-Tracked $TITLE $fRole $brBlue3 $colX $y 1.15
$roleW = Measure-Tracked $TITLE $fRole 1.15
$rulePen = New-Object System.Drawing.Pen (RGB 0xFF 0xFF 0xFF 18), 1.0
$ruleY = $y + $roleH / 2.0
$g.DrawLine($rulePen, [single]($colX + $roleW + 16), [single]$ruleY, [single]($colX + $roleW + 16 + 120), [single]$ruleY)
$rulePen.Dispose()
$y += $roleH + 28

# .hero .statement
foreach ($line in $lines) {
  Draw-Tracked $line $fBody $brText $colX $y 0
  $y += $stLH
}
$y += 34

# alexball.dev — fills the slot the CTA buttons occupy in the hero
Draw-Tracked $DOMAIN $fDomain $brGold $colX $y 0.5
$y += $domainH + 36

# .hero-meta — border-top, then the three key/value columns
$dividerPen = New-Object System.Drawing.Pen (RGB 0xFF 0xFF 0xFF 12), 1.0
$g.DrawLine($dividerPen, [single]$colX, [single]$y, [single]($colX + $colW), [single]$y)
$dividerPen.Dispose()
$y += 26

# Column x-positions are measured, not fixed, so longer values can't collide.
$mx = $colX
foreach ($m in $META) {
  Draw-Tracked $m.k $fMetaK $brSubtle $mx $y 2.0
  Draw-Tracked $m.v $fMetaV $brWhite  $mx ($y + $metaKH + 6) 0
  $wk = Measure-Tracked $m.k $fMetaK 2.0
  $wv = Measure-Tracked $m.v $fMetaV 0
  $mx += [Math]::Max($wk, $wv) + 30.0
}

# ---- Save --------------------------------------------------
$g.Dispose()
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

foreach ($d in @($fName,$fBadge,$fRole,$fBody,$fDomain,$fMetaK,$fMetaV,$fCapName,$fCapRole,$fSig,$fChip,
                 $brWhite,$brText,$brSubtle,$brGold,$brBlue3,$brGoldSig,$framePath,$tf)) {
  if ($d) { $d.Dispose() }
}

$kb = [Math]::Round((Get-Item $outPath).Length / 1KB, 1)
Write-Host "og-image.png written — ${W}x${H}, $kb KB"
Write-Host "  name rendered at $([int]$nameSize)px, statement on $($lines.Count) line(s), meta row ends at $([int]$mx)px"
if ($script:usedFallback) { Write-Warning 'One or more brand fonts fell back to Segoe UI.' }
