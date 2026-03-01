# GitHub Organization & Repository Setup Guide

## Overview

This guide explains how to set up the ClyCites API project within a GitHub Organization with proper CI/CD pipelines, branch protection rules, and security configurations.

## Table of Contents

1. [Organization Setup](#organization-setup)
2. [Repository Configuration](#repository-configuration)
3. [Secrets and Variables](#secrets-and-variables)
4. [Branch Protection Rules](#branch-protection-rules)
5. [Workflow Triggers](#workflow-triggers)
6. [Team Permissions](#team-permissions)

## Organization Setup

### 1. Create GitHub Organization

```bash
# Visit https://github.com/organizations/new
# Fill in:
# - Organization name: e.g., "clycites" or "clycites-org"
# - Billing email: your-org-email@example.com
# - Organization website (optional)
```

### 2. Add Members to Organization

**Settings → Members → Invite members**

Recommended team structure:
- **Owners**: Project leads, DevOps engineers
- **Maintainers**: Senior developers
- **Developers**: Team members with push access
- **Viewers**: Non-coding stakeholders

### 3. Create Teams

**Teams** section:
- `@platform-core` - Core API developers
- `@devops` - DevOps and infrastructure
- `@quality-assurance` - QA and testing

## Repository Configuration

### 1. Repository Settings

**Settings → General:**
- Enable "Require contributors to sign off on web-based commits"
- Enable "Always suggest updating pull request branches"
- Enable "Allow auto-merge" (optional)

**Settings → Code Security → Secret scanning:**
- Enable "Push protection"
- Enable "Secret scanning for push events"

### 2. Delete Default Branch Protection

If `main` branch exists, update its protection rules (see [Branch Protection Rules](#branch-protection-rules))

## Secrets and Variables

### Required Organization Secrets

Add these to **Organization Settings → Security → Secrets and variables → Actions**

#### Docker Registry Authentication
```yaml
DOCKERHUB_USERNAME: your-dockerhub-username
DOCKERHUB_TOKEN: your-dockerhub-token
```

Or for GitHub Container Registry (recommended):
```yaml
# GitHub Container Registry uses GITHUB_TOKEN automatically
# No additional secrets needed - it's provided by GitHub
```

#### Code Quality
```yaml
SONAR_TOKEN: your-sonarcloud-token
CODECOV_TOKEN: your-codecov-token  # Optional, Codecov autodetects from GITHUB_TOKEN
```

#### AWS Deployment (if using AWS)
```yaml
AWS_ROLE_TO_ASSUME: arn:aws:iam::ACCOUNT:role/github-actions-role
```

#### Monitoring & Notifications
```yaml
SLACK_WEBHOOK: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
DATADOG_API_KEY: your-datadog-api-key  # Optional
```

### Repository Variables

Add these to **Repository Settings → Security → Variables → Actions**

```yaml
AWS_REGION: us-east-1
REGISTRY: ghcr.io
NODE_VERSION: "20.x"
PYTHON_VERSION: "3.11"
```

### Environment-Specific Secrets

**Settings → Environments → staging/production**

For each environment, add:

```yaml
# Staging
DEPLOYMENT_ROLE_ARN: arn:aws:iam::STAGING_ACCOUNT:role/...
DATABASE_URL: postgresql://...
API_KEY: staging-api-key

# Production
DEPLOYMENT_ROLE_ARN: arn:aws:iam::PROD_ACCOUNT:role/...
DATABASE_URL: postgresql://...
API_KEY: production-api-key
PagerDuty_INTEGRATION_KEY: xxx
```

## Branch Protection Rules

### Main Branch Rules

**Settings → Branches → Add Rule**

**Pattern:** `main`

1. **Require a pull request before merging**
   - ✅ Require approvals: `2`
   - ✅ Dismiss stale pull request approvals when new commits are pushed
   - ✅ Require code owner review

2. **Require status checks to pass before merging**
   - ✅ Require branches to be up to date before merging
   - Required checks:
     - `lint-and-test (18.x)`
     - `lint-and-test (20.x)`
     - `code-quality / sonarcloud`

3. **Require security**
   - ✅ Require attempts to make changes through a pull request
   - ✅ Require security policy approval
   - ✅ Require signed commits

### Develop Branch Rules

**Pattern:** `develop`

1. **Require a pull request before merging**
   - ✅ Require approvals: `1`
   - ✅ Dismiss stale pull request approvals

2. **Require status checks to pass**
   - Use same checks as main (or subset)

3. **Allow force pushes to develop** (optional for flexibility)

## Workflow Triggers

### Available Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Push to main/develop, PR | Run tests, linting, build |
| `build-and-push.yml` | Push to main, tags, manual | Build and push Docker images |
| `release.yml` | Tag with v*.*.* | Create GitHub releases |
| `code-quality.yml` | Push/PR to main/develop | SonarCloud, dependency checks |
| `deploy.yml` | Manual dispatch, push to main | Deploy to AWS/staging/production |
| `schedule-tests.yml` | Daily 2 AM, Weekly Monday | Extended test suite |
| `pull-request.yml` | PR opened/updated | PR validation and checks |
| `lint-commit.yml` | PR opened | Validate commit messages |

### Implementing Required Checks

1. **Go to:** Settings → Branches → master branch rules

2. **Select workflow status checks as required:**
   ```
   ✅ lint-and-test (18.x)
   ✅ lint-and-test (20.x)
   ✅ code-quality / sonarcloud
   ```

## Team Permissions

### GitHub Teams Access

**Settings → Manage Access → Configure Teams**

#### Platform-Core Team
- **Permissions:** Maintain
- **Access:** All branches
- **Reviews:** Can approve PRs

#### DevOps Team
- **Permissions:** Maintain
- **Access:** Deploy workflows
- **Reviews:** Can approve infrastructure changes

#### QA Team
- **Permissions:** Read
- **Access:** View only, can comment on PRs

## Post-Setup Checklist

- [ ] Organization created and members added
- [ ] Repository transferred to organization
- [ ] All secrets added to organization
- [ ] All variables added to repository
- [ ] Branch protection rules configured
- [ ] Required status checks enabled
- [ ] Teams created and assigned
- [ ] CODEOWNERS file created
- [ ] Wiki/Documentation updated
- [ ] Slack integration configured
- [ ] First workflow run successful
- [ ] Deployments tested (staging)

## CODEOWNERS File

Create `.github/CODEOWNERS`:

```yaml
# Global owners
* @org/platform-core

# Module-specific owners
/src/services/auth/ @org/platform-core @org/devops
/src/services/farmers/ @org/platform-core
/flask-app/ @org/devops
/src/services/marketplace/ @org/platform-core

# Infrastructure
/.github/workflows/ @org/devops
/docker/ @org/devops
```

## Troubleshooting

### Workflow Not Triggering
- Check branch protection rules aren't blocking
- Verify push events are configured
- Check GitHub Actions is enabled in organization settings

### Status Check Failures
- Review workflow logs in Actions tab
- Check secret variables are correctly named
- Verify branch protection rules match workflow names

### Secret Access Issues
- Ensure secrets are added at organization level (for shared use)
- Check workflow has `permissions` configured if needed
- Verify token permissions if using GITHUB_TOKEN

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Organization Documentation](https://docs.github.com/en/organizations)
- [Conventional Commits](https://www.conventionalcommits.org/)
