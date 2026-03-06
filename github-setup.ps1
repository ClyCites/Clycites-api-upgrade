#!/usr/bin/env pwsh

# GitHub Organization Setup Script (PowerShell)
# This script helps set up the ClyCites API repository in a GitHub organization

$ErrorActionPreference = "Stop"

# Color definitions
$colors = @{
    Red     = "`e[31m"
    Green   = "`e[32m"
    Yellow  = "`e[33m"
    Blue    = "`e[34m"
    Reset   = "`e[0m"
}

function Write-Title {
    param([string]$Text)
    Write-Host ""
    Write-Host "$($colors.Blue)╔═══════════════════════════════════════════════════════════════╗$($colors.Reset)"
    Write-Host "$($colors.Blue)║  $Text$(' ' * (59 - $Text.Length))║$($colors.Reset)"
    Write-Host "$($colors.Blue)╚═══════════════════════════════════════════════════════════════╝$($colors.Reset)"
    Write-Host ""
}

function Write-Success {
    param([string]$Text)
    Write-Host "$($colors.Green)✓ $Text$($colors.Reset)"
}

function Write-Warning {
    param([string]$Text)
    Write-Host "$($colors.Yellow)⚠ $Text$($colors.Reset)"
}

function Write-Error {
    param([string]$Text)
    Write-Host "$($colors.Red)✗ $Text$($colors.Reset)"
}

# Check prerequisites
function Check-Prerequisites {
    Write-Host "$($colors.Yellow)Checking prerequisites...$($colors.Reset)"
    Write-Host ""
    
    # Check Git
    try {
        $null = git --version
        Write-Success "Git is installed"
    }
    catch {
        Write-Error "Git is not installed"
        Write-Host "Install from: https://git-scm.com/download/win"
        exit 1
    }
    
    # Check GitHub CLI
    try {
        $null = gh --version
        Write-Success "GitHub CLI is installed"
    }
    catch {
        Write-Error "GitHub CLI (gh) is not installed"
        Write-Host "Install from: https://cli.github.com/"
        Write-Host "Or use: choco install gh"
        exit 1
    }
    
    Write-Host ""
}

# Authenticate and get repo info
function Get-GitHubInfo {
    Write-Host "$($colors.Yellow)Authenticating with GitHub...$($colors.Reset)"
    
    try {
        $null = gh auth status
        Write-Success "Authenticated with GitHub"
    }
    catch {
        Write-Warning "You need to authenticate with GitHub"
        & gh auth login
    }
    
    Write-Host ""
    Write-Host "$($colors.Yellow)Getting repository information...$($colors.Reset)"
    
    try {
        $repoName = @(gh repo view --json name --jq '.name' 2>$null)[0]
        $repoOwner = @(gh repo view --json owner --jq '.owner.login' 2>$null)[0]
        
        if ([string]::IsNullOrEmpty($repoName)) {
            Write-Error "Could not get repository information"
            Write-Host "Make sure you're in a git repository directory"
            exit 1
        }
        
        Write-Success "Repository: $repoOwner/$repoName"
        Write-Host ""
        
        return @{
            Name  = $repoName
            Owner = $repoOwner
        }
    }
    catch {
        Write-Error "Failed to get repository info: $_"
        exit 1
    }
}

# Display setup instructions
function Show-Instructions {
    Write-Title "GitHub Organization Setup Instructions"
    
    Write-Host "STEP 1: Create GitHub Organization"
    Write-Host "════════════════════════════════════"
    Write-Host "1. Go to: https://github.com/organizations/new"
    Write-Host "2. Choose organization name (e.g., 'clycites')"
    Write-Host "3. Input contact email"
    Write-Host "4. Choose plan (Free or Paid)"
    Write-Host "5. Click 'Create organization'"
    Write-Host ""
    
    Write-Host "STEP 2: Add Members to Organization"
    Write-Host "════════════════════════════════════"
    Write-Host "1. Go to: https://github.com/settings/organizations"
    Write-Host "2. Select your organization"
    Write-Host "3. Go to: Settings > Members"
    Write-Host "4. Invite team members with appropriate roles"
    Write-Host ""
    
    Write-Host "STEP 3: Create Teams"
    Write-Host "════════════════════"
    Write-Host "1. Go to: Organization Settings > Teams"
    Write-Host "2. Click 'New team'"
    Write-Host "3. Create teams:"
    Write-Host "   - platform-core: Core API developers"
    Write-Host "   - devops: Infrastructure and deployment"
    Write-Host "   - qa: Quality assurance team"
    Write-Host ""
    
    Write-Host "STEP 4: Transfer Repository to Organization"
    Write-Host "═════════════════════════════════════════════"
    Write-Host "1. Go to your repository: Settings > General"
    Write-Host "2. Scroll to 'Danger Zone' section"
    Write-Host "3. Click 'Transfer ownership'"
    Write-Host "4. Type organization name and confirm"
    Write-Host ""
}

# Display checklist
function Show-Checklist {
    Write-Title "Setup Checklist"
    
    @(
        "Organization Setup:",
        "  [ ] Create GitHub organization",
        "  [ ] Add members to organization",
        "  [ ] Create teams (platform-core, devops, qa)",
        "  [ ] Transfer repository to organization",
        "",
        "Configuration:",
        "  [ ] Set organization secrets (SONAR_TOKEN, SLACK_WEBHOOK, etc)",
        "  [ ] Set repository variables (AWS_REGION, REGISTRY, etc)",
        "  [ ] Configure branch protection rules for main branch",
        "  [ ] Configure branch protection rules for develop branch",
        "  [ ] Create and configure CODEOWNERS file",
        "  [ ] Enable code scanning",
        "  [ ] Enable secret scanning",
        "  [ ] Enable push protection",
        "",
        "Verification:",
        "  [ ] First PR created and workflows run successfully",
        "  [ ] All status checks passing",
        "  [ ] Merge to main triggers build and push workflows",
        "  [ ] Docker images built and pushed to registry",
        "  [ ] Tagged releases create GitHub releases automatically",
        "  [ ] Slack notifications received on workflow completion",
        "",
        "Documentation:",
        "  [ ] Review GITHUB_ORGANIZATION_SETUP.md",
        "  [ ] Review GITHUB_WORKFLOWS.md",
        "  [ ] Update team's documentation with GitHub organization info",
        "  [ ] Create team guidelines (commit messages, branching, etc)"
    ) | ForEach-Object { Write-Host $_ }
}

# Main execution
function Main {
    Clear-Host
    
    Write-Title "GitHub Organization Setup Script"
    
    Check-Prerequisites
    
    $repoInfo = Get-GitHubInfo
    
    Show-Instructions
    
    Show-Checklist
    
    Write-Host ""
    Write-Host "$($colors.Green)═══════════════════════════════════════════════════════════════$($colors.Reset)"
    Write-Host "$($colors.Green)For detailed setup instructions, see: GITHUB_ORGANIZATION_SETUP.md$($colors.Reset)"
    Write-Host "$($colors.Green)For workflow documentation, see: GITHUB_WORKFLOWS.md$($colors.Reset)"
    Write-Host "$($colors.Green)═══════════════════════════════════════════════════════════════$($colors.Reset)"
    Write-Host ""
}

Main
