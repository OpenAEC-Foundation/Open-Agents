#Requires -Version 5.1
<#
.SYNOPSIS
    Open-Agents (oa-cli) Windows Installer
.DESCRIPTION
    Installs Open-Agents on Windows by setting up WSL2 and required dependencies.
.PARAMETER SkipWinget
    Skip winget package installation (use if packages are already installed).
.PARAMETER RepoPath
    Path to the Open-Agents repository (defaults to current directory).
#>
param(
    [switch]$SkipWinget,
    [string]$RepoPath = $PSScriptRoot
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step  { param($msg) Write-Host "  --> $msg" -ForegroundColor Cyan }
function Write-OK    { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warn  { param($msg) Write-Host "  [!]  $msg" -ForegroundColor Yellow }
function Write-Fail  { param($msg) Write-Host "  [X]  $msg" -ForegroundColor Red }
function Write-Header{ param($msg) Write-Host "`n=== $msg ===" -ForegroundColor Magenta }

Write-Header "Open-Agents Installer for Windows"
Write-Host "  Repo: $RepoPath" -ForegroundColor Gray

# ── 1. Check WSL2 ────────────────────────────────────────────────────────────
Write-Header "Checking WSL2"

$wslExe = Get-Command wsl.exe -ErrorAction SilentlyContinue
if (-not $wslExe) {
    Write-Fail "wsl.exe not found."
    Write-Warn "Run in an elevated PowerShell window:"
    Write-Host "    wsl --install" -ForegroundColor White
    Write-Host "  Then reboot and re-run this script." -ForegroundColor Gray
    exit 1
}

$wslStatus = wsl.exe --status 2>&1
if ($LASTEXITCODE -ne 0 -or ($wslStatus -match "not installed|no distribution")) {
    Write-Fail "WSL2 is not properly configured."
    Write-Warn "Run: wsl --install   (requires reboot)"
    exit 1
}
Write-OK "WSL2 is available."

# ── 2. Install winget packages ────────────────────────────────────────────────
if (-not $SkipWinget) {
    Write-Header "Installing Prerequisites via winget"

    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if (-not $winget) {
        Write-Warn "winget not found — skipping package installation."
        Write-Warn "Install manually: Python >=3.10, Node.js >=18, WSL2."
    } else {
        $packages = @(
            @{ Id = "Python.Python.3.12"; Name = "Python 3.12" },
            @{ Id = "OpenJS.NodeJS.LTS"; Name = "Node.js LTS" }
        )
        foreach ($pkg in $packages) {
            Write-Step "Installing $($pkg.Name) ..."
            winget install --id $pkg.Id --silent --accept-package-agreements --accept-source-agreements 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq -1978335189) {
                Write-OK "$($pkg.Name) ready."
            } else {
                Write-Warn "$($pkg.Name) install returned code $LASTEXITCODE — may already be installed."
            }
        }
    }
}

# ── 3. Check WSL prerequisites ───────────────────────────────────────────────
Write-Header "Checking WSL Prerequisites"

function Invoke-Wsl {
    param([string]$cmd)
    $out = wsl.exe bash -c $cmd 2>&1
    return @{ Output = $out; ExitCode = $LASTEXITCODE }
}

# Python >= 3.10
$py = Invoke-Wsl "python3 --version 2>/dev/null || echo MISSING"
if ($py.Output -match "Python (\d+)\.(\d+)") {
    $major = [int]$Matches[1]; $minor = [int]$Matches[2]
    if ($major -ge 3 -and $minor -ge 10) {
        Write-OK "Python $($Matches[0]) found."
    } else {
        Write-Fail "Python >= 3.10 required, found $($Matches[0])."
        Write-Warn "In WSL: sudo apt update && sudo apt install python3.12 python3.12-venv -y"
        exit 1
    }
} else {
    Write-Fail "Python not found in WSL."
    Write-Warn "In WSL: sudo apt update && sudo apt install python3 python3-pip -y"
    exit 1
}

# pip
$pip = Invoke-Wsl "pip3 --version 2>/dev/null || echo MISSING"
if ($pip.Output -match "MISSING") {
    Write-Warn "pip not found — installing..."
    wsl.exe bash -c "sudo apt install python3-pip -y" | Out-Null
} else { Write-OK "pip found." }

# Node.js >= 18
$node = Invoke-Wsl "node --version 2>/dev/null || echo MISSING"
if ($node.Output -match "v(\d+)") {
    if ([int]$Matches[1] -ge 18) { Write-OK "Node.js $($node.Output.Trim()) found." }
    else {
        Write-Warn "Node.js >= 18 required. Installing via nvm..."
        wsl.exe bash -c 'curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs' | Out-Null
    }
} else {
    Write-Warn "Node.js not found — installing..."
    wsl.exe bash -c 'curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs' | Out-Null
}

# tmux
$tmux = Invoke-Wsl "which tmux 2>/dev/null || echo MISSING"
if ($tmux.Output -match "MISSING") {
    Write-Step "Installing tmux..."
    wsl.exe bash -c "sudo apt install tmux -y" | Out-Null
    Write-OK "tmux installed."
} else { Write-OK "tmux found." }

# claude CLI (optional)
$claude = Invoke-Wsl "which claude 2>/dev/null || echo MISSING"
if ($claude.Output -match "MISSING") {
    Write-Warn "claude CLI not found in WSL."
    Write-Warn "Install it manually: https://docs.anthropic.com/claude-code"
} else { Write-OK "claude CLI found." }

# ── 4. Install oa-cli ─────────────────────────────────────────────────────────
Write-Header "Installing oa-cli"

# Convert Windows path to WSL path
$wslRepo = wsl.exe wslpath $RepoPath.Replace("\", "\\") 2>&1
if ($LASTEXITCODE -ne 0 -or $wslRepo -match "Error") {
    Write-Fail "Could not convert repo path to WSL path: $RepoPath"
    exit 1
}
$wslRepo = $wslRepo.Trim()
Write-Step "WSL repo path: $wslRepo"

$install = Invoke-Wsl "cd '$wslRepo' && pip3 install -e ./oa-cli 2>&1 | tail -5"
if ($install.ExitCode -eq 0) {
    Write-OK "oa-cli installed successfully."
} else {
    Write-Fail "Installation failed:`n$($install.Output)"
    exit 1
}

# ── 5. Verify ─────────────────────────────────────────────────────────────────
$verify = Invoke-Wsl "oa --version 2>/dev/null || echo FAILED"
if ($verify.Output -match "FAILED") {
    Write-Warn "oa command not found after install. Check your WSL PATH."
} else { Write-OK "oa is working: $($verify.Output.Trim())" }

# ── 6. Done ───────────────────────────────────────────────────────────────────
Write-Header "Installation Complete"
Write-Host ""
Write-Host "  To use Open-Agents, open a WSL terminal and run:" -ForegroundColor White
Write-Host "    wsl" -ForegroundColor Cyan
Write-Host "    cd $(Split-Path $RepoPath -Leaf)" -ForegroundColor Cyan
Write-Host "    oa start" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Docs: https://github.com/anthropics/open-agents" -ForegroundColor Gray
Write-Host ""
