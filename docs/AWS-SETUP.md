# Setting up AWS Credentials for GitHub Actions

This document explains how to set up AWS credentials for GitHub Actions to enable deployment to AWS services like S3 and CloudFront.

## Prerequisites

1. An AWS account with appropriate permissions
2. Access to the GitHub repository settings

## Step 1: Create an IAM User in AWS

1. Log in to your AWS Management Console
2. Navigate to IAM (Identity and Access Management)
3. Click on "Users" in the left sidebar
4. Click "Add user"
5. Enter a name (e.g., `github-actions-culinarycanvas`)
6. Select "Programmatic access" for Access type
7. Click "Next: Permissions"
8. Either attach existing policies or create a new policy with the following permissions:
   - S3 access (for deployment)
   - CloudFront access (for cache invalidation)
   - Any other services used in your deployment process
9. Click through to review and create the user
10. **Important**: Save the Access Key ID and Secret Access Key that are displayed - you will need these for GitHub

## Step 2: Add AWS Credentials to GitHub Secrets

1. Go to your GitHub repository
2. Click on "Settings" > "Secrets and variables" > "Actions"
3. Add the following secrets:
   - `AWS_ACCESS_KEY_ID`: The Access Key ID from AWS
   - `AWS_SECRET_ACCESS_KEY`: The Secret Access Key from AWS
   - `AWS_REGION`: The AWS region you're deploying to (e.g., `us-east-1`)
   - `CLOUDFRONT_DISTRIBUTION_ID_STAGING`: Your CloudFront distribution ID for staging
   - `CLOUDFRONT_DISTRIBUTION_ID_PRODUCTION`: Your CloudFront distribution ID for production

## Step 3: Create S3 Buckets (if not already created)

1. Log in to your AWS Management Console
2. Navigate to S3
3. Create two buckets:
   - `culinarycanvas-staging`
   - `culinarycanvas-production`
4. Configure the buckets for static website hosting

## Step 4: Create CloudFront Distributions (if not already created)

1. Navigate to CloudFront in the AWS console
2. Create distributions pointing to your S3 buckets
3. Note the distribution IDs and add them to GitHub secrets as mentioned in Step 2

## Troubleshooting

If you encounter the error "Credentials could not be loaded," check the following:

1. Verify that you have added all required secrets to GitHub
2. Ensure the IAM user has the necessary permissions
3. Check that the AWS region is correctly specified
4. Validate that the secret names match exactly what is expected in the workflow file

## Security Considerations

- Use IAM policies with least privilege - only grant the permissions needed for deployment
- Regularly rotate your AWS access keys
- Consider using OpenID Connect (OIDC) for more secure AWS authentication from GitHub Actions 