# platform

AWS CDK infrastructure for [magazineguessr.com](https://magazineguessr.com). Manages all cloud resources: DNS, TLS, CDN, storage, database, Lambda, and API Gateway. Deployed via GitHub Actions using OIDC.

---

## Stacks

### CertStack `(us-east-1)`
ACM wildcard TLS certificate covering `magazineguessr.com` and `*.magazineguessr.com`. Has to live in us-east-1 for CloudFront compatibility.

### InfraStack
Persistent infrastructure. Safe to deploy independently.

- **S3** — frontend hosting bucket (private, OAC access only)
- **CloudFront** — CDN distribution with HTTPS redirect, custom domain, and SPA fallback (404/403 → `index.html`)
- **DynamoDB** — `magazines-daily` table. PK: `date` (STRING), SK: `nr` (NUMBER). On-demand billing.
- **Secrets Manager** — `admin-key` secret for backend admin auth
- **ACM (regional)** — wildcard cert for `magazineguessr.com` + `*.magazineguessr.com` in `eu-central-1`. Required for API Gateway custom domains (separate from the us-east-1 cert used by CloudFront). Exported to AppStack.
- **GitHub OIDC** — IAM roles for CI/CD (CDK deploy, backend deploy, frontend deploy). No static credentials.
- **Route 53** — A record for `magazineguessr.com` → CloudFront, hosted zone exported to AppStack

### AppStack
Lambda + API Gateway. Depends on resources created by InfraStack (table, secret) via `fromTableName` / `fromSecretNameV2`.

- **Lambda** — `magazineguessr-backend`, Node 22, `handler: lambda.handler`. Placeholder code until backend is deployed.
- **Aliases** — `dev` (latest version) and `prod` (current version) on the same function
- **API Gateway** — Two HTTP APIs: one per alias, each with a custom domain mapping
- **Route 53** — `api.magazineguessr.com` → prod, `api.dev.magazineguessr.com` → dev

---

## Structure

```
cdk/
├── bin/
│   └── cdk.ts           # Entry point — instantiates all three stacks
├── lib/
│   ├── cert-stack.ts    # ACM cert (us-east-1)
│   ├── infra-stack.ts   # S3, CloudFront, DynamoDB, Secrets Manager, OIDC, Route 53
│   ├── app-stack.ts     # Lambda + API Gateway + Route 53
│   ├── app/
│   │   ├── lambda.ts    # LambdaConstruct — function + aliases
│   │   └── gateway.ts   # GatewayConstruct — HTTP APIs + custom domains + mappings
│   ├── infra/
│   │   └── cloudfront.ts # CloudFrontConstruct
│   ├── oidc.ts          # GitHub OIDC roles
│   └── aspects.ts       # DestroyAll aspect
└── test/
    ├── infra-stack.test.ts
    └── app-stack.test.ts
```

---

## CI/CD

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| `test.yml` | Push to `dev`, or called by `deploy.yml` | `npm ci && npm test` |
| `deploy.yml` | Push to `main` | Runs tests, then `cdk deploy --all` via OIDC |

The CDK role (`InfraStack-GithubOicdCdkRole...`) has `AdministratorAccess` — needed for stack creation. The backend and frontend roles are scoped down.

---

## Local Setup

```bash
cd cdk
npm install
npm run build
npm test
```

To deploy manually (requires AWS credentials with sufficient permissions):

```bash
npx cdk deploy --all
```

To deploy a specific stack:

```bash
npx cdk deploy InfraStack
npx cdk deploy AppStack
```

---

## Warnings


**AppStack Lambda is a placeholder.** The function currently returns a static 200. It will be replaced once the backend Lambda refactor is complete and `lambda:UpdateFunctionCode` is called from the backend CI pipeline.
