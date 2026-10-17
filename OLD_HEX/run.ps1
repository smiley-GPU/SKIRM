# Build and run SKIRM with nothing but a JDK (17+).
#   .\run.ps1                 start the server on http://localhost:8080
#   .\run.ps1 -Port 9000 -Seed 42
#   .\run.ps1 -Test           run the headless smoke test instead
param([int]$Port = 8080, [long]$Seed = 0, [switch]$Test)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$bin = if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME 'bin' } else { $null }
$javac = if ($bin) { Join-Path $bin 'javac.exe' } else { 'javac' }
$java = if ($bin) { Join-Path $bin 'java.exe' } else { 'java' }

if (Test-Path out) { Remove-Item -Recurse -Force out }
$sources = Get-ChildItem -Recurse -Filter *.java src | ForEach-Object { $_.FullName }
& $javac --release 17 -d out $sources
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if ($Test) {
    & $java -cp out skirm.SmokeTest
    exit $LASTEXITCODE
}
$runArgs = @('--port', $Port)
if ($Seed -ne 0) { $runArgs += @('--seed', $Seed) }
& $java -cp out skirm.Main @runArgs
