# Reconcile Terraform state after a partial/failed apply.
# Imports Container Apps resources that exist in Azure but are missing from state.
#
# Usage (from repo root or this script's directory):
#   .\infra\terraform\scripts\reconcile-partial-apply.ps1 -Environment dev
#   .\infra\terraform\scripts\reconcile-partial-apply.ps1 -Environment dev -NamePrefix nextjsapp-dev

param(
    [ValidateSet("dev", "prod")]
    [string]$Environment = "dev",

    [string]$NamePrefix = "",

    [switch]$PlanOnly
)

$ErrorActionPreference = "Stop"

function Get-NamePrefixFromTfvars {
    param([string]$TfvarsPath)
    if (-not (Test-Path $TfvarsPath)) {
        return $null
    }
    $match = Select-String -Path $TfvarsPath -Pattern '^\s*name_prefix\s*=\s*"([^"]+)"' |
        Select-Object -First 1
    if ($match) {
        return $match.Matches[0].Groups[1].Value
    }
    return $null
}

function Test-InTerraformState {
    param(
        [string]$Address,
        [string[]]$StateList
    )
    return $StateList -contains $Address
}

function Test-AzureResourceExists {
    param(
        [string]$Kind,
        [string]$Name,
        [string]$ResourceGroup
    )
    switch ($Kind) {
        "cae" {
            $result = az containerapp env show --name $Name --resource-group $ResourceGroup 2>$null
            return $LASTEXITCODE -eq 0 -and $null -ne $result
        }
        "app" {
            $result = az containerapp show --name $Name --resource-group $ResourceGroup 2>$null
            return $LASTEXITCODE -eq 0 -and $null -ne $result
        }
        default {
            throw "Unknown resource kind: $Kind"
        }
    }
}

function Import-IfMissing {
    param(
        [string]$Address,
        [string]$ResourceId,
        [string[]]$StateList,
        [string]$Label
    )

    if (Test-InTerraformState -Address $Address -StateList $StateList) {
        Write-Host "[skip] $Label already in Terraform state"
        return
    }

    Write-Host "[import] $Label"
    Write-Host "         $Address"
    Write-Host "         $ResourceId"
    terraform import $Address $ResourceId
    if ($LASTEXITCODE -ne 0) {
        throw "terraform import failed for $Label"
    }
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$envDir = Join-Path (Split-Path -Parent $scriptDir) "environments\$Environment"
$tfvarsPath = Join-Path $envDir "terraform.tfvars"

if (-not (Get-Command terraform -ErrorAction SilentlyContinue)) {
    throw "terraform not found on PATH. Install Terraform and retry."
}
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    throw "Azure CLI (az) not found on PATH. Run 'az login' and retry."
}

if ([string]::IsNullOrWhiteSpace($NamePrefix)) {
    $NamePrefix = Get-NamePrefixFromTfvars -TfvarsPath $tfvarsPath
}
if ([string]::IsNullOrWhiteSpace($NamePrefix)) {
    throw "Could not determine name_prefix. Pass -NamePrefix or set it in $tfvarsPath"
}

$resourceGroup = "$NamePrefix-rg"
$caeName = "$NamePrefix-cae"
$appName = "$NamePrefix-app"
$subscriptionId = az account show --query id -o tsv
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($subscriptionId)) {
    throw "Could not read Azure subscription. Run 'az login' first."
}

Write-Host "Environment:   $Environment"
Write-Host "Name prefix:   $NamePrefix"
Write-Host "Resource group: $resourceGroup"
Write-Host "Subscription:  $subscriptionId"
Write-Host ""

Push-Location $envDir
try {
    if (-not (Test-Path "backend.hcl")) {
        throw "Missing backend.hcl in $envDir. Copy backend.hcl.example and run terraform init -backend-config=backend.hcl"
    }

    $stateList = @(terraform state list 2>$null)
    if ($LASTEXITCODE -ne 0) {
        throw "terraform state list failed. Run: terraform init -backend-config=backend.hcl"
    }

    $caeAddress = "module.container_apps.azurerm_container_app_environment.this"
    $appAddress = "module.container_apps.azurerm_container_app.this"

    $caeId = "/subscriptions/$subscriptionId/resourceGroups/$resourceGroup/providers/Microsoft.App/managedEnvironments/$caeName"
    $appId = "/subscriptions/$subscriptionId/resourceGroups/$resourceGroup/providers/Microsoft.App/containerApps/$appName"

    if (Test-AzureResourceExists -Kind "cae" -Name $caeName -ResourceGroup $resourceGroup) {
        Import-IfMissing -Address $caeAddress -ResourceId $caeId -StateList $stateList -Label "Container Apps environment ($caeName)"
        $stateList = @(terraform state list)
    }
    else {
        Write-Host "[skip] Container Apps environment not found in Azure ($caeName)"
    }

    if (Test-AzureResourceExists -Kind "app" -Name $appName -ResourceGroup $resourceGroup) {
        Import-IfMissing -Address $appAddress -ResourceId $appId -StateList $stateList -Label "Container App ($appName)"
    }
    else {
        Write-Host "[skip] Container App not found in Azure ($appName) — terraform apply will create it"
    }

    Write-Host ""
    Write-Host "Running terraform plan..."
    if ($PlanOnly) {
        terraform plan
    }
    else {
        terraform plan -out=tfplan
        Write-Host ""
        Write-Host "Review the plan above. If it looks correct, run:"
        Write-Host "  terraform apply tfplan"
    }
}
finally {
    Pop-Location
}
