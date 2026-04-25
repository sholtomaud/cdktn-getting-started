# --------------------------------------------------
# Configuration
# --------------------------------------------------
IMAGE         := cdktn-hello-world
CONTAINER_BIN := container
WORKDIR       := /app
INFRA_DIR     := $(WORKDIR)/infra
APP_DIR       := $(WORKDIR)/app
APP_DEV_PORT  := 5173
APP_PRV_PORT  := 4173

AWS_REGION  ?= ap-southeast-2
AWS_ACCOUNT ?= $(shell aws sts get-caller-identity --query Account --output text 2>/dev/null)
AWS_MOUNT        := -v "$(HOME)/.aws:/root/.aws"

# Base run — no AWS credentials
RUN := $(CONTAINER_BIN) run -i --rm \
	-v "$(PWD):$(WORKDIR)" \
	$(IMAGE)

# Run with AWS credentials
RUN_AWS := $(CONTAINER_BIN) run -i --rm \
	-v "$(PWD):$(WORKDIR)" \
	$(AWS_MOUNT) \
	$(IMAGE)

# Symlink pre-installed node_modules into mounted dirs
LINK_INFRA := ln -sfn /opt/infra/node_modules $(INFRA_DIR)/node_modules
LINK_APP   := ln -sfn /opt/app/node_modules  $(APP_DIR)/node_modules

.PHONY: \
	all help image \
	synth infra-test \
	app-dev app-preview app-build app-test app-e2e app-e2e-deployed \
	lint lint-design audit scan \
	install-playwright \
	ci pipeline \
	deploy destroy bootstrap \
	shell clean

# --------------------------------------------------
# Default
# --------------------------------------------------
all: ci ## Run the full local CI pipeline (no AWS required)

# --------------------------------------------------
# Help
# --------------------------------------------------
help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  %-22s %s\n", $$1, $$2}'

# --------------------------------------------------
# Image
# --------------------------------------------------
image: ## Build the container image
	@echo "Building $(IMAGE)..."
	$(CONTAINER_BIN) build -t $(IMAGE) .

# --------------------------------------------------
# Infra — CDKTN synth + unit tests (no AWS)
# --------------------------------------------------
synth: image ## CDKTN synth → infra/cdktf.out/ (no cloud calls)
	@echo "Synthesising CDKTN stacks..."
	$(RUN) sh -c '$(LINK_INFRA) && cd $(INFRA_DIR) && cdktn synth'

infra-test: image ## CDKTN unit tests via node:test (no AWS)
	@echo "Running infra unit tests..."
	$(RUN) sh -c '$(LINK_INFRA) && cd $(INFRA_DIR) && npm test'

# --------------------------------------------------
# App — build + unit tests + E2E (no AWS)
# --------------------------------------------------
app-dev: image ## Start Vite dev server → http://localhost:5173 (hot-reload)
	@echo "Starting Vite dev server at http://localhost:$(APP_DEV_PORT) ..."
	$(CONTAINER_BIN) run -it --rm \
		-v "$(PWD):$(WORKDIR)" \
		-p $(APP_DEV_PORT):$(APP_DEV_PORT) \
		$(IMAGE) \
		sh -c '$(LINK_APP) && cd $(APP_DIR) && npm run dev'

app-preview: app-build ## Build then serve app/dist/ → http://localhost:4173
	@echo "Starting Vite preview at http://localhost:$(APP_PRV_PORT) ..."
	$(CONTAINER_BIN) run -it --rm \
		-v "$(PWD):$(WORKDIR)" \
		-p $(APP_PRV_PORT):$(APP_PRV_PORT) \
		$(IMAGE) \
		sh -c '$(LINK_APP) && cd $(APP_DIR) && npm run preview'

app-build: image ## Vite build → app/dist/
	@echo "Building app..."
	$(RUN) sh -c '$(LINK_APP) && cd $(APP_DIR) && npm run build'

app-test: image ## node:test unit tests for app
	@echo "Running app unit tests..."
	$(RUN) sh -c '$(LINK_APP) && cd $(APP_DIR) && npm test'

app-e2e: image ## Playwright E2E → vite preview (localhost, no AWS)
	@echo "Running E2E tests against vite preview..."
	$(RUN) sh -c '$(LINK_APP) && cd $(APP_DIR) && npm run test:e2e'

app-e2e-deployed: image ## Playwright E2E → deployed CloudFront URL (needs BASE_URL)
	@[ -n "$(BASE_URL)" ] || (echo "ERROR: set BASE_URL=https://xxx.cloudfront.net" >&2; exit 1)
	$(RUN) sh -c '$(LINK_APP) && cd $(APP_DIR) && BASE_URL=$(BASE_URL) npm run test:e2e'

# --------------------------------------------------
# DevSecOps — lint, audit, scan (no AWS)
# --------------------------------------------------
lint: lint-app lint-design ## Run all lints

lint-app: image ## ESLint security scan on app TypeScript
	@echo "Linting app source..."
	$(RUN) sh -c '$(LINK_APP) && cd $(APP_DIR) && npm run lint'

lint-design: image ## Validate DESIGN.md structure
	@echo "Linting DESIGN.md..."
	$(RUN) sh -c '$(LINK_APP) && cd $(APP_DIR) && npm run lint:design'

audit: image ## npm audit for app + infra dependencies
	@echo "Auditing dependencies..."
	$(RUN) sh -c '\
		$(LINK_APP) && cd $(APP_DIR) && npm audit --audit-level=high; \
		$(LINK_INFRA) && cd $(INFRA_DIR) && npm audit --audit-level=critical'

scan: synth image ## Trivy IaC scan (cdktf.out/) + container image scan
	@echo "Scanning IaC output with Trivy..."
	$(RUN) sh -c 'trivy config $(INFRA_DIR)/cdktf.out/ --exit-code 0'
	@echo "Scanning container image with Trivy..."
	@DOCKER_SOCK="/var/run/docker.sock"; \
	if [ ! -S "$$DOCKER_SOCK" ]; then DOCKER_SOCK="$$HOME/.docker/run/docker.sock"; fi; \
	if [ -S "$$DOCKER_SOCK" ]; then \
		$(CONTAINER_BIN) run -i --rm -v "$$DOCKER_SOCK":/var/run/docker.sock $(IMAGE) \
		trivy image $(IMAGE) --exit-code 0; \
	else \
		echo "⚠️  No Docker socket found at /var/run/docker.sock or ~/.docker/run/docker.sock. Skipping image scan."; \
	fi

# --------------------------------------------------
# Full local CI — zero AWS credentials required
# --------------------------------------------------
ci: synth infra-test app-build app-test app-e2e lint audit scan ## Full local pipeline (no AWS)
	@echo ""
	@echo "✅  CI passed — all checks green (no AWS required)"

# --------------------------------------------------
# Deployed pipeline — requires AWS credentials
# --------------------------------------------------
deploy: image ## cdktn deploy via OpenTofu (needs AWS creds)
	$(RUN_AWS) sh -c '$(LINK_INFRA) && cd $(INFRA_DIR) && cdktn deploy'

destroy: image ## Tear down deployed stacks
	$(RUN_AWS) sh -c '$(LINK_INFRA) && cd $(INFRA_DIR) && cdktn destroy'

bootstrap: image ## One-time CDKTN backend bootstrap
	$(RUN_AWS) sh -c '$(LINK_INFRA) && cd $(INFRA_DIR) && cdktn bootstrap'

pipeline: ci deploy ## Full pipeline: ci + deploy (needs AWS creds)
	@[ -n "$(BASE_URL)" ] && $(MAKE) app-e2e-deployed || true
	@echo ""
	@echo "🚀  Pipeline complete"

# --------------------------------------------------
# Utilities
# --------------------------------------------------
shell: image ## Open bash inside the container (with AWS creds)
	$(CONTAINER_BIN) run -it --rm \
		-v "$(PWD):$(WORKDIR)" \
		$(AWS_MOUNT) \
		--entrypoint bash \
		$(IMAGE)

clean: ## Remove the container image
	$(CONTAINER_BIN) rmi -f $(IMAGE) 2>/dev/null || true
