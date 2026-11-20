# Builds dist/wikipindai-<version>.zip (Chrome/Edge) or dist/wikipindai-<version>-firefox.zip with forward-slash
# entry names and manifest.json at the root. Usage: pack-zip.ps1 [-Target chrome|firefox]
# (GNU tar in Git Bash silently writes a tarball named .zip, which the Web Store rejects.)
param([ValidateSet('chrome', 'firefox')][string]$Target = 'chrome')

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$chromeManifest = Join-Path $root 'manifest.json'
$manifest = if ($Target -eq 'firefox') { Join-Path $root 'firefox\manifest.json' } else { $chromeManifest }
$suffix = if ($Target -eq 'firefox') { '-firefox' } else { '' }

$version = (Get-Content $manifest -Raw | ConvertFrom-Json).version
$chromeVersion = (Get-Content $chromeManifest -Raw | ConvertFrom-Json).version
if ($version -ne $chromeVersion) { throw "Version mismatch: $manifest is $version but manifest.json is $chromeVersion. Keep them equal." }

New-Item -ItemType Directory -Force -Path (Join-Path $root 'dist') | Out-Null
$out = Join-Path $root "dist\wikipindai-$version$suffix.zip"
$bs = [string][char]92

$files = @('background.js','sidepanel.html','sidepanel.css','sidepanel.js','languages.js','translations.js','LICENSE')
$dirs  = @('_locales','icons','flags','tools')

$list = New-Object System.Collections.Generic.List[object]
$list.Add(@{ Path = $manifest; Entry = 'manifest.json' })
foreach ($f in $files) { $list.Add(@{ Path = (Join-Path $root $f); Entry = $f }) }
foreach ($d in $dirs) {
  Get-ChildItem -Path (Join-Path $root $d) -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring($root.Length + 1).Replace($bs, '/')
    $list.Add(@{ Path = $_.FullName; Entry = $rel })
  }
}

$fs = [System.IO.File]::Open($out, [System.IO.FileMode]::Create)
$zip = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Create)
foreach ($item in $list) {
  $null = [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $item.Path, $item.Entry, [System.IO.Compression.CompressionLevel]::Optimal)
}
$zip.Dispose(); $fs.Dispose()

$z = [System.IO.Compression.ZipFile]::OpenRead($out)
$sig = [System.Text.Encoding]::ASCII.GetString([System.IO.File]::ReadAllBytes($out)[0..1])
"zip: $out ($Target)"
"signature: $sig | entries: $($z.Entries.Count) | manifest at root: $(@($z.Entries | Where-Object { $_.FullName -eq 'manifest.json' }).Count -eq 1) | backslash names: $(@($z.Entries | Where-Object { $_.FullName.Contains($bs) }).Count)"
$z.Dispose()
