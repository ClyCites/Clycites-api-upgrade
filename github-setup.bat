@echo off
REM GitHub Organization Setup Script (Windows/PowerShell)
REM This script helps set up the ClyCites API repository in a GitHub organization

cls
echo.
echo ================================================================================
echo                   GitHub Organization Setup (Windows)
echo ================================================================================
echo.

REM Check prerequisites
echo Checking prerequisites...

where git >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Git is not installed
    echo Please install Git from: https://git-scm.com/download/win
    pause
    exit /b 1
)
echo [OK] Git installed

where gh >nul 2>nul
if errorlevel 1 (
    echo [ERROR] GitHub CLI (gh) is not installed
    echo Please install from: https://cli.github.com/
    echo.
    echo Or install using Chocolatey:
    echo   choco install gh
    echo.
    pause
    exit /b 1
)
echo [OK] GitHub CLI installed
echo.

echo Authenticating with GitHub...
gh auth status >nul 2>&1
if errorlevel 1 (
    echo You need to authenticate with GitHub
    call gh auth login
)
echo [OK] Authenticated with GitHub
echo.

echo Getting repository information...
for /f "tokens=*" %%i in ('gh repo view --json name --jq ".name" 2^>nul') do set REPO_NAME=%%i
for /f "tokens=*" %%i in ('gh repo view --json owner --jq ".owner.login" 2^>nul') do set REPO_OWNER=%%i

if "%REPO_NAME%"=="" (
    echo [ERROR] Could not get repository information
    echo Make sure you're in a git repository directory
    pause
    exit /b 1
)

echo [OK] Repository: %REPO_OWNER%/%REPO_NAME%
echo.

REM Display instructions
echo.
echo ================================================================================
echo                  GITHUB ORGANIZATION SETUP INSTRUCTIONS
echo ================================================================================
echo.
echo STEP 1: Create GitHub Organization
echo ════════════════════════════════════
echo 1. Go to: https://github.com/organizations/new
echo 2. Choose organization name (e.g., "clycites")
echo 3. Input contact email
echo 4. Choose plan (Free or Paid)
echo 5. Click "Create organization"
echo.
echo STEP 2: Add Members to Organization
echo ════════════════════════════════════
echo 1. Go to: https://github.com/settings/organizations
echo 2. Select your organization
echo 3. Go to: Settings ^> Members
echo 4. Invite team members with appropriate roles
echo.
echo STEP 3: Transfer Repository to Organization
echo ═════════════════════════════════════════════
echo 1. Go to your repository: Settings ^> General
echo 2. Scroll to "Danger Zone" section
echo 3. Click "Transfer ownership"
echo 4. Type organization name and confirm
echo.
echo Or use GitHub CLI:
echo   gh repo transfer %REPO_NAME% YOUR_ORG_NAME
echo.
echo STEP 4: Set Organization Secrets
echo ═════════════════════════════════
echo Go to: Organization Settings ^> Security ^> Secrets and variables ^> Actions
echo Add these secrets:
echo   - SONAR_TOKEN
echo   - SLACK_WEBHOOK
echo   - AWS_ROLE_TO_ASSUME (optional)
echo.
echo STEP 5: Configure Branch Protection Rules
echo ══════════════════════════════════════════
echo Go to: Repository Settings ^> Branches
echo For "main" branch:
echo   [x] Require pull request before merging
echo   [x] Require 2+ approvals
echo   [x] Require status checks:
echo       - lint-and-test
echo       - docker-build-test
echo       - code-quality
echo   [x] Require signed commits
echo.
echo STEP 6: Enable Security Features
echo ═════════════════════════════════
echo Go to: Repository Settings ^> Code Security
echo Enable:
echo   [x] Secret scanning
echo   [x] Push protection
echo   [x] Dependabot alerts
echo.
echo ================================================================================
echo For detailed instructions, see: GITHUB_ORGANIZATION_SETUP.md
echo ================================================================================
echo.

pause
