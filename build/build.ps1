param(
  [ValidateSet("all","chrome","firefox")]
  [string]$Target = "all"
)

# -------------------- working directory guard --------------------

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot  = Resolve-Path (Join-Path $ScriptDir "..")
$Cwd       = Resolve-Path "."

if ($Cwd.Path -eq (Resolve-Path $ScriptDir).Path) {
  Write-Host @"
ERROR: build.ps1 must be run from the repository root, not from inside /build.

Correct usage:
  cd <repo-root>
  .\build\build.ps1

Current directory:
  $($Cwd.Path)
"@ -ForegroundColor Red

  exit 1
}

# -------------------- config --------------------

$ProjectName = "mytime-to-calendar"
$Dist = "dist"
$BuildDir = "build"

$ManifestBase = Join-Path $BuildDir "manifest.base.json"
$ManifestOverrides = @{
  chrome  = Join-Path $BuildDir "manifest.chrome.override.json"
  firefox = Join-Path $BuildDir "manifest.firefox.override.json"
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

# -------------------- helpers --------------------

function Copy-ExtensionSources([string]$OutDir) {
  New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

  $SrcRoot = "src"
  $RuntimeDirs = @(
    "content",
    "shared",
    "background",
    "popup",
    "icons"
  )

  if (-not (Test-Path $SrcRoot)) {
    Write-Host "ERROR: 'src/' directory not found. Run build.ps1 from the repo root." -ForegroundColor Red
    exit 1
  }

  foreach ($dir in $RuntimeDirs) {
    $sourcePath = Join-Path $SrcRoot $dir

    if (-not (Test-Path $sourcePath)) {
      Write-Host "ERROR: Required directory '$sourcePath' not found." -ForegroundColor Red
      exit 1
    }

    Copy-Item $sourcePath $OutDir -Recurse -Force
  }
}

function Assert-ManifestNoBackslashes([string]$ManifestPath) {
  $text = Get-Content $ManifestPath -Raw
  if ($text -match "\\\\") {
    throw "manifest.json contains backslashes. Use forward slashes (/) in all file paths."
  }
}

function Merge-Manifests([string]$BasePath, [string]$OverridePath, [string]$OutPath) {
  $base = Get-Content $BasePath -Raw | ConvertFrom-Json
  $override = Get-Content $OverridePath -Raw | ConvertFrom-Json

  foreach ($prop in $override.PSObject.Properties) {
    $base | Add-Member -NotePropertyName $prop.Name -NotePropertyValue $prop.Value -Force
  }

  $base | ConvertTo-Json -Depth 20 -Compress | Set-Content $OutPath -Encoding UTF8
}

function New-ZipFromDirectoryWithForwardSlashes([string]$SourceDir, [string]$ZipPath) {
  if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }

  $zipFs = [System.IO.File]::Open($ZipPath, [System.IO.FileMode]::CreateNew)
  try {
    $zip = New-Object System.IO.Compression.ZipArchive($zipFs, [System.IO.Compression.ZipArchiveMode]::Create, $false)
    try {
      $root = (Resolve-Path $SourceDir).Path
      $files = Get-ChildItem -Path $root -Recurse -File -Force

      foreach ($f in $files) {
        $full = $f.FullName
        $rel = $full.Substring($root.Length).TrimStart('\','/')
        $entryName = $rel -replace "\\", "/"

        $entry = $zip.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)
        $entryStream = $entry.Open()
        try {
          $inStream = [System.IO.File]::OpenRead($full)
          try {
            $inStream.CopyTo($entryStream)
          } finally {
            $inStream.Dispose()
          }
        } finally {
          $entryStream.Dispose()
        }
      }
    } finally {
      $zip.Dispose()
    }
  } finally {
    $zipFs.Dispose()
  }
}

function Invoke-BuildTarget([string]$Platform) {
  Write-Host "Building $Platform..."

  if (-not (Test-Path $Dist)) {
    New-Item -ItemType Directory -Force -Path $Dist | Out-Null
  }

  $OutDir = Join-Path $Dist $Platform

  if (Test-Path $OutDir) { Remove-Item $OutDir -Recurse -Force }

  Copy-ExtensionSources -OutDir $OutDir
  Copy-Item "src\*" $OutDir -Recurse -Force

  # Generate manifest.json
  $manifestDest = Join-Path $OutDir "manifest.json"
  Merge-Manifests `
    -BasePath $ManifestBase `
    -OverridePath $ManifestOverrides[$Platform] `
    -OutPath $manifestDest

  Assert-ManifestNoBackslashes -ManifestPath $manifestDest

  $zipPath = Join-Path $Dist "$ProjectName-$Platform.zip"
  New-ZipFromDirectoryWithForwardSlashes -SourceDir $OutDir -ZipPath $zipPath

  Write-Host "Built: $zipPath"
}

# -------------------- run --------------------

switch ($Target) {
  "chrome"  { Invoke-BuildTarget "chrome" }
  "firefox" { Invoke-BuildTarget "firefox" }
  "all" {
    Invoke-BuildTarget "chrome"
    Invoke-BuildTarget "firefox"
  }
}
