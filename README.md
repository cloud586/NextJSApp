# NextJSApp (Sutoremu)

Next.js marketing/app foundation for **Sutoremu**, with LaunchDarkly feature flags, structured logging + New Relic, Azure App Configuration / Key Vault, Terraform-managed Azure infrastructure, and a trunk-based Azure DevOps build pipeline.

| Area | Status |
|------|--------|
| App (Next.js 16, React 19, Node ≥ 22) | Marketing layout, hero, products/login/signup placeholders |
| Feature flags | LaunchDarkly (server + client), Terraform-managed flag keys |
| Observability | Pino/loglevel + correlation IDs; New Relic APM (prod/Docker) |
| Config & secrets | Azure App Configuration + Key Vault refs at container start |
| Containers | Alma base image (`base-images/alma-ubi`) + app `Dockerfile.runtime`, standalone Next build |
| Infra | Terraform: ACR, Container Apps, KV, App Config, static assets, DNS, CI/CD SP, ADO service connections |
| CI/CD | Azure DevOps → GitHub; alma-base-image + nextjs-app; lint/build/test/Sonar/Docker/Trivy; ACR publish on trunk/tags |
| Tests | Vitest (unit + component + coverage), Cypress e2e (+ optional coverage) |

## Repository layout

```
NextJSApp/
  nextjsapp/          # Next.js application
  base-images/        # Shared container base images (alma-ubi)
  infra/terraform/    # Azure + LaunchDarkly infrastructure
  pipelines/          # Azure DevOps build pipelines
  docs/               # PR / delivery notes
```

Detailed docs:

- [nextjsapp/README.md](nextjsapp/README.md) — create-next-app defaults / local Next.js notes
- [infra/terraform/README.md](infra/terraform/README.md) — bootstrap, environments, domains, LaunchDarkly, RBAC
- [pipelines/README.md](pipelines/README.md) — ADO setup, App Config keys, trunk triggers, Sonar/Docker/Trivy

## Application (`nextjsapp/`)

### Features delivered

- **Marketing site** — header with products dropdown, hero, and placeholder routes (`/login`, `/signup`, `/products/sub-analytics`)
- **LaunchDarkly** — server-side evaluation + client SDK bootstrap; secure mode hash API; anonymous user cookie via middleware
- **Static assets** — local `/public` in dev; Azure Blob base URL (`NEXT_PUBLIC_ASSETS_BASE_URL`) in Azure via App Configuration
- **Config bootstrap** — `scripts/bootstrap-config.mjs` loads `app:*` keys from App Configuration (including Key Vault references) before starting the standalone server
- **Logging** — server (Pino) and client (loglevel) loggers with request correlation; New Relic agent on `npm start` / Docker

### Feature flags (LaunchDarkly)

Flag keys are centralized in [`nextjsapp/lib/ldFlags.ts`](nextjsapp/lib/ldFlags.ts) and must match Terraform in `infra/terraform/launchdarkly/`:

| Flag key | Constant | Purpose |
|----------|----------|---------|
| `homepage.experimentalBanner` | `HOMEPAGE_EXPERIMENTAL_BANNER` | Experimental homepage banner |
| `auth.signupEnabled` | `AUTH_SIGNUP_ENABLED` | Show Sign up on the marketing header |

Locally, set `LD_SDK_KEY` and `LD_CLIENT_SIDE_ID` in `.env.local` (see [`.env.example`](nextjsapp/.env.example)). In Azure, the same values come from App Configuration / Key Vault at startup.

> Early work used `NEXT_PUBLIC_FEATURE_NEW_DASHBOARD` as a demo env flag. Runtime feature control is now LaunchDarkly; prefer the keys above.

### Local development

Requires **Node.js ≥ 22**.

```powershell
cd nextjsapp
copy .env.example .env.local
# Fill LD_SDK_KEY, LD_CLIENT_SIDE_ID (and optional New Relic / assets URL)

npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server |
| `npm run lint` | ESLint |
| `npm run build` | Production build (standalone) |
| `npm start` | Bootstrap App Config (if configured) + start standalone server |
| `npm run test` / `test:unit` / `test:component` | Vitest |
| `npm run test:coverage` | Vitest with coverage (used by CI / Sonar) |
| `npm run cy:open` / `cy:run` | Cypress e2e (app on port 3001) |
| `npm run cy:coverage` | Cypress with Istanbul coverage |
| `npm run upload-assets` | Upload `public/` images to Azure Blob (needs `AZURE_STORAGE_ACCOUNT_NAME`) |

### Docker

```powershell
# From repo root — build base locally, or pull alma-ubi:latest from ACR after the base pipeline has published
docker build -f base-images/alma-ubi/Dockerfile -t alma-ubi:latest base-images/alma-ubi
cd nextjsapp
docker build -f Dockerfile.runtime -t nextjsapp:local .
```

Runtime image expects App Configuration / managed identity env vars in Azure (see Terraform README). Locally you can still run with `.env`-style values if you inject them into the container.

## Infrastructure (`infra/terraform/`)

Terraform manages:

| Stack | Purpose |
|-------|---------|
| `bootstrap/` | Remote state storage (one-time) |
| `cicd/` | Azure AD app + service principal for Azure DevOps |
| `environments/dev` & `prod` | Key Vault, App Configuration, Log Analytics, ACR, Container Apps, static assets |
| `domains/` | Azure DNS (`sutoremu.com`), CNAMEs, custom domain / managed certs |
| `launchdarkly/` | Feature flag definitions (separate state) |

**Apply order:** bootstrap → cicd → dev/prod → domains (as needed) → launchdarkly (independent).

Custom hostnames:

| Hostname | Environment |
|----------|-------------|
| `dev.app.sutoremu.com` | dev |
| `app.sutoremu.com` | prod |

See [infra/terraform/README.md](infra/terraform/README.md) for backends, seeding secrets (`ld-sdk-key`, `nr-license-key`, `sonar-token`), static asset upload, and RBAC.

## CI/CD (`pipelines/`)

Azure DevOps project [sutoremu](https://dev.azure.com/SephieBox/sutoremu) builds from this GitHub repo. CI settings are loaded at runtime from **Azure App Configuration** (`cicd:*` keys, including Key Vault refs) — no ADO variable groups.

**Flow:** Alma base (`alma-base-image`) publishes `alma-ubi:latest` to ACR. App pipeline (`nextjs-app`): export App Config → restore → Sonar prepare → lint/build → Vitest coverage → Sonar analyze/publish → pull base + Docker runtime build → Trivy → conditional ACR push.

| Event | Validate | Publish |
|-------|----------|---------|
| PR → `main` | yes | no |
| Merge to `main` | yes | ACR (`alma-ubi:latest` and/or app tags) |
| Tag `v*` on trunk | yes (app) | prod ACR (app) |

Entrypoints: [`pipelines/alma-base-image.yml`](pipelines/alma-base-image.yml), [`pipelines/nextjs-app.yml`](pipelines/nextjs-app.yml). Full setup (extensions, Terraform-managed service connections/environments): [pipelines/README.md](pipelines/README.md). Apply order for connections: [infra/terraform/README.md](infra/terraform/README.md) (cicd → dev → ado).

### Out of scope (follow-up)

- Container App **deploy** release pipeline (image push only today)
- Automated static asset upload in CI
- Cypress e2e in the build pipeline (local / future nightly)

## Work delivered (ticket history)

| Ticket | Theme |
|--------|--------|
| APP-0001 | Initial feature-flag demo on the homepage |
| APP-0002 | Base + runtime Docker images; Next standalone output |
| APP-0003 | Vitest unit/component tests, Cypress e2e, coverage |
| APP-0004 | LaunchDarkly client + server flags |
| APP-0005 | Structured logging and New Relic |
| APP-0006 | Azure App Configuration, Key Vault, Terraform deploy to Container Apps |
| APP-0007 | Marketing UI, domains/DNS, static assets, trunk-based ADO pipelines + Sonar |

## License

Proprietary — **All Rights Reserved**. See [LICENSE](LICENSE). Public visibility of this repository does not grant permission to use, copy, modify, or distribute the software.

## Quick links

- [PR notes — APP-0007](docs/PR-APP-0007.md)
- [PR notes — LICENSE](docs/PR-LICENSE.md)
- [Sonar project properties](nextjsapp/sonar-project.properties)
- Env template: [nextjsapp/.env.example](nextjsapp/.env.example)
