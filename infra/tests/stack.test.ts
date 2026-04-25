import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { Testing } from "cdktn";
import { StaticWebsiteStack } from "../main";

// Helper — synth a fresh stack and parse the JSON
function synthStack() {
  const app = Testing.app();
  const stack = new StaticWebsiteStack(app, "test");
  return JSON.parse(Testing.synth(stack)) as Record<string, any>;
}

describe("StaticWebsiteStack", () => {
  test("synthesises without error", () => {
    assert.doesNotThrow(() => synthStack());
  });

  test("has AWS provider configured", () => {
    const s = synthStack();
    assert.ok(s.provider?.aws, "Expected aws provider block");
  });

  test("has exactly one S3 bucket", () => {
    const s = synthStack();
    const buckets = Object.values(s.resource?.aws_s3_bucket ?? {});
    assert.strictEqual(buckets.length, 1, "Expected one S3 bucket");
  });

  test("S3 bucket has force_destroy enabled", () => {
    const s = synthStack();
    const buckets = Object.values(s.resource?.aws_s3_bucket ?? {}) as any[];
    assert.ok(
      buckets.every((b) => b.force_destroy === true),
      "Expected force_destroy: true"
    );
  });

  test("S3 public access is fully blocked", () => {
    const s = synthStack();
    const blocks = Object.values(
      s.resource?.aws_s3_bucket_public_access_block ?? {}
    ) as any[];
    assert.ok(blocks.length > 0, "Expected public access block resource");
    const b = blocks[0];
    assert.ok(b.block_public_acls, "block_public_acls");
    assert.ok(b.block_public_policy, "block_public_policy");
    assert.ok(b.ignore_public_acls, "ignore_public_acls");
    assert.ok(b.restrict_public_buckets, "restrict_public_buckets");
  });

  test("has a CloudFront distribution that is enabled", () => {
    const s = synthStack();
    const dists = Object.values(
      s.resource?.aws_cloudfront_distribution ?? {}
    ) as any[];
    assert.ok(dists.length > 0, "Expected CloudFront distribution");
    assert.ok(dists.every((d) => d.enabled === true), "distribution.enabled");
  });

  test("CloudFront uses OAC (not legacy OAI)", () => {
    const s = synthStack();
    const oacs = Object.values(
      s.resource?.aws_cloudfront_origin_access_control ?? {}
    ) as any[];
    assert.ok(oacs.length > 0, "Expected OAC resource");
    assert.strictEqual(oacs[0].signing_behavior, "always");
    assert.strictEqual(oacs[0].signing_protocol, "sigv4");
  });

  test("CloudFront redirects HTTP to HTTPS", () => {
    const s = synthStack();
    const dists = Object.values(
      s.resource?.aws_cloudfront_distribution ?? {}
    ) as any[];
    const behavior = dists[0]?.default_cache_behavior;
    assert.strictEqual(
      behavior?.viewer_protocol_policy,
      "redirect-to-https"
    );
  });

  test("outputs cloudfrontUrl", () => {
    const s = synthStack();
    assert.ok(s.output?.cloudfrontUrl, "Expected cloudfrontUrl output");
  });

  test("outputs bucketName", () => {
    const s = synthStack();
    assert.ok(s.output?.bucketName, "Expected bucketName output");
  });
});
