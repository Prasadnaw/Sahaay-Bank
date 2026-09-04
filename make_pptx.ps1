Add-Type -AssemblyName System.IO.Compression.FileSystem

$outputPptx = "C:\Users\dhair\.gemini\antigravity\scratch\sahaay-bank\Sahaay_Bank_BL4ZE_Rivals.pptx"
$frontendPptx = "C:\Users\dhair\.gemini\antigravity\scratch\sahaay-bank\frontend\Sahaay_Bank_BL4ZE_Rivals.pptx"
$tempDir = Join-Path $env:TEMP ("pptx_build_" + [Guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

Write-Host "Created temp directory: $tempDir"
