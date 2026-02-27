# Updraft CCRO Dashboard — AWS Migration Plan
*Prepared for CEO/CTO review · February 2026*
*Current hosting: Vercel + Supabase · Target: AWS*

---

## Executive Summary

We are migrating the CCRO Dashboard from its current setup — a Next.js application
hosted on Vercel and a PostgreSQL database hosted on Supabase — to Amazon Web Services
(AWS). The migration will improve data sovereignty, give us more control over security
configuration, and position the platform alongside Updraft's broader AWS infrastructure.

Estimated migration window: **6 weeks**
Estimated AWS monthly running cost: **£180–280/month** (at current usage scale)
Expected downtime: **< 2 hours** (maintenance window during migration cutover)
Data residency: **EU-West-2 (AWS London)** throughout

---

## Why Migrate from Vercel + Supabase?

| Concern | Current (Vercel + Supabase) | After Migration (AWS) |
|---|---|---|
| Data sovereignty | Data in US-East (Supabase default) | UK data centre (AWS London) |
| Infrastructure control | Managed third-party platforms | Full control over network, security groups, scaling |
| Compliance posture | Third-party data processors require ICO DPIA review | AWS is an existing data processor with standard contractual clauses already in place |
| Cost predictability | Scales with usage (can spike) | Reserved capacity = fixed monthly cost |
| Integration with Updraft infra | Separate from main AWS stack | Unified AWS account, same VPC, same IAM |
| Support & SLA | Consumer-tier support | Enterprise-grade AWS Support plan |

---

## What We Are Moving

| Component | Current | AWS Target |
|---|---|---|
| **Web application** (Next.js) | Vercel Edge Network | AWS ECS Fargate (containerised Next.js) |
| **Database** (PostgreSQL) | Supabase (managed Postgres) | AWS RDS PostgreSQL (db.t3.small, Multi-AZ) |
| **DNS** | Vercel / Cloudflare | AWS Route 53 |
| **CDN / static assets** | Vercel Edge | Amazon CloudFront |
| **Secrets** (DB passwords, OAuth tokens, Auth secret) | Vercel environment variables | AWS Secrets Manager |
| **Monitoring & alerts** | Vercel Analytics + manual | AWS CloudWatch (logs, metrics, alerts) |
| **Backups** | Supabase auto-backup | RDS automated backups (7-day retention) + weekly manual snapshots |

---

## Architecture After Migration

```
Internet
   │
   ▼
Route 53 (DNS: ccro.updraft.com)
   │
   ▼
CloudFront (CDN — caches static assets: JS, CSS, images)
   │
   ▼
Application Load Balancer (HTTPS, SSL termination)
   │
   ▼
ECS Fargate Cluster
  ├── Task: Next.js container (1–2 instances, auto-scaling)
  │     └── Reads secrets from Secrets Manager at startup
  │     └── Connects to RDS via private subnet
  │
Private Subnet (no public internet access)
  └── RDS PostgreSQL (db.t3.small, Multi-AZ standby in eu-west-2b)
  └── ElastiCache Redis (optional — for session caching if needed)
```

All infrastructure in **eu-west-2 (London region)**.

---

## Step-by-Step Migration Plan

### Week 1 — AWS Infrastructure Setup

**Tasks:**
1. Create a dedicated AWS account (or use existing Updraft account) and set up IAM roles with least-privilege access
2. Provision VPC with public and private subnets across 2 availability zones (eu-west-2a and eu-west-2b)
3. Provision RDS PostgreSQL instance:
   - Instance: `db.t3.small` (2 vCPU, 2GB RAM) — right-sized for current data volume
   - Multi-AZ: yes (automatic failover to standby)
   - Storage: 20GB gp3 (auto-scaling enabled up to 100GB)
   - Encryption at rest: enabled (AWS KMS)
   - Automated backups: 7-day retention
   - Database name: `ccro_dashboard`
4. Set up Secrets Manager with all required secrets:
   - `DATABASE_URL` (RDS connection string)
   - `AUTH_SECRET` (NextAuth secret)
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
   - `NEXTAUTH_URL` (production URL)
5. Set up ECR (Elastic Container Registry) to store the Docker image for the Next.js app
6. Set up ECS Fargate cluster

**Deliverable:** Fully provisioned AWS infrastructure (empty), ready for deployment

---

### Week 2 — Database Migration

**Tasks:**
1. Take a full database export from Supabase using `pg_dump`
2. Test the export by restoring it to a staging RDS instance
3. Validate all 40+ tables, constraints, and data integrity
4. Update the Prisma connection string to point to the new RDS instance
5. Run `npx prisma migrate deploy` on the RDS instance to confirm schema is current
6. Run the seed script (`npx prisma db seed`) on the new RDS to pre-populate reference data
7. Verify all 328 regulations, 8 users, 20 processes, and full Controls Library are intact

**Important:** Supabase and RDS will run in parallel until cutover (Week 6).

**Deliverable:** RDS instance populated with migrated data, validated

---

### Week 3 — Application Containerisation

**Tasks:**
1. Write a `Dockerfile` for the Next.js application:
   - Base image: `node:20-alpine`
   - Build stage: install dependencies, run `next build`
   - Runtime stage: serve with `next start`
2. Build and push the Docker image to ECR
3. Create an ECS Task Definition:
   - Container: Next.js image from ECR
   - CPU: 0.5 vCPU, Memory: 1GB (scale up as needed)
   - Environment variables: loaded from Secrets Manager at runtime
4. Create ECS Service with ALB target group:
   - Desired count: 1 (scale to 2 under load)
   - Health check: GET /api/health (create a simple health endpoint)
5. Configure CloudFront distribution in front of the ALB

**Deliverable:** CCRO Dashboard running on ECS, accessible via CloudFront URL (non-production)

---

### Week 4 — Security Hardening

**Tasks:**
1. Configure Security Groups:
   - ALB: inbound 443 (HTTPS) from internet only
   - ECS tasks: inbound from ALB only
   - RDS: inbound from ECS task security group only (no internet access)
2. Enable AWS WAF on CloudFront:
   - Rate limiting (prevent brute-force on sign-in)
   - Common web exploit rules (OWASP Top 10)
3. Configure VPC Flow Logs and CloudTrail for audit
4. Review IAM roles — ensure ECS task role has only Secrets Manager read access
5. Enable RDS encryption, confirm automated backup policy
6. Update Google OAuth callback URL to new domain:
   - `https://ccro.updraft.com/api/auth/callback/google`
7. SSL certificate: request via AWS Certificate Manager (ACM) — free with ALB
8. Update `NEXTAUTH_URL` and `AUTH_TRUST_HOST` in Secrets Manager for the new domain

**Deliverable:** Security review sign-off, no open findings

---

### Week 5 — Testing & Cutover Preparation

**Tasks:**
1. Full functional smoke test on AWS environment:
   - Sign in with Google OAuth
   - Load Risk Register, Consumer Duty, Controls Library
   - Create a test risk, action, and control — confirm they persist to RDS
   - Export a CSV — confirm it downloads correctly
   - Test all 15+ dashboard sections
2. Performance comparison: Vercel vs ECS latency (target: < 500ms TTFB for dashboard load)
3. Prepare DNS cutover plan:
   - Current DNS TTL: lower to 60 seconds at least 48 hours before cutover
   - Cutover: update Route 53 A record to point to CloudFront
4. Prepare rollback plan (keep Vercel deployment live for 2 weeks post-cutover)
5. Brief the CCRO team on the migration window (expected: 2-hour maintenance window on a Saturday morning)

**Deliverable:** Test sign-off, cutover plan agreed

---

### Week 6 — Production Cutover

**Tasks:**
1. **Saturday morning — maintenance window starts**
2. Put Vercel deployment into maintenance mode (custom error page: "Scheduled maintenance in progress")
3. Take a final `pg_dump` of Supabase — apply any new data to RDS
4. Flip DNS to CloudFront (Route 53 update)
5. Confirm production environment is live on AWS (smoke test)
6. Remove maintenance mode
7. **Migration complete — monitor for 24 hours**

**Post-cutover (2 weeks):**
- Keep Supabase subscription active as a fallback (read-only)
- Monitor CloudWatch for errors, memory, and CPU
- Cancel Supabase after 2-week confirmation period

**Deliverable:** Live on AWS, Supabase subscription cancelled

---

## Cost Estimate

| Service | Specification | Est. Monthly Cost |
|---|---|---|
| **RDS PostgreSQL** | db.t3.small, Multi-AZ, 20GB gp3 | £55–65 |
| **ECS Fargate** | 0.5 vCPU / 1GB, ~730 hrs/month | £25–35 |
| **Application Load Balancer** | ~10GB data processed | £20–25 |
| **CloudFront** | ~50GB data transfer (internal users) | £5–10 |
| **Route 53** | 1 hosted zone, ~1M queries | £5 |
| **Secrets Manager** | 5 secrets, ~10K API calls/month | £2–3 |
| **CloudWatch** | Logs + metrics for 1 service | £5–10 |
| **Data transfer** | RDS → ECS (same VPC, free) | £0 |
| **Misc (WAF, ACM, NAT Gateway)** | | £20–30 |
| **Total estimate** | | **£137–183/month** |

*Comparison: Current Vercel Pro + Supabase Pro ≈ £90–110/month. AWS cost is slightly higher
but delivers Multi-AZ resilience, UK data residency, and full infrastructure control.*

*To reduce costs: use a reserved RDS instance (1-year term) = ~35% saving on RDS line.*

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Google OAuth callback URL change breaks sign-in | Medium | High | Update Google Cloud Console redirect URIs before Week 4; test in staging |
| Supabase data export is incomplete | Low | High | Validate row counts table-by-table after restore; keep Supabase live as fallback |
| ECS container boot time causes slow cold starts | Medium | Low | Pre-warm with minimum 1 Fargate task always running |
| DNS propagation delay at cutover | Low | Medium | Pre-reduce TTL to 60s; plan 15-min window for propagation |
| RDS Multi-AZ failover test reveals issues | Low | Medium | Run a failover test in Week 4 on staging RDS |
| Prisma adapter incompatibility | Low | High | Prisma 7 + `@prisma/adapter-pg` tested against RDS in Week 2 |

---

## What Stays the Same

The migration is **infrastructure only**. The following do not change:

- Application code (zero changes to Next.js, Prisma, or API routes)
- Database schema (same PostgreSQL, same Prisma schema)
- User-facing URL (ccro.updraft.com — or whatever the agreed domain is)
- Google OAuth login flow
- User roles, permissions, and all data

---

## Questions the CEO/CTO May Ask

**Q: Will the CCRO team notice any difference?**
A: No. The application is identical. The only visible change is a slightly different URL during
   the Week 3–5 testing phase. Production users see no change.

**Q: Is our data in the UK?**
A: Yes. All data will be in AWS eu-west-2 (London). The current Supabase deployment
   uses US-East-1 by default, which requires a UK GDPR supplementary measure.
   Moving to London removes this data residency concern entirely.

**Q: What is the disaster recovery posture?**
A: RDS Multi-AZ provides automatic failover to a standby replica within the same AWS region
   (typically < 1 minute failover). CloudFront edge caching means static assets remain
   available even if the application tier fails. Recovery Point Objective (RPO): < 5 minutes.
   Recovery Time Objective (RTO): < 10 minutes.

**Q: How much will this cost vs what we pay now?**
A: Slightly more (£137–183/month vs £90–110/month currently). The premium buys Multi-AZ
   resilience, UK data residency, WAF protection, and unified infrastructure control.
   A 1-year RDS reservation brings the cost back to comparable levels.

**Q: Who owns this going forward?**
A: Graham (Tech) would own the AWS infrastructure. CCRO Team owns the application layer.
   We recommend documenting the AWS architecture in the internal runbook.

---

*Prepared by: CCRO function, with input from Tech (Graham)*
*Review date: March 2026*
