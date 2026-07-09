param(
  [string]$AccessToken = $env:LAUNCHDARKLY_ACCESS_TOKEN
)

if (-not $AccessToken) {
  Write-Error @"
LAUNCHDARKLY_ACCESS_TOKEN is not set.

PowerShell:
  `$env:LAUNCHDARKLY_ACCESS_TOKEN = "your-api-token"
  .\scripts\list-launchdarkly-projects.ps1
"@
  exit 1
}

$response = Invoke-RestMethod `
  -Uri "https://app.launchdarkly.com/api/v2/projects?limit=50" `
  -Headers @{ Authorization = $AccessToken } `
  -Method Get

if (-not $response.items -or $response.items.Count -eq 0) {
  Write-Host "No LaunchDarkly projects found in this account."
  exit 0
}

Write-Host ""
Write-Host "LaunchDarkly projects (use the key column in terraform.tfvars ld_project_key):"
Write-Host ""

foreach ($project in $response.items) {
  Write-Host ("  key: {0,-20} name: {1}" -f $project.key, $project.name)

  if ($project.environments -and $project.environments.items) {
    foreach ($env in $project.environments.items) {
      Write-Host ("    env key: {0,-16} name: {1}" -f $env.key, $env.name)
    }
  }
}

Write-Host ""
Write-Host "Example terraform.tfvars:"
Write-Host '  ld_project_key      = "default"'
Write-Host '  ld_environment_keys = ["test"]'
Write-Host ""
