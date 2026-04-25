FROM node:24-slim

ENV DEBIAN_FRONTEND=noninteractive

# ── System packages + native build tools (node-gyp) ───────────────────────
RUN apt-get update && apt-get install -y \
    wget curl unzip bash ca-certificates git make \
    python3 python3-dev g++ build-essential \
    && rm -rf /var/lib/apt/lists/*

# ── OpenTofu (arm64 — Apple Silicon) ───────────────────────────────────────
ARG TOFU_VERSION=1.9.0

RUN wget -q \
    "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_linux_arm64.zip" \
    -O /tmp/tofu.zip \
    && unzip -q /tmp/tofu.zip tofu -d /usr/local/bin \
    && chmod +x /usr/local/bin/tofu \
    && rm /tmp/tofu.zip

# ── Trivy (IaC + container + dependency CVE scanner) ──────────────────────
# Use official install script — resolves latest stable, handles arm64 automatically
RUN curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh \
    | sh -s -- -b /usr/local/bin

# ── Tell CDKTN to use OpenTofu instead of Terraform ────────────────────────
ENV TERRAFORM_BINARY_NAME=tofu

# ── CDKTN CLI (runs in container — never on host) ──────────────────────────
RUN npm install -g cdktn-cli@0.22.1 --no-update-notifier

# ── Infra deps — pre-installed at /opt/infra ──────────────────────────────
WORKDIR /opt/infra
COPY infra/package.json infra/package-lock.json* ./
RUN npm install --no-update-notifier

# ── App deps — pre-installed at /opt/app ──────────────────────────────────
WORKDIR /opt/app
COPY app/package.json app/package-lock.json* ./
RUN npm install --no-update-notifier

# ── Playwright Browsers (baked into image — no host mounts needed) ────────
# Install dependencies first, then chromium
RUN npx playwright install-deps chromium \
    && npx playwright install chromium

WORKDIR /app

CMD ["bash"]
