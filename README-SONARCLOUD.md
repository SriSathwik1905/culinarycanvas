# SonarCloud GitHub Actions Troubleshooting

If your SonarCloud analysis is visible in the SonarCloud dashboard but GitHub Actions is failing, follow these steps to fix the issue:

## Verify SonarCloud Project Settings

1. **Check your project settings in SonarCloud**:
   - Go to your project → Administration → Analysis Method
   - Make sure "GitHub Actions" is selected
   - Note the exact project key and organization name

2. **Verify GitHub Secrets**:
   - Go to your GitHub repository → Settings → Secrets and variables → Actions
   - Make sure `SONAR_TOKEN` is added as a repository secret
   - The token should have been generated from SonarCloud and have proper permissions

## Fix Common Branch Issues

1. **Ensure Branch Recognition**:
   - In SonarCloud, go to your project → Administration → Branches and Pull Requests
   - Check if "main" is properly set as your main branch
   - If not, you may need to manually set it

2. **Update sonar-project.properties**:
   - Add explicit branch configuration:
     ```properties
     sonar.branch.name=main
     sonar.branch.target=main
     ```
   - Make sure the project key matches exactly:
     ```properties
     sonar.projectKey=SriSathwik1905_culinarycanvas
     sonar.organization=srisathwik1905
     ```

## Manual Analysis Option

If GitHub Actions continues to fail, you can run a manual analysis:

1. **Run using the provided script**:
   ```bash
   # Set your token
   export SONAR_TOKEN=your_token_here
   
   # Run the analysis
   bash analyze-sonar.sh
   ```

2. **Debug SonarCloud integration**:
   ```bash
   # Set verbose debugging for more detailed logs
   export SONAR_SCANNER_OPTS="-Dsonar.verbose=true"
   
   # Run the analysis with debug output
   bash analyze-sonar.sh
   ```

3. **Use the SonarCloud interface**:
   - You can manually trigger an analysis from the SonarCloud dashboard
   - This can sometimes help "kick-start" the GitHub Actions integration

## Common Error Messages and Solutions

1. **"Could not find a default branch for project"**:
   - This means SonarCloud doesn't recognize your project via the CI pipeline
   - Make sure the project exists in SonarCloud and has the same key
   - Check that your main branch is properly configured

2. **"Project home must be an existing directory"**:
   - This is a path resolution issue in the GitHub Action
   - Specify the project base directory explicitly in the workflow
   - Use absolute paths rather than environment variables when possible

3. **"EXECUTION FAILURE"**:
   - Check the logs for more specific error messages
   - Verify that your SONAR_TOKEN has the proper permissions
   - Make sure your sonar-project.properties file is properly formatted
   - Check if the token is expired or revoked

4. **"Failed to query JRE metadata"**:
   - This often indicates an authentication issue
   - Make sure your SONAR_TOKEN is correctly set in GitHub Secrets
   - Verify that the token has access to the project

## Still Having Issues?

Try these advanced fixes:

1. **Delete and recreate the SonarCloud project** (don't worry, you won't lose settings):
   - In SonarCloud, delete the project
   - Create it again with the same key
   - Reconfigure GitHub Actions integration

2. **Use SonarCloud direct API** instead of GitHub Actions:
   - Create a custom script that posts directly to SonarCloud API
   - This bypasses potential GitHub Actions integration issues

3. **Contact SonarCloud support** with your detailed error logs:
   - They can help diagnose specific project configuration issues
   - Provide your organization name, project key, and GitHub repository URL 