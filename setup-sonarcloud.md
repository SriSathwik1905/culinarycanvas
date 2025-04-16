# How to Fix SonarCloud Project Setup

The current SonarCloud error `Failed to query JRE metadata` or `Could not find a default branch for project` occurs because of authentication or project setup issues. Follow these steps to fix it:

## Step 1: Create or Verify Your SonarCloud Account

1. Go to [SonarCloud](https://sonarcloud.io/) and sign in with your GitHub account
2. Complete the initial setup process

## Step 2: Create or Verify Your Organization

1. In SonarCloud, click on the "+" button at the top right and select "Create organization"
2. Choose "GitHub" as your organization provider
3. Select your GitHub username or organization
4. Complete the organization setup process
5. Note the organization key (for this project: `srisathwik1905`)

## Step 3: Update Your Configuration

1. The `sonar-project.properties` file should contain:
   ```properties
   sonar.projectKey=SriSathwik1905_culinarycanvas
   sonar.organization=srisathwik1905
   ```
   Ensure these match your actual SonarCloud organization and project keys

## Step 4: Generate and Set Up Authentication Token

1. In SonarCloud, go to your account (icon in the top right) → Security
2. Generate a new token with a descriptive name like "GitHub Actions - Culinary Canvas"
3. Copy the token (you won't be able to see it again)
4. Add the token to your GitHub repository secrets:
   - Go to your GitHub repository
   - Navigate to Settings > Secrets and variables > Actions
   - Create a new repository secret named `SONAR_TOKEN`
   - Paste the token value

## Step 5: Manually Import Your Project (if needed)

If your project isn't already set up in SonarCloud:

1. In SonarCloud, click on the "+" button and select "Analyze new project"
2. Find and select the `culinarycanvas` repository
3. Set up the project (choose GitHub Actions as your analysis method)
4. Make note of the project key (should be `SriSathwik1905_culinarycanvas`)

## Step 6: Validate Your Token and Setup

Run the validation tools we've created:

1. In your repository, run:
   ```bash
   export SONAR_TOKEN=your_token_here
   bash refresh-sonar-token.sh
   ```

2. Or trigger the validation workflow:
   - Go to GitHub Actions → Workflows → "Validate SonarCloud Setup"
   - Click "Run workflow" and enable debug mode

## Step 7: Run Your GitHub Actions Workflow Again

After completing these steps, your GitHub Actions workflow should now be able to connect to SonarCloud and perform the analysis.

## Troubleshooting

If you continue to encounter issues:

1. **Error: Failed to query JRE metadata**
   - This typically indicates an authentication issue
   - Ensure your SONAR_TOKEN is correctly set in GitHub Secrets
   - Check that the token hasn't expired or been revoked

2. **Error: Could not find a default branch for project**
   - Make sure the project exists in SonarCloud
   - Verify that the project key in configuration matches SonarCloud

3. **Error: Project home must be an existing directory**
   - Check that your project structure is correct
   - Ensure the sonar-project.properties file is at the root of your repository

For more detailed troubleshooting, refer to the `README-SONARCLOUD.md` file. 