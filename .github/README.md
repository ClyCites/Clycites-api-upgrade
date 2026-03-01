# ClyCites GitHub Organization Configuration

This directory contains GitHub Actions workflows and organization setup configurations.

## Quick Start

### 1. First Time Setup

Run the setup script for your operating system:

**macOS/Linux:**
```bash
chmod +x github-setup.sh
./github-setup.sh
```

**Windows (PowerShell):**
```powershell
powershell -ExecutionPolicy Bypass -File github-setup.bat
```

Or use PowerShell directly:
```powershell
./github-setup.ps1
```

### 2. Follow the Setup Guide

See **[GITHUB_ORGANIZATION_SETUP.md](../GITHUB_ORGANIZATION_SETUP.md)** for detailed instructions.

### 3. Review Workflow Documentation

See **[GITHUB_WORKFLOWS.md](../GITHUB_WORKFLOWS.md)** for each workflow's purpose and configuration.

## Directory Structure

```
.github/
├── workflows/              # GitHub Actions CI/CD pipelines
│   ├── ci.yml             # Main CI pipeline (test, lint, build)
│   ├── build-and-push.yml # Docker image build and push
│   ├── release.yml        # Automated release creation
│   ├── code-quality.yml   # Code quality checks (SonarCloud, etc)
│   ├── deploy.yml         # Deployment to staging/production
│   ├── schedule-tests.yml # Scheduled test runs
│   ├── pull-request.yml   # PR validation and checks
│   └── lint-commit.yml    # Commit message linting
├── ISSUE_TEMPLATE/        # Issue templates
├── PULL_REQUEST_TEMPLATE.md # PR template
├── CODEOWNERS            # Code ownership rules
├── .gitignore           # Git ignore for workflows
└── README.md            # This file
```

## Key Files

- **[GITHUB_ORGANIZATION_SETUP.md](../GITHUB_ORGANIZATION_SETUP.md)**: Complete setup guide for GitHub organization
- **[GITHUB_WORKFLOWS.md](../GITHUB_WORKFLOWS.md)**: Documentation for each workflow
- **[commitlint.config.js](../commitlint.config.js)**: Commit message validation rules
- **[github-setup.sh](../github-setup.sh)**: Automated setup for macOS/Linux
- **[github-setup.bat](../github-setup.bat)**: Automated setup for Windows

## Required Secrets

Add these to your GitHub Organization (Settings → Security → Secrets and variables):

```yaml
# Code Quality
SONAR_TOKEN: <your-sonarcloud-token>

# Deployments
AWS_ROLE_TO_ASSUME: arn:aws:iam::ACCOUNT:role/github-actions

# Notifications
SLACK_WEBHOOK: https://hooks.slack.com/services/...
```

## Workflow Triggers

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| CI | Push, PR | Build, test, lint |
| Build & Test | Push to main, tags | Build artifacts, run tests |
| Release | Git tags | GitHub releases |
| Code Quality | Push, PR | SonarCloud, dependencies |
| Deploy | Manual, push to main | Staging/Production |
| Schedule Tests | Cron (daily, weekly) | Extended tests |
| PR Validation | Pull request | Title, branch, commits |
| Commit Lint | Pull request | Message format |

## Getting Help

- **Workflow Issues?** → Check [GITHUB_WORKFLOWS.md](../GITHUB_WORKFLOWS.md)
- **Setup Issues?** → Check [GITHUB_ORGANIZATION_SETUP.md](../GITHUB_ORGANIZATION_SETUP.md)
- **Commit Messages?** → See `commitlint.config.js` for rules
- **GitHub Actions Docs?** → [docs.github.com/en/actions](https://docs.github.com/en/actions)

## Next Steps

1. ✅ Create GitHub organization
2. ✅ Transfer repository to organization
3. ✅ Add organization secrets
4. ✅ Configure branch protection rules
5. ✅ Test first PR and merge
6. ✅ Verify workflows run successfully

See **[GITHUB_ORGANIZATION_SETUP.md](../GITHUB_ORGANIZATION_SETUP.md)** for detailed step-by-step instructions.
