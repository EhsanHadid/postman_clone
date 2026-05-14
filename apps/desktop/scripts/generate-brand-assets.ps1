$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$desktopRoot = Resolve-Path (Join-Path $scriptDir "..")
$repoRoot = Resolve-Path (Join-Path $desktopRoot "..\..")
$svgPath = Resolve-Path (Join-Path $repoRoot "logo\logo.svg")
$electron = Resolve-Path (Join-Path $repoRoot "node_modules\.bin\electron.cmd")
$webBrandDir = Join-Path $repoRoot "apps\web\public\assets\brand"
$webIconDir = Join-Path $repoRoot "apps\web\public\assets\icons"
$desktopAssetDir = Join-Path $repoRoot "apps\desktop\assets"
$masterPath = Join-Path $env:TEMP "postman-clone-logo-master.png"
$rendererPath = Join-Path $env:TEMP "postman-clone-render-logo.cjs"

New-Item -ItemType Directory -Force -Path $webBrandDir, $webIconDir, $desktopAssetDir | Out-Null

Remove-Item -LiteralPath (Join-Path $webBrandDir "logo.png") -Force -ErrorAction SilentlyContinue
Remove-Item -Path (Join-Path $webIconDir "*.png") -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path $desktopAssetDir "logo.png") -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path $desktopAssetDir "icon.png") -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path $desktopAssetDir "icon.ico") -Force -ErrorAction SilentlyContinue

Copy-Item -LiteralPath $svgPath -Destination (Join-Path $webBrandDir "logo.svg") -Force
Copy-Item -LiteralPath $svgPath -Destination (Join-Path $desktopAssetDir "logo.svg") -Force

$rendererSource = @'
const { app, BrowserWindow } = require("electron");
const fs = require("node:fs/promises");

const svgPath = process.argv[2];
const outputPath = process.argv[3];
const size = 1024;

app.whenReady().then(async () => {
  const svg = await fs.readFile(svgPath);
  const svgBase64 = svg.toString("base64");
  const win = new BrowserWindow({
    width: size,
    height: size,
    useContentSize: true,
    show: false,
    transparent: true,
    frame: false,
    resizable: false,
    backgroundColor: "#00000000",
    webPreferences: {
      offscreen: true,
      backgroundThrottling: false,
    },
  });

  const html = `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          html,
          body {
            width: ${size}px;
            height: ${size}px;
            margin: 0;
            overflow: hidden;
            background: transparent;
          }

          body {
            display: grid;
            place-items: center;
          }

          img {
            width: 86%;
            height: 86%;
            object-fit: contain;
          }
        </style>
      </head>
      <body>
        <img src="data:image/svg+xml;base64,${svgBase64}" />
      </body>
    </html>`;

  await win.loadURL(`data:text/html;base64,${Buffer.from(html).toString("base64")}`);
  const image = await win.capturePage();
  await fs.writeFile(outputPath, image.toPNG());
  win.destroy();
  app.quit();
}).catch((error) => {
  console.error(error);
  app.exit(1);
});
'@

[System.IO.File]::WriteAllText($rendererPath, $rendererSource)
& $electron $rendererPath $svgPath $masterPath
if ($LASTEXITCODE -ne 0) {
  throw "Electron failed to render the SVG logo."
}

function Save-ResizedPng([System.Drawing.Image]$Source, [int]$Size, [string]$Path) {
  $bitmap = New-Object System.Drawing.Bitmap $Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.DrawImage($Source, 0, 0, $Size, $Size)
  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
}

$source = [System.Drawing.Image]::FromFile($masterPath)
$sizes = @(16, 24, 32, 48, 64, 128, 192, 256, 512, 1024)

Save-ResizedPng $source 1024 (Join-Path $webBrandDir "logo.png")
Save-ResizedPng $source 1024 (Join-Path $desktopAssetDir "logo.png")

foreach ($size in $sizes) {
  Save-ResizedPng $source $size (Join-Path $webIconDir "icon-$size.png")
}

Save-ResizedPng $source 256 (Join-Path $desktopAssetDir "icon.png")

$icoSizes = @(16, 24, 32, 48, 64, 128, 256)
$tempFiles = @()
foreach ($size in $icoSizes) {
  $temp = Join-Path $env:TEMP "postman-clone-logo-$size.png"
  Save-ResizedPng $source $size $temp
  $tempFiles += $temp
}

$source.Dispose()

$icoPath = Join-Path $desktopAssetDir "icon.ico"
$stream = [System.IO.File]::Open($icoPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
$writer = New-Object System.IO.BinaryWriter($stream)
$writer.Write([UInt16]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]$icoSizes.Count)
$offset = 6 + (16 * $icoSizes.Count)
$pngBytes = @()

for ($index = 0; $index -lt $icoSizes.Count; $index++) {
  $bytes = [System.IO.File]::ReadAllBytes($tempFiles[$index])
  $pngBytes += ,$bytes
  $size = $icoSizes[$index]
  if ($size -eq 256) { $dimensionByte = 0 } else { $dimensionByte = $size }

  $writer.Write([byte]$dimensionByte)
  $writer.Write([byte]$dimensionByte)
  $writer.Write([byte]0)
  $writer.Write([byte]0)
  $writer.Write([UInt16]1)
  $writer.Write([UInt16]32)
  $writer.Write([UInt32]$bytes.Length)
  $writer.Write([UInt32]$offset)
  $offset += $bytes.Length
}

foreach ($bytes in $pngBytes) {
  $writer.Write($bytes)
}

$writer.Dispose()
$stream.Dispose()

foreach ($temp in $tempFiles) {
  Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
}

Remove-Item -LiteralPath $rendererPath -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $masterPath -Force -ErrorAction SilentlyContinue
