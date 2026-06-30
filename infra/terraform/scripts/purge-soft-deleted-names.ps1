# Purge soft-deleted dev resources that block reuse of globally unique names.
# Run after terraform destroy if apply fails with VaultAlreadyExists or similar.
#
# Usage:
#   .\infra\terraform\scripts\purge-soft-deleted-names.ps1 -Environment dev
#   .\infra\terraform\scripts\purge-soft-deleted-names.ps1 -Environment dev -NamePrefix nextjsapp-dev

param(
    [ValidateSet("dev", "prod")]
    [string]$Environment = "dev",

    [string]$NamePrefix = "",

    [string]$Location = ""
)

$ErrorActionPreference = "Stop"

function Get-Tfvar {
    param(
        [string]$TfvarsPath,
        [string]$Key
    )
    if (-not (Test-Path $TfvarsPath)) {
        return $null
    }
    $pattern = "^\s*$([regex]::Escape($Key))\s*=\s*""([^""]+)"""
    $match = Select-String -Path $TfvarsPath -Pattern $pattern | Select-Object -First 1
    if ($match) {
        return $match.Matches[0].Groups[1].Value
    }
    return $null
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$envDir = Join-Path (Split-Path -Parent $scriptDir) "environments\$Environment"
$tfvarsPath = Join-Path $envDir "terraform.tfvars"

if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    throw "Azure CLI (az) not found. Run 'az login' and retry."
}

if ([string]::IsNullOrWhiteSpace($NamePrefix)) {
    $NamePrefix = Get-Tfvar -TfvarsPath $tfvarsPath -Key "name_prefix"
}
if ([string]::IsNullOrWhiteSpace($Location)) {
    $Location = Get-Tfvar -TfvarsPath $tfvarsPath -Key "location"
}
if ([string]::IsNullOrWhiteSpace($NamePrefix)) {
    throw "Could not determine name_prefix. Pass -NamePrefix or set it in $tfvarsPath"
}
if ([string]::IsNullOrWhiteSpace($Location)) {
    $Location = "centralus"
}

$keyVaultName = ($NamePrefix + "-kv").Replace("-", "")
$appConfigName = ($NamePrefix + "-appcfg").Replace("-", "")

Write-Host "Environment:  $Environment"
Write-Host "Location:     $Location"
Write-Host "Name prefix:  $NamePrefix"
Write-Host "Key Vault:    $keyVaultName"
Write-Host "App Config:   $appConfigName"
Write-Host ""

$deletedVault = az keyvault list-deleted --query "[?name=='$keyVaultName'] | [0]" -o json 2>$null
if ($deletedVault -and $deletedVault -ne "null") {
    Write-Host "[purge] Key Vault: $keyVaultName"
    az keyvault purge --name $keyVaultName
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to purge Key Vault '$keyVaultName'"
    }
}
else {
    Write-Host "[skip] No soft-deleted Key Vault named $keyVaultName"
}

$deletedAppConfig = az appconfig list-deleted --query "[?name=='$appConfigName'] | [0]" -o json 2>$null
if ($deletedAppConfig -and $deletedAppConfig -ne "null") {
    Write-Host "[purge] App Configuration: $appConfigName"
    az appconfig purge --name $appConfigName --location $Location --yes
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to purge App Configuration '$appConfigName'"
    }
}
else {
    Write-Host "[skip] No soft-deleted App Configuration named $appConfigName"
}

Write-Host ""
Write-Host "Done. Re-run: terraform apply"
