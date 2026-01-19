param(
  [ValidateSet("all","chrome","firefox")]
  [string]$Target = "all"
)

# -------------------- config --------------------

$ProjectName = "mytime-to-calendar"
$Dist = "dist"

# Exclude build/docs/repo metadata + the platform manifests (we inject manifest.json)
$Excludes = @(
  "*.md",
  "manifest.chrome.json",
  "manifest.firefox.json",
  ".git",
  ".gitignore",
  "dist",
  "build.ps1"
)

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Copy-RepoToOutDir([string]$OutDir) {
  New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

  Get-ChildItem -Force -Path . | Where-Object {
    $itemName = $_.Name
    foreach ($ex in $Excludes) {
      if ($itemName -like $ex) { return $false }
    }
    return $true
  } | ForEach-Object {
    Copy-Item $_.FullName -Destination $OutDir -Recurse -Force
  }
}

function Assert-ManifestNoBackslashes([string]$ManifestPath) {
  $text = Get-Content $ManifestPath -Raw
  if ($text -match "\\\\") {
    throw "manifest.json contains backslashes. Use forward slashes (/) in all file paths."
  }
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

        # Make a relative path, then FORCE forward slashes for the zip entry name
        $rel = $full.Substring($root.Length).TrimStart('\','/')
        $entryName = $rel -replace "\\", "/"

        # Add entry
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

  # Clean platform output dir
  if (Test-Path $OutDir) { Remove-Item $OutDir -Recurse -Force }

  # Copy repo -> dist/<platform>
  Copy-RepoToOutDir -OutDir $OutDir

  # Inject manifest.json
  $manifestSource = if ($Platform -eq "chrome") { "manifest.chrome.json" } else { "manifest.firefox.json" }
  $manifestDest = Join-Path $OutDir "manifest.json"
  Copy-Item $manifestSource $manifestDest -Force

  # Guard: ensure manifest references use forward slashes
  Assert-ManifestNoBackslashes -ManifestPath $manifestDest

  # Zip (AMO-safe)
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
