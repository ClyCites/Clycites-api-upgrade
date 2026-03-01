# GitHub Workflows Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    DEVELOPER WORKFLOW                       │
└─────────────────────────────────────────────────────────────┘

①  Create Branch                    ②  Create PR
   feature/auth-fix                    feature/auth-fix → main
          ↓                                   ↓
    Commit Changes                  ┌──────────────────┐
    (Conventional)                  │ PR Checks Start  │
          ↓                          └──────────────────┘
    Push to Remote                            ↓
          ↓                         ┌─────────────────────────────┐
┌─────────────────────┐             │ Workflows that trigger:     │
│ Pre-Commit Hooks    │             │ • Lint & Test              │
│ (Local/Optional)    │             │ • Docker Build             │
│ • Commit Linting    │             │ • Code Quality             │
│ • Type Check        │             │ • Code Coverage            │
└─────────────────────┘             │ • Branch Validation        │
                                    └─────────────────────────────┘


③ All Checks Pass                   ④  Get Approvals
        ↓                                    ↓
   ✅ Status Checks                   Review & Approve
   ✅ Lint                                   ↓
   ✅ Tests                         ⚖️ Requires 2 Approvals
   ✅ Coverage                        (for main branch)
   ✅ Type Check                             ↓
   ✅ Build Success                   Click "Merge"
                                            ↓
                                    ┌────────────────────┐
                                    │  Merge to Main     │
                                    └────────────────────┘
                                            ↓
                                    ⚙️  Post-Merge Workflows
                                    • ci.yml (re-runs)
                                    • build-and-push.yml
                                    • code-quality.yml


⑤ Build & Push                      ⑥  Deploy
        ↓                                    ↓
  Docker Images Built        ┌─────────────────────────┐
  Pushed to Registry          │ Manual or Automatic     │
  ghcr.io/org/clycites-*      │ Deploy to Staging       │
        ↓                      └─────────────────────────┘
  Tags Applied                           ↓
  • main                      ✅ Run on Main Branch
  • v1.2.3                    ✅ Or Manual Dispatch
  • sha-xxxxx                 ✅ Deploy to Production


⑦  Tagging for Release              ⑧  Release Created
   git tag v1.2.3                            ↓
   git push --tags                  ✅ GitHub Release
        ↓                           ✅ Changelog Generated
   Release Workflow Triggered       ✅ Artifacts Available
```

---

## Workflow Execution Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        EVENT TRIGGERS                            │
└──────────────────────────────────────────────────────────────────┘

Git Event              GitHub Event            Workflows Triggered
──────────────────────────────────────────────────────────────────

Push to feature/*  →   Pull Request Opened →  • pull-request.yml
                                              • lint-commit.yml
                                              • ci.yml

Commits Pushed     →   Push Event         →   • ci.yml
                                              • code-quality.yml

New PR Commit      →   Synchronize Event  →   • pull-request.yml
                                              • ci.yml
                                              • code-quality.yml

Merge to master    →   Push to master     →   • ci.yml (full suite)
   (2 approved)                              • build-and-push.yml
                                              • code-quality.yml
                                              • deploy.yml (production)

Merge to staging   →   Push to staging    →   • ci.yml (full suite)
   (1 approved)                              • code-quality.yml
                                              • deploy.yml (staging)

Cron Schedule      →   Scheduled Event    →   • schedule-tests.yml
(2 AM UTC, etc)                              (Daily, Weekly)
```

---

## Status Check Flow

```
   ├─→ ⚙️  CI Pipeline (ci.yml)
   │    ├─→ Setup Node.js (18.x, 20.x matrix)
   │    ├─→ Install Dependencies
   │    ├─→ Run ESLint
   │    ├─→ Build TypeScript
   │    ├─→ Run Jest Tests
   │    ├─→ Upload Coverage
   │    └─→ Security Audit
   │
   ├─→ 📊 Code Quality (code-quality.yml)
   │    ├─→ SonarCloud Analysis
   │    ├─→ Dependency Check
   │    └─→ Type Check
   │
   ├─→ ✅ PR Validation (pull-request.yml)
   │    ├─→ Title Format Check
   │    ├─→ Branch Naming Check
   │    ├─→ Lint & Build
   │    └─→ Test Coverage
   │
   └─→ 💬 Commit Lint (lint-commit.yml)
        └─→ Validate Commit Messages

   ⏳ All checks must pass ⏳

END: Ready to Merge (if all checks ✅)
```

---

## Docker Image Pipeline

Pipeline for building artifacts and distributable packages:

```
┌──────────────────────────────────────────────────────────────┐
│                   BUILD & ARTIFACTS PIPELINE                 │
└──────────────────────────────────────────────────────────────┘

Trigger: Push to main OR Tag Release
   │
   ├─→ Checkout Code
   │
   ├─→ Setup Node.js
   │
   ├─→ Install Dependencies
   │
   ├─→ Build TypeScript Project
   │    └─→ Compiles src/ to dist/
   │
   ├─→ Run Tests
   │    └─→ Verify build integrity
   │
   ├─→ Create Build Artifacts
   │    ├─→ dist/ (compiled JavaScript)
   │    ├─→ package.json
   │    └─→ README.md
   │
   └─→ Upload Artifacts
        └─→ Available for 7 days in GitHub
```

---

## Release Pipeline

```
┌──────────────────────────────────────────────────────────────┐
│                     RELEASE PIPELINE                         │
└──────────────────────────────────────────────────────────────┘

Developer: Creates Tag
   │
   $ git tag v1.2.3
   $ git push --tags
   │
   ├─→ GitHub Detects: Tag matching v*.*.*
   │
   ├─→ release.yml Triggered
   │    │
   │    ├─→ Extract Changelog
   │    │    └─→ Get all commits since last tag
   │    │
   │    ├─→ Create GitHub Release
   │    │    ├─→ Release Name: "Release v1.2.3"
   │    │    ├─→ Body: Changelog with commits
   │    │    ├─→ Auto-detect: alpha/beta/rc status
   │    │    └─→ Publish Release
   │    │
   │    └─→ build-and-push.yml Also Triggers (same tag)
   │         └─→ Push images tagged with v1.2.3
   │
   └─→ ✅ RELEASE COMPLETE
        User can download release, images are in registry
```

---

## Deployment Pipeline

```
┌──────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT PIPELINE                       │
└──────────────────────────────────────────────────────────────┘

Trigger: Manual Dispatch OR Automatic on main push
   │
   ├─→ Select Environment: Staging / Production
   │
   ├─→ Checkout Code
   │
   ├─→ Assume AWS Role (via OIDC)
   │    └─→ Uses: AWS_ROLE_TO_ASSUME secret
   │
   ├─→ Deploy Application
   │    ├─→ Update ECS services
   │    ├─→ Update CloudFormation stacks
   │    ├─→ Or: Custom deployment script
   │    └─→ Wait for stability
   │
   ├─→ Verify Deployment
   │    ├─→ Health checks
   │    ├─→ Smoke tests
   │    └─→ Endpoint validation
   │
   └─→ Post Notifications
        ├─→ Slack: Success/Failure
        ├─→ PagerDuty: If production (optional)
        └─→ GitHub: Deployment status

Environment Variables & Secrets by Environment:
┌─────────────────────────────────────────┐
│           STAGING                       │
├─────────────────────────────────────────┤
│ DEPLOYMENT_ROLE_ARN: staging-role-arn  │
│ DATABASE_URL: staging-db-connection    │
│ API_KEY: staging-key                   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│          PRODUCTION                     │
├─────────────────────────────────────────┤
│ DEPLOYMENT_ROLE_ARN: prod-role-arn     │
│ DATABASE_URL: prod-db-connection       │
│ API_KEY: prod-key                      │
│ PagerDuty_KEY: integration-key         │
└─────────────────────────────────────────┘
```

---

## Scheduled Testing Pipeline

```
┌──────────────────────────────────────────────────────────────┐
│                 SCHEDULED TESTS PIPELINE                     │
└──────────────────────────────────────────────────────────────┘

⏰ Schedule 1: Daily 2 AM UTC
   Every Day: 00:00 UTC → schedule-tests.yml

⏰ Schedule 2: Weekly Monday 8 AM UTC
   Every Monday: 08:00 UTC → schedule-tests.yml

   │
   ├─→ Full Test Suite with Coverage
   │    ├─→ npm test -- --coverage
   │    ├─→ Comprehensive test execution
   │    └─→ More thorough than regular CI
   │
   ├─→ Upload Coverage
   │    └─→ Codecov Report
   │
   ├─→ Generate Test Report
   │    └─→ Summary in GitHub Actions
   │
   └─→ Notify on Failure
        └─→ Slack notification if tests fail
```

---

## Branch Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                   BRANCH STRATEGY                           │
└─────────────────────────────────────────────────────────────┘

master (Production)
   ↑
   │ Merge PR (2+ approvals)
   │ ├─→ Auto-runs full CI/CD
   │ ├─→ Builds artifacts
   │ ├─→ Auto-deploys to production
   │ ├─→ Creates release on tag
   │
staging (Default/Integration)
   ↑
   │ Merge PR (1+ approvals)
   │ ├─→ Auto-runs CI tests
   │ ├─→ Auto-deploys to staging
   │
feature branches (Development)
   │
   ├─→ feature/auth-jwt
   │   └─→ Runs CI checks on each push
   │
   ├─→ fix/bug-123
   │   └─→ Runs CI checks on each push
   │
   └─→ docs/api-guide
       └─→ Runs CI checks on each push


Protection Rules:
┌─────────────────────────────┐
│ master Branch (Production)  │
├─────────────────────────────┤
│ ✓ Require 2+ PR approvals   │
│ ✓ Require status checks     │
│ ✓ Require signed commits    │
│ ✓ Dismiss stale reviews     │
│ ✓ Up-to-date required       │
└─────────────────────────────┘

┌─────────────────────────────┐
│ staging Branch (Default)    │
├─────────────────────────────┤
│ ✓ Require 1+ PR approval    │
│ ✓ Require status checks     │
│ ✓ Dismiss stale reviews     │
│ ✓ Up-to-date required       │
└─────────────────────────────┘
```

---

## Team Organization Structure

```
┌────────────────────────────────────────────────────────────┐
│            GITHUB ORGANIZATION STRUCTURE                   │
└────────────────────────────────────────────────────────────┘

clycites-org (GitHub Organization)
   │
   ├─→ 👥 Teams
   │    ├─→ platform-core (Developers)
   │    │    └─→ Permission: Maintain
   │    ├─→ devops (Infrastructure)
   │    │    └─→ Permission: Admin
   │    └─→ qa (Quality Assurance)
   │         └─→ Permission: Read
   │
   ├─→ 📦 Repositories
   │    ├─→ clycites-api
   │    ├─→ clycites-web
   │    ├─→ clycites-mobile
   │    └─→ clycites-docs
   │
   ├─→ 🔐 Secrets (Organization Level)
   │    ├─→ SONAR_TOKEN
   │    ├─→ SLACK_WEBHOOK
   │    ├─→ AWS_ROLE_TO_ASSUME
   │    └─→ CODECOV_TOKEN
   │
   ├─→ 🔑 Variables (Repository Level)
   │    ├─→ AWS_REGION
   │    ├─→ REGISTRY
   │    └─→ NODE_VERSION
   │
   └─→ ⚙️  Environments
        ├─→ staging (Dev Teams)
        │    └─→ Environment Secrets
        └─→ production (DevOps Team)
             └─→ Environment Secrets
```

---

This architecture ensures:
- ✅ Automated testing on every change
- ✅ Consistent code quality
- ✅ Reproducible deployments
- ✅ Clear team responsibilities
- ✅ Safety through branch protection
- ✅ Transparency via notifications
