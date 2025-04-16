# Setting Up SonarCloud with GitHub Actions

This guide will help you set up SonarCloud with GitHub Actions for your Culinary Canvas project.

## What is SonarCloud?

SonarCloud is a cloud-based code quality and security service. It performs automatic code reviews to detect bugs, vulnerabilities, and code smells in your code. It integrates with your CI/CD workflow to ensure code quality throughout your development process.

## Prerequisites

- GitHub account with admin access to this repository
- SonarCloud account (you can sign up at [sonarcloud.io](https://sonarcloud.io/))

## Step 1: Set Up SonarCloud Project

1. Go to [SonarCloud](https://sonarcloud.io/) and log in with your GitHub account.
2. Click "+" at the top right and select "Analyze new project".
3. Choose the GitHub organization and select the repository (`culinarycanvas`).
4. Follow the setup wizard to complete the configuration.
5. Note down your organization name and project key.

## Step 2: Generate a SonarCloud Token

1. In SonarCloud, go to your account (icon in the top right) → Security.
2. Generate a new token with a meaningful name like "GitHub Actions - Culinary Canvas".
3. Copy the token immediately (you won't be able to see it again).

## Step 3: Add the Token to GitHub Secrets

1. Go to your GitHub repository.
2. Click on "Settings" → "Secrets and variables" → "Actions".
3. Click "New repository secret".
4. Name the secret `SONAR_TOKEN`.
5. Paste the token you copied from SonarCloud.
6. Click "Add secret".

## Step 4: Verify Your Configuration

1. The SonarCloud GitHub Actions workflow is already set up in `.github/workflows/sonarcloud.yml`.
2. The project is configured in `sonar-project.properties`.
3. Make sure these settings match your SonarCloud project:
   ```properties
   sonar.projectKey=SriSathwik1905_culinarycanvas
   sonar.organization=srisathwik1905
   ```

## Step 5: Run a Test Analysis

You can manually trigger the SonarCloud analysis:

1. Go to the "Actions" tab in your GitHub repository.
2. Select the "SonarCloud Analysis" workflow.
3. Click "Run workflow" → "Run workflow".

## Troubleshooting

If you encounter issues with the SonarCloud integration:

1. Verify that your SONAR_TOKEN is correctly set in GitHub Secrets.
2. Check the SonarCloud workflow logs for specific error messages.
3. Run the token validation script:
   ```bash
   export SONAR_TOKEN=your_token_here
   bash refresh-sonar-token.sh
   ```
4. For more detailed troubleshooting, refer to `README-SONARCLOUD.md`.

## Additional Resources

- [SonarCloud Documentation](https://docs.sonarcloud.io/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [SonarSource GitHub Action](https://github.com/SonarSource/sonarcloud-github-action) 