param(
  [int]$Port = 3001
)

$ErrorActionPreference = 'Stop'

$project = "c:\Users\simon\DND\dnd-ai-dm"
Set-Location $project

$url = "http://localhost:$Port"

# Open browser immediately; it will load once dev server is ready.
Start-Process $url

# Run dev server in the foreground so logs remain visible.
$env:NEXT_DISABLE_TURBOPACK = "1"
npm run dev -- -p $Port
