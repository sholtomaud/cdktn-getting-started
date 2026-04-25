# AGENTS.md — cdktn-getting-started

## Project overview

A CDK Terrain (CDKTN) getting-started project that deploys a static website
to AWS CloudFront + S3. All tooling runs inside a container — **never install
Node, npm, cdktn-cli, or OpenTofu on the host**.

## Structure

```
.
├── app/        Web application (Vite + vanilla TypeScript)
├── infra/      CDKTN infrastructure (TypeScript → OpenTofu HCL → AWS)
├── Containerfile
└── Makefile    Single interface for all operations
```

See `app/AGENTS.md` and `infra/AGENTS.md` for directory-specific rules.

## Critical conventions

### The container is the unit of work
All commands run via `make`. Never run `npm`, `node`, `cdktn`, or `tofu`
directly on the host. The Makefile handles volume mounts and symlinks.

```bash
make app-dev       # start Vite dev server
make synth         # CDKTN synth (no AWS)
make ci            # full local pipeline (no AWS)
make help          # list all targets
```

### CDKTN ≠ CDKTF
This project uses **CDK Terrain (CDKTN)** — `cdktn-cli`, `import { X } from 'cdktn'`.
CDKTF (CDK for Terraform) is deprecated. Never reference CDKTF in code,
docs, or comments. The CLI still reads `cdktf.json` (internal implementation
detail), but all user-facing naming uses CDKTN.

### CONTAINER_BIN override for CI
Local: `CONTAINER_BIN=container` (Apple container CLI, default)
CI: `make synth CONTAINER_BIN=docker`

### Environment targeting
Three environments: `dev`, `uat`, `prod`. Controlled by `DEPLOY_ENV` env var.
Never hardcode environment names or account IDs in source files.

## Key files

| File | Purpose |
|------|---------|
| `Makefile` | All operational targets — always check here first |
| `Containerfile` | Single image for app + infra + tooling |
| `app/DESIGN.md` | Normative design tokens for the web app |
| `infra/cdktf.json` | CDKTN project config (CLI reads this file by name) |

## DevSecOps

- `make scan` — Trivy IaC scan (`infra/cdktf.out/`) + container image
- `make audit` — `npm audit --audit-level=high` for app + infra
- `make lint` — ESLint security scan on app TypeScript
- Socket supply-chain scan runs in CI pipeline only

## What not to do

- Do not add a `package.json` at the project root (no npm workspaces)
- Do not run `npm install` on the host
- Do not commit `node_modules/`, `cdktf.out/`, or `app/dist/`
- Do not use `cdktf` package — use `cdktn`
- Do not reference AWS account IDs or credentials in source files
