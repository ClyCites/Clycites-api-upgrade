# GitHub Workflows Documentation

## Overview

This project uses GitHub Actions to automate CI/CD, testing, code quality checks, and deployments. All workflows are located in `.github/workflows/`.

## Workflow Files

### 1. **ci.yml** - Continuous Integration Pipeline
**Trigger:** Push to `main`/`develop`, Pull Requests

**Jobs:**
- **lint-and-test** (Node 18.x, 20.x matrix)
  - Install dependencies
  - Run ESLint
  - Build TypeScript
  - Run Jest tests with coverage
  - Upload coverage to Codecov
  - Run npm audit for security

### 2. **build-and-push.yml** - Build Artifacts
**Trigger:** Push to `master`, Git tags (v*.*.*)  

**Jobs:**
- **build**
  - Builds TypeScript project
  - Runs test suite
  - Creates distributable artifacts
  - Uploads artifacts to GitHub

**Artifacts:** `dist/`, `package.json`, `README.md`

**When:** Triggered on master branch pushes or release tags
### 3. **release.yml** - Release Management
**Trigger:** Git tag with version pattern (v*.*.*)

**Jobs:**
- **create-release**
  - Automatically extracts changelog from commits
  - Creates GitHub release
  - Supports alpha/beta pre-releases

**Naming Convention:** `git tag v1.0.0`

### 4. **code-quality.yml** - Code Quality & Security
**Trigger:** Push to `staging`/`master`, Pull Requests

**Jobs:**
- **sonarcloud** - SonarCloud analysis (requires SONAR_TOKEN)
- **dependency-check** - Checks for vulnerable dependencies
- **type-check** - TypeScript type validation

**Required Secrets:** `SONAR_TOKEN`

### 5. **deploy.yml** - Deployment Automation
**Trigger:** Manual dispatch, Push to `staging` or `master`

**Jobs:**
- **deploy**
  - Supports staging and production environments
  - AWS credentials via role assumption
  - Environment-specific variables and secrets
  - Slack notifications on completion

**Environments:** 
- `staging` - triggered on staging branch push
- `production` - triggered on master branch push or manual dispatch

**Required Secrets:**
- `AWS_ROLE_TO_ASSUME`
- `SLACK_WEBHOOK`

### 6. **schedule-tests.yml** - Scheduled Testing
**Trigger:** Cron schedule (Daily 2 AM UTC, Weekly Monday 8 AM UTC)

**Jobs:**
- **comprehensive-test**
  - Full test suite with coverage
  - Codecov upload
  - Slack notification on failure

**Schedule:**
```yaml
0 2 * * *   # Every day at 2 AM UTC
0 8 * * 1   # Every Monday at 8 AM UTC
```

### 7. **pull-request.yml** - PR Validation
**Trigger:** Pull Request events (opened, synchronize, reopened, edited)

**Jobs:**
- **pr-validation**
  - Validates PR title follows conventional commits
  - Checks branch naming convention (`feature/*`, `fix/*`, etc.)
  - Runs lint and build
  - Runs tests
  - Auto-comments with build status
  
- **code-coverage**
  - Generates and uploads coverage reports

**Branch Naming Convention:**
- `feature/description`
- `fix/description`
- `docs/description`
- `hotfix/description`
- `refactor/description`
- `test/description`

**PR Title Convention:**
- `feat: description`
- `fix: description`
- `docs: description`
- `style: description`
- `refactor: description`
- `perf: description`
- `test: description`
- `chore: description`
- `ci: description`

### 8. **lint-commit.yml** - Commit Linting
**Trigger:** Pull Request submissions

**Jobs:**
- **commitlint**
  - Validates commit messages follow conventional commits
  - Uses `commitlint.config.js`

## Environment Configuration

### Organization Level
Add to **Organization Settings → Security → Secrets and variables → Actions**

```yaml
SONAR_TOKEN: xxx
CODECOV_TOKEN: xxx
SLACK_WEBHOOK: https://hooks.slack.com/services/xxx
AWS_ROLE_TO_ASSUME: arn:aws:iam::xxx
```

### Repository Level
Add to **Repository Settings → Security → Variables → Actions**

```yaml
AWS_REGION: us-east-1
REGISTRY: ghcr.io
```

### Environment Level
Add to **Repository Settings → Environments → staging/production**

```yaml
DEPLOYMENT_ROLE_ARN: arn:aws:iam::xxx
DATABASE_URL: postgresql://xxx
```

## Using Workflows Locally

### Running Tests Locally
```bash
npm install
npm test                    # Run tests
npm test -- --coverage     # With coverage
npm run lint               # Run linting
npm run build              # TypeScript build
```

### Manual Workflow Dispatch

**Deploy Workflow:**
1. Go to **Actions → Deploy**
2. Click **Run workflow**
3. Select environment (staging/production)
4. Click **Run workflow**

**Schedule Tests (Manual):**
1. Go to **Actions → Scheduled Tests**
2. Click **Run workflow**

## Viewing Workflow Status

1. **In Pull Requests:** All status checks visible below the PR description
2. **In Actions Tab:** View detailed logs for each workflow run
3. **Branch Protection:** Workflows block merge if required checks fail

## Debugging Workflow Issues

### Check Workflow Logs
1. Go to **Actions** tab
2. Select the workflow run
3. Click on the job to see step-by-step logs
4. Look for error messages in red text

### Common Issues

#### Docker Build Fails
- Check Dockerfile syntax
- Verify all dependencies are listed
- Check file paths are correct

#### Tests Fail
- Run tests locally first: `npm test`
- Check Node version compatibility
- Review test logs for specific failures

#### Coverage Upload Fails
- Verify Jest coverage generation: `npm test -- --coverage`
- Check coverage folder exists: `./coverage/coverage-final.json`
- Verify Codecov token is set (if required)

#### Deployment Fails
- Verify AWS credentials and role
- Check environment variables are set
- Review CloudFormation/ECS service status

## Best Practices

### 1. Keep Workflows Concise
- Use actions from GitHub Marketplace when possible
- Parallelize jobs that don't depend on each other
- Set `continue-on-error` only when appropriate

### 2. Cache Dependencies
- Use `actions/setup-node@v4` with `cache: 'npm'`
- Cache Docker layers with `docker/build-push-action`
- Reduces workflow execution time

### 3. Proper Secrets Management
- Never log secrets
- Use `GITHUB_TOKEN` when possible
- Rotate tokens regularly
- Document which secrets are required

### 4. Clear Status Messages
- Use descriptive job names
- Add comments explaining complex steps
- Update PR with status messages

### 5. Testing
- Test workflows in feature branch first
- Use `workflow_dispatch` for manual testing
- Validate changes in staging before production

## Adding New Workflows

### Template

```yaml
name: My Workflow Name

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
  workflow_dispatch:

jobs:
  job-name:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run task
        run: npm run my-task
```

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax Reference](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [GitHub Marketplace Actions](https://github.com/marketplace?type=actions)
- [Passing Data Between Workflows](https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions)
