#!/usr/bin/env bash

# GitHub Organization Setup Script
# This script helps set up the ClyCites API repository in a GitHub organization

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}GitHub Organization Setup${NC}"
echo -e "${BLUE}================================${NC}\n"

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    if ! command -v git &> /dev/null; then
        echo -e "${RED}Git is not installed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Git installed${NC}"
    
    if ! command -v gh &> /dev/null; then
        echo -e "${RED}GitHub CLI (gh) is not installed${NC}"
        echo "Install from: https://cli.github.com/"
        exit 1
    fi
    echo -e "${GREEN}✓ GitHub CLI installed${NC}"
    
    echo ""
}

# Authenticate with GitHub
authenticate() {
    echo -e "${YELLOW}Authenticating with GitHub...${NC}"
    
    if ! gh auth status &> /dev/null; then
        echo -e "${YELLOW}You need to authenticate with GitHub${NC}"
        gh auth login
    fi
    
    GITHUB_USER=$(gh auth status --show-token 2>/dev/null | grep "Logged in to" | awk '{print $3}')
    echo -e "${GREEN}✓ Authenticated as: $GITHUB_USER${NC}\n"
}

# Get repository information
get_repo_info() {
    echo -e "${YELLOW}Getting repository information...${NC}"
    
    REPO_NAME=$(gh repo view --json name --jq '.name' 2>/dev/null || echo "")
    REPO_OWNER=$(gh repo view --json owner --jq '.owner.login' 2>/dev/null || echo "")
    
    if [ -z "$REPO_NAME" ] || [ -z "$REPO_OWNER" ]; then
        echo -e "${RED}Could not get repository information${NC}"
        echo "Make sure you're in a git repository directory"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Repository: $REPO_OWNER/$REPO_NAME${NC}\n"
}

# Display organization setup instructions
show_organization_instructions() {
    cat << 'EOF'
╔══════════════════════════════════════════════════════════════════════════════╗
║                   GITHUB ORGANIZATION SETUP INSTRUCTIONS                     ║
╚══════════════════════════════════════════════════════════════════════════════╝

STEP 1: Create GitHub Organization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Go to: https://github.com/organizations/new
2. Choose organization name (e.g., "clycites")
3. Input contact email
4. Choose plan (Free or Paid)
5. Click "Create organization"

STEP 2: Add Members to Organization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Go to: https://github.com/settings/organizations
2. Select your organization
3. Go to: Settings → Members
4. Invite team members with appropriate roles:
   - Owner: Full access
   - Maintainer: Admin access to repositories
   - Member: Standard access
   - Billing Manager: Payment management only

STEP 3: Create Teams
━━━━━━━━━━━━━━━━━━━
1. Go to: Organization Settings → Teams
2. Click "New team"
3. Create teams:
   - platform-core: Core API developers
   - devops: Infrastructure and deployment
   - qa: Quality assurance team
   
STEP 4: Transfer Repository to Organization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Go to your repository: Settings → General
2. Scroll to "Danger Zone" section
3. Click "Transfer ownership"
4. Type organization name and confirm

Or use GitHub CLI:
  gh repo transfer <REPO> <ORG>

STEP 5: Set Organization Secrets
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Go to: Organization Settings → Security → Secrets and variables → Actions
2. Add these organization secrets:
   - SONAR_TOKEN (from SonarCloud)
   - CODECOV_TOKEN (optional, auto-detected from GITHUB_TOKEN)
   - SLACK_WEBHOOK (for notifications)
   - AWS_ROLE_TO_ASSUME (if using AWS)

STEP 6: Set Repository Variables
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Go to: Repository Settings → Security → Variables → Actions
2. Add these repository variables:
   - AWS_REGION (e.g., us-east-1)
   - REGISTRY (e.g., ghcr.io)
   - NODE_VERSION (e.g., 20.x)

STEP 7: Configure Branch Protection Rules
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Go to: Repository Settings → Branches
2. Click "Add rule" for "main" branch
3. Configure:
   ✓ Require pull request before merging
   ✓ Require approvals (2+ for main)
   ✓ Require status checks:
     - lint-and-test (18.x)
     - lint-and-test (20.x)
     - docker-build-test
     - code-quality
   ✓ Require signed commits
   ✓ Require branches to be up to date

STEP 8: Enable Required Actions
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Go to: Repository → Actions → General
2. Ensure GitHub Actions is enabled
3. Check "Allow all actions and reusable workflows"

STEP 9: Set Code Owners (Optional but Recommended)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Create file: .github/CODEOWNERS
2. Add team assignments by path:
   /src/services/auth/ @org/platform-core
   /.github/workflows/ @org/devops

STEP 10: Enable Security Features
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Go to: Repository Settings → Code Security
2. Enable:
   ✓ Secret scanning
   ✓ Push protection
   ✓ Dependabot alerts
   ✓ Dependabot security updates

EOF
}

# Display checklist
show_checklist() {
    cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                              SETUP CHECKLIST                                 ║
╚══════════════════════════════════════════════════════════════════════════════╝

Organization Setup:
  [ ] Create GitHub organization
  [ ] Add members to organization
  [ ] Create teams (platform-core, devops, qa)
  [ ] Transfer repository to organization

Configuration:
  [ ] Set organization secrets (SONAR_TOKEN, SLACK_WEBHOOK, etc.)
  [ ] Set repository variables (AWS_REGION, REGISTRY, etc.)
  [ ] Configure branch protection rules for main branch
  [ ] Configure branch protection rules for develop branch
  [ ] Create and configure CODEOWNERS file
  [ ] Enable code scanning
  [ ] Enable secret scanning
  [ ] Enable push protection

Verification:
  [ ] First PR created and workflows run successfully
  [ ] All status checks passing
  [ ] Merge to main triggers build and push workflows
  [ ] Docker images built and pushed to registry
  [ ] Tagged releases create GitHub releases automatically
  [ ] Slack notifications received on workflow completion

Documentation:
  [ ] Review GITHUB_ORGANIZATION_SETUP.md
  [ ] Review GITHUB_WORKFLOWS.md
  [ ] Update team's documentation with GitHub organization info
  [ ] Create team guidelines (commit messages, branching, etc.)

EOF
}

# Main execution
main() {
    check_prerequisites
    authenticate
    get_repo_info
    show_organization_instructions
    show_checklist
    
    cat << EOF

${GREEN}═══════════════════════════════════════════════════════════════════════════${NC}
${GREEN}For detailed setup instructions, see: GITHUB_ORGANIZATION_SETUP.md${NC}
${GREEN}For workflow documentation, see: GITHUB_WORKFLOWS.md${NC}
${GREEN}═══════════════════════════════════════════════════════════════════════════${NC}

EOF
}

main
