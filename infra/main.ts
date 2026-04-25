import { Construct } from "constructs";
import { App, TerraformStack, TerraformOutput, Fn } from "cdktn";
import { AwsProvider } from "@cdktn/provider-aws/lib/provider";
import { S3Bucket } from "@cdktn/provider-aws/lib/s3-bucket";
import { S3BucketPublicAccessBlock } from "@cdktn/provider-aws/lib/s3-bucket-public-access-block";
import { S3BucketPolicy } from "@cdktn/provider-aws/lib/s3-bucket-policy";
import { S3Object } from "@cdktn/provider-aws/lib/s3-object";
import { CloudfrontDistribution } from "@cdktn/provider-aws/lib/cloudfront-distribution";
import { CloudfrontOriginAccessControl } from "@cdktn/provider-aws/lib/cloudfront-origin-access-control";
import { CognitoUserPool } from "@cdktn/provider-aws/lib/cognito-user-pool";
import { CognitoUserPoolClient } from "@cdktn/provider-aws/lib/cognito-user-pool-client";
import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Stack — exported so tests can import it
// ---------------------------------------------------------------------------
export class StaticWebsiteStack extends TerraformStack {
  constructor(scope: Construct, name: string) {
    super(scope, name);

    new AwsProvider(this, "aws", { region: "ap-southeast-2" });

    const bucket = new S3Bucket(this, "bucket", {
      bucketPrefix: "cdktn-hello-world-",
      forceDestroy: true,
    });

    new S3BucketPublicAccessBlock(this, "publicAccessBlock", {
      bucket: bucket.id,
      blockPublicAcls: true,
      blockPublicPolicy: true,
      ignorePublicAcls: true,
      restrictPublicBuckets: true,
    });

    const oac = new CloudfrontOriginAccessControl(this, "oac", {
      name: "cdktn-hello-world-oac",
      originAccessControlOriginType: "s3",
      signingBehavior: "always",
      signingProtocol: "sigv4",
    });

    const distribution = new CloudfrontDistribution(this, "distribution", {
      enabled: true,
      defaultRootObject: "index.html",
      origin: [{
        domainName: bucket.bucketRegionalDomainName,
        originId: "s3",
        originAccessControlId: oac.id,
      }],
      defaultCacheBehavior: {
        allowedMethods: ["GET", "HEAD"],
        cachedMethods: ["GET", "HEAD"],
        targetOriginId: "s3",
        viewerProtocolPolicy: "redirect-to-https",
        forwardedValues: {
          queryString: false,
          cookies: { forward: "none" },
        },
      },
      restrictions: { geoRestriction: { restrictionType: "none" } },
      viewerCertificate: { cloudfrontDefaultCertificate: true },
    });

    // -------------------------------------------------------------------------
    // Auth — Cognito User Pool for passwordless/biometrics
    // -------------------------------------------------------------------------
    const userPool = new CognitoUserPool(this, "userPool", {
      name: "cdktn-nebula-auth",
      mfaConfiguration: "OFF",
      passwordPolicy: {
        minimumLength: 8,
        requireLowercase: false,
        requireNumbers: false,
        requireSymbols: false,
        requireUppercase: false,
      },
      schema: [
        {
          name: "email",
          attributeDataType: "String",
          mutable: true,
          required: true,
        },
      ],
    });

    const userPoolClient = new CognitoUserPoolClient(this, "userPoolClient", {
      name: "nebula-web-client",
      userPoolId: userPool.id,
      explicitAuthFlows: [
        "ALLOW_CUSTOM_AUTH",
        "ALLOW_USER_AUTH_FLOW",
        "ALLOW_REFRESH_TOKEN_AUTH",
      ],
    });

    new S3BucketPolicy(this, "bucketPolicy", {
      bucket: bucket.id,
      policy: Fn.jsonencode({
        Version: "2012-10-17",
        Statement: [{
          Sid: "AllowCloudFrontServicePrincipal",
          Effect: "Allow",
          Principal: { Service: "cloudfront.amazonaws.com" },
          Action: "s3:GetObject",
          Resource: `${bucket.arn}/*`,
          Condition: {
            StringEquals: { "AWS:SourceArn": distribution.arn },
          },
        }],
      }),
    });

    // Upload every file from app/dist/ to S3
    const distDir = path.join(__dirname, "../app/dist");
    if (fs.existsSync(distDir)) {
      this.uploadDir(distDir, distDir, bucket.id);
    }

    new TerraformOutput(this, "cloudfrontUrl", {
      value: `https://${distribution.domainName}`,
      description: "CloudFront distribution URL",
    });

    new TerraformOutput(this, "bucketName", {
      value: bucket.id,
      description: "S3 bucket name",
    });

    new TerraformOutput(this, "userPoolId", {
      value: userPool.id,
    });

    new TerraformOutput(this, "userPoolClientId", {
      value: userPoolClient.id,
    });
  }

  /** Recursively upload a local directory to S3 */
  private uploadDir(baseDir: string, dir: string, bucketId: string): void {
    const MIME: Record<string, string> = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "application/javascript",
      ".ts": "application/javascript",
      ".json": "application/json",
      ".png": "image/png",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon",
    };

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        this.uploadDir(baseDir, full, bucketId);
      } else {
        const key = path.relative(baseDir, full).replace(/\\/g, "/");
        const ext = path.extname(entry.name);
        new S3Object(this, `asset-${key.replace(/[^a-zA-Z0-9]/g, "-")}`, {
          bucket: bucketId,
          key,
          source: full,
          contentType: MIME[ext] ?? "application/octet-stream",
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Entry point — only executed when run directly (not imported by tests)
// ---------------------------------------------------------------------------
if (require.main === module) {
  const app = new App();
  new StaticWebsiteStack(app, "cdktn-static-website");
  app.synth();
}
