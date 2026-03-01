# GitHub Workflows Quick Reference

A quick guide for developers using the ClyCites API GitHub workflows.

## Branch Strategy

**`staging`** - Default integration branch
- Active development happens here
- Requires 1 approval before merge
- Auto-deploys to staging environment

**`master`** - Production branch  
- Production releases only
- Requires 2 approvals before merge
- Auto-deploys to production environment
- Auto-creates releases from tags

Always create branches following this pattern:

```
feature/{feature-name}
fix/{bug-name}
docs/{doc-name}
refactor/{refactor-name}
test/{test-name}
hotfix/{issue-name}
```

✅ **Good:**
- `feature/add-auth-middleware`
- `fix/farmer-login-bug`
- `docs/update-readme`

❌ **Bad:**
- `new-feature` (missing type)
- `Fix-Bug` (wrong case)
- `feature_auth` (underscore instead of dash)

## Commit Message Format

Follow Conventional Commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting, etc)
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Tests
- `chore`: Build, dependencies
- `ci`: CI/CD changes

### Example Commits

✅ **Good:**
```
feat(auth): add JWT refresh token support

Implement automatic token refresh mechanism to extend session duration
without requiring users to re-authenticate.

Fixes #123
```

✅ **Good:**
```
fix(marketplace): resolve pricing calculation error

Total price was not accounting for quantity discounts applied per unit.

Closes #456
```

❌ **Bad:**
```
updated code
fixed stuff
WIP
```

## Pull Request Workflow

### 1. Create Feature Branch (from staging)
```bash
git checkout staging
git pull origin staging
git checkout -b feature/my-feature
git push -u origin feature/my-feature
```

### 2. Make Changes & Commit
```bash
git commit -m "feat(scope): description"
git push
```

### 3. Open Pull Request
- Go to GitHub repository
- Click "Create pull request"
- **Base branch:** Usually `staging` (or `master` for hotfixes)
- Fill in title and description
- Link related issues (e.g., "Closes #123")

### 4. Wait for Checks
PR workflows will automatically run:
- ✅ Lint check
- ✅ Build check
- ✅ Unit tests
- ✅ Type checking
- ✅ Code coverage

### 5. Get Review & Merge
- Get required approvals:
  - **To staging:** 1 approval
  - **To master:** 2 approvals
- Resolve any failing checks
- Click "Squash and merge" or "Merge pull request"

### 6. Automatic Deployment
- **Merge to staging** → Auto-deploys to staging environment ✅
- **Merge to master** → Auto-deploys to production environment ✅

## Local Development

## Local Development

### Setup
```bash
# Install pnpm globally (if not already installed)
npm install -g pnpm@8

# Install dependencies
pnpm install

# Create `.env` from example
cp .env.example .env
```

### Development
```bash
# Start development server
pnpm run dev

# Run tests
pnpm test

# Run specific test file
pnpm test -- auth.middleware.test.js

# Watch mode
pnpm test -- --watch

# Generate coverage
pnpm test -- --coverage
```

### Code Quality
```bash
# Run linting
pnpm run lint

# Fix linting issues
pnpm run lint:fix

# Type check
pnpm exec tsc --noEmit

# Build
pnpm run build
```

## Common Workflow Statuses

### Green ✅
All checks passing - your PR is ready to merge!

### Red ❌
Something failed. Check the workflow logs:
1. Go to **Actions** tab in the PR
2. Click on the failing workflow
3. Expand the failing job to see error details

### Yellow 🟡
Workflow is still running. Wait for completion.

## Troubleshooting

### Tests Failing Locally
```bash
# Clean install with pnpm
rm -rf node_modules
pnpm install
pnpm test
```

### Lint Errors
```bash
# Auto-fix most issues
pnpm run lint:fix

# Review remaining errors
pnpm run lint
```

### Type Errors
```bash
# Check TypeScript compilation
pnpm exec tsc --noEmit

# Review specific file
pnpm exec tsc src/file.ts --noEmit
```

### Docker Build Failing
```bash
# Since we focus on Node.js only, docker is not used in CI
# Only concern yourself with Node.js builds
npm run build
```

## Deployment

### To Staging
```bash
# Automatic on staging branch push (if CI passes)
# Just merge your PR to staging branch
git merge feature/my-feature
git push origin staging

# Or manually:
# 1. Go to Actions > Deploy
# 2. Click "Run workflow"
# 3. Select environment: staging
# 4. Click "Run workflow"
```

### To Production
```bash
# Method 1: Merge PR to master (auto-deploys)
git checkout master
git pull origin master
git merge staging
git push origin master

# Method 2: Tag for release (creates release + deploys)
git tag v1.2.3
git push --tags

# Or manual deployment:
# 1. Go to Actions > Deploy
# 2. Select environment: production
# 3. Click "Run workflow"
```

## Release Process

### Creating a Release
```bash
# Make sure main branch is up to date
git checkout main
git pull

# Create and push tag
git tag v1.2.3 -m "Release version 1.2.3"
git push --tags
```

### Release Naming
- `v1.2.3` - Release version (major.minor.patch)
- `v1.2.3-alpha.1` - Alpha release
- `v1.2.3-beta.1` - Beta release
- `v1.2.3-rc.1` - Release candidate

Release workflow will:
1. Extract changelog from commits
2. Create GitHub release
3. Build and push Docker images

## Useful Commands

```bash
# View git log with commits
git log --oneline

# View all branches
git branch -a

# Clean up local branches (deleted on remote)
git fetch --prune

# Rebase on latest main
git fetch origin
git rebase origin/main

# Squash commits before merge
git rebase -i HEAD~3  # Last 3 commits
```

## Getting Help

- **Workflow issues?** → Check `.github/workflows/` or `GITHUB_WORKFLOWS.md`
- **Setup issues?** → See `GITHUB_ORGANIZATION_SETUP.md`
- **Commit messages?** → See `commitlint.config.js`
- **GitHub docs?** → [docs.github.com/en/actions](https://docs.github.com/en/actions)

## GitHub Links

- **Repository:** https://github.com/clycites-org/clycites-api
- **Staging Branch:** https://github.com/clycites-org/clycites-api/tree/staging
- **Master Branch:** https://github.com/clycites-org/clycites-api/tree/master
- **Actions:** https://github.com/clycites-org/clycites-api/actions
- **Releases:** https://github.com/clycites-org/clycites-api/releases
- **Deployments:** https://github.com/clycites-org/clycites-api/deployments
- **Issues:** https://github.com/clycites-org/clycites-api/issues
- **Pull Requests:** https://github.com/clycites-org/clycites-api/pulls

---

**Last Updated:** 2026-03-02
**Repository:** ClyCites API
**Organization:** clycites-org
**Default Branch:** staging
**Production Branch:** master
