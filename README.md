# CDKTN Hello World

A minimal [CDK Terrain (CDKTN)](https://cdktn.io) getting-started project in TypeScript.  
Defines a Docker-hosted NGINX container as infrastructure and synthesises it to OpenTofu HCL — **no Node.js or npm on the host required**.

All tooling (Node, CDKTN CLI, OpenTofu) runs inside a container via the Apple `container` CLI.

---

## What is CDKTN?

CDK Terrain lets you define infrastructure in familiar programming languages while generating plans for [OpenTofu](https://opentofu.org/) or Terraform. It supports hundreds of providers and existing modules across AWS, Azure, GCP, Kubernetes, Docker, and 3000+ more.

```
TypeScript / Python / Go / C# / Java
             │
             ▼
     CDK Terrain (CDKTN)
             │
             ▼
      OpenTofu / Terraform
             │
      ┌──────┼──────┐
      ▼      ▼      ▼
     AWS   Azure   GCP  … (3000+ providers)
```

---

## Prerequisites

- [Apple container CLI](https://developer.apple.com/documentation/virtualization) (macOS — replaces Docker Desktop)
- `make`

That's it. Node.js and npm are **not** installed on the host.

---

## Project layout

```
.
├── Containerfile          # Node 24 + OpenTofu + cdktn-cli (arm64)
├── Makefile               # make synth | deploy | destroy | shell
└── cdk/
    ├── main.ts            # Hello World stack (Docker + nginx)
    ├── cdktn.json         # CDKTN app config
    ├── package.json       # cdktn + @cdktn/provider-docker deps
    └── tsconfig.json      # TypeScript config
```

---

## Quick start

### 1. Build the container image

```shell
make image
```

### 2. Synthesise the stack

```shell
make synth
```

This runs `cdktn synth` inside the container and writes the generated OpenTofu JSON to `cdk/cdktn.out/`. No cloud credentials required.

Expected output:

```
Synthesising CDKTN stacks...
Generated Terraform code for stack cdktn-hello-world
  → cdk/cdktn.out/cdktn-hello-world/cdk.tf.json
```

### 3. Inspect the generated IaC

```shell
cat cdk/cdktn.out/cdktn-hello-world/cdk.tf.json
```

You'll see a fully-formed OpenTofu JSON template defining the Docker provider, the nginx image resource, and the container resource.

---

## All make targets

```
make help
```

| Target      | Description                                      |
|-------------|--------------------------------------------------|
| `synth`     | Synthesise stacks → `cdk/cdktn.out/` (no cloud) |
| `deploy`    | `cdktn deploy` via OpenTofu (needs cloud creds)  |
| `destroy`   | Tear down deployed stacks                        |
| `bootstrap` | One-time backend state bootstrap                 |
| `shell`     | Open bash inside the container                   |
| `image`     | Build the container image                        |
| `clean`     | Remove the container image                       |

---

## The stack (`cdk/main.ts`)

```typescript
import { Construct } from "constructs";
import { App, TerraformStack } from "cdktn";
import { DockerProvider } from "@cdktn/provider-docker/lib/provider";
import { Image } from "@cdktn/provider-docker/lib/image";
import { Container } from "@cdktn/provider-docker/lib/container";

class HelloWorldStack extends TerraformStack {
  constructor(scope: Construct, name: string) {
    super(scope, name);

    new DockerProvider(this, "docker", {});

    const dockerImage = new Image(this, "nginxImage", {
      name: "nginx:latest",
      keepLocally: false,
    });

    new Container(this, "nginxContainer", {
      name: "cdktn-hello-world",
      image: dockerImage.name,
      ports: [{ internal: 80, external: 8000 }],
    });
  }
}

const app = new App();
new HelloWorldStack(app, "cdktn-hello-world");
app.synth();
```

---

## How node_modules are managed

Dependencies are installed into `/opt/cdk/node_modules` **at image build time**.  
At runtime the Makefile symlinks `cdk/node_modules → /opt/cdk/node_modules` before running `cdktn synth`, so the host volume mount never shadows the pre-built packages.

---

## Next steps

- [Build AWS infrastructure](https://cdktn.io/docs/tutorials/build-aws)
- [Lambda functions with assets](https://cdktn.io/docs/tutorials/lambda-functions)
- [Deploy multi-stack Kubernetes workloads](https://cdktn.io/docs/tutorials/deploy-applications)
- [CDKTN CLI reference](https://cdktn.io/docs/cli)
