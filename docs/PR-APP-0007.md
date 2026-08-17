# APP-0007 — Marketing, Pipelines & Domain

## Summary

This PR delivers the marketing site foundation, Azure DNS/custom-domain infrastructure, static asset hosting, and a trunk-based Azure DevOps build pipeline for the Next.js app. CI/CD configuration is sourced from Azure App Configuration and Key Vault (no ADO variable groups), and a dedicated Terraform-managed service principal wires RBAC across dev and prod.

### Marketing & app (`nextjsapp/`)

- Adds marketing layout, header with products dropdown, hero section, and placeholder login/signup/product pages
- Introduces static asset helper (`lib/assets.ts`) backed by Azure Blob Storage via App Configuration
- Adds `upload-static-assets.mjs` script for publishing `public/` assets to blob storage
- Updates home page, Cypress tests, and Vitest coverage for new marketing components
- Adds `sonar-project.properties` and `.dockerignore` for pipeline integration

### Infrastructure (Terraform)

- **Domains stack** (`infra/terraform/domains/`) — Azure DNS zone, CNAMEs, optional domain purchase support
- **CI/CD stack** (`infra/terraform/cicd/`) — Azure AD app registration + service principal for Azure DevOps; dev/prod read `principal_id` via remote state
- **App Configuration** — `cicd:*` keys (ACR, SonarCloud metadata) with Key Vault reference for `sonar-token`
- **Static assets module** — public blob storage for marketing images
- **Container Apps** — custom domain support
- **LaunchDarkly** — separate flags stack and reusable module
- Dev/prod environments reordered (ACR before App Config) and wired to CI/CD principal automatically

### Azure DevOps pipelines (`pipelines/`)

- Single parent pipeline (`nextjs-app.yml`) with trunk-based triggers (GitHub → `main`, `v*` tags, PRs)
- Three-layer template structure: parent → `node-service-build.yml` → tech templates
- OOTB tasks: `AzureAppConfigurationExport@10`, `SonarCloudPrepare/Analyze/Publish@4`, `Docker@2`, `NodeTool@0`, `Cache@2`
- Build flow: export config → restore → Sonar prepare → lint/build → test → Sonar analyze → Docker build → Trivy → conditional ACR push
- Dev ACR on trunk merges; prod ACR on release tags (`v*`)

## Test plan

- [ ] `npm ci && npm run lint && npm run test:coverage` in `nextjsapp/`
- [ ] `terraform validate` in `cicd/`, `domains/`, `environments/dev`, `environments/prod`
- [ ] Apply order verified: bootstrap → cicd → dev → prod
- [ ] Seed `sonar-token` in dev/prod Key Vaults after apply
- [ ] Connect GitHub repo to Azure DevOps and register `pipelines/nextjs-app.yml`
- [ ] Create ADO service connections (`azure-dev/prod`, `acr-dev/prod`, `sonarcloud-sutoremu`)
- [ ] PR to `main` → pipeline runs validation without ACR push
- [ ] Merge to `main` → image published to dev ACR
- [ ] Tag `v*` on `main` → image published to prod ACR
- [ ] `npm run upload-assets` publishes marketing images to blob storage
- [ ] Custom domain resolves after domains stack apply and DNS propagation

## Setup notes (post-merge)

1. Apply Terraform stacks in order: bootstrap → **cicd** → dev → prod → domains (as needed)
2. Retrieve CI/CD credentials: `terraform output -raw client_id` / `client_secret` from cicd stack
3. Install [Azure App Configuration](https://marketplace.visualstudio.com/items?itemName=AzureAppConfiguration.azure-app-configuration-tasks) and [SonarQube Cloud](https://marketplace.visualstudio.com/items?itemName=SonarSource.sonarcloud) extensions in ADO
4. Update `devAppConfigEndpoint` / `prodAppConfigEndpoint` in `pipelines/nextjs-app.yml` if `name_prefix` differs from defaults
5. Configure GitHub branch protection on `main` requiring the `nextjs-app` pipeline check

## Out of scope (follow-up)

- Static asset upload in CI (currently manual / future release step)
- Cypress e2e in build pipeline
