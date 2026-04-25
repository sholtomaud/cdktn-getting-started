# AGENTS.md — infra/

## Purpose

CDK Terrain (CDKTN) infrastructure stack. TypeScript → OpenTofu HCL → AWS.
Synthesises to `infra/cdktf.out/`. No visual design concerns here.

## Key facts

- Package: `cdktn` (not `cdktf` — CDKTF is deprecated)
- CLI: `cdktn-cli` (`cdktn synth`, `cdktn deploy`, `cdktn destroy`)
- Backend: OpenTofu (controlled by `TERRAFORM_BINARY_NAME=tofu` env var)
- Config file: `cdktf.json` (the CLI reads this filename — do not rename it)
- Provider: `@cdktn/provider-aws`

## File structure

```
infra/
├── main.ts            Stack definition — export StaticWebsiteStack
├── tests/
│   └── stack.test.ts  CDKTN unit tests (node:test, no AWS)
├── cdktf.json         CDKTN project config
├── package.json
└── tsconfig.json
```

## Stack authoring rules

### Always export the stack class

```ts
// ✅ correct — testable
export class StaticWebsiteStack extends TerraformStack { ... }

// ✅ correct — entry point guard
if (require.main === module) {
  const app = new App();
  new StaticWebsiteStack(app, "cdktn-static-website");
  app.synth();
}
```

The `require.main === module` guard prevents the synth from running when
`main.ts` is imported by tests.

### Imports come from `cdktn` and `@cdktn/provider-*`

```ts
import { App, TerraformStack, TerraformOutput, Fn } from "cdktn";
import { AwsProvider } from "@cdktn/provider-aws/lib/provider";
import { S3Bucket } from "@cdktn/provider-aws/lib/s3-bucket";
```

Never import from `cdktf` or `@cdktf/*`.

### Bucket policies with token references

Use `Fn.jsonencode()` (not `JSON.stringify()`) when the policy document
contains Terraform token references like `bucket.arn` or `distribution.arn`:

```ts
// ✅ correct — Fn.jsonencode handles token interpolation
policy: Fn.jsonencode({
  Statement: [{ Resource: `${bucket.arn}/*` }]
})

// ❌ wrong — JSON.stringify will serialise the token reference as a string
policy: JSON.stringify({ Statement: [{ Resource: `${bucket.arn}/*` }] })
```

### Environment parameterisation

Use `process.env.DEPLOY_ENV` to parameterise stacks for dev/uat/prod.
Never hardcode environment names inside resource properties — pass as
constructor arguments or derive from the stack name.

## Testing

### Unit tests (`tests/stack.test.ts`)
- Framework: CDKTN `Testing` class + `node:test` + `assert/strict`
- Command: `make infra-test`
- **No AWS credentials required** — tests synthesise in-memory

```ts
import { Testing } from "cdktn";

function synthStack() {
  const app = Testing.app();
  const stack = new StaticWebsiteStack(app, "test");
  return JSON.parse(Testing.synth(stack)) as Record<string, any>;
}
```

Parse the JSON directly for assertions — do not rely on `Testing.toHaveResource`
as a Jest matcher (we use `node:test`, not Jest):

```ts
// ✅ correct
const s = synthStack();
assert.ok(s.resource?.aws_s3_bucket, "Expected S3 bucket");

// ❌ avoid — Jest-only
expect(synth).toHaveResource(S3Bucket);
```

### What to test
- Every resource type is present in the synth output
- Security properties: `force_destroy`, `block_public_acls`, `restrict_public_buckets`
- CloudFront: `enabled`, `viewer_protocol_policy: "redirect-to-https"`
- OAC: `signing_behavior: "always"`, `signing_protocol: "sigv4"`
- Required outputs exist (`cloudfrontUrl`, `bucketName`)

## Synth and deploy commands

```bash
make synth         # generate infra/cdktf.out/ (no AWS)
make infra-test    # unit tests (no AWS)
make deploy        # cdktn deploy (needs AWS OIDC / credentials)
make destroy       # tear down
make shell         # bash in container with AWS creds
```

## Adding new resources

1. Add the resource to `main.ts` inside `StaticWebsiteStack`
2. Add a corresponding unit test in `tests/stack.test.ts`
3. Run `make synth` to validate the synthesised JSON
4. Run `make scan` to check for security misconfigs (Trivy)

## Security baseline

Known acceptable findings (document in `.trivyignore` before tightening CI gates):
- No WAF association on CloudFront (hello-world scope)
- No access logging on S3 or CloudFront (hello-world scope)
- No HTTPS-only enforcement at S3 bucket level (CloudFront handles this)
