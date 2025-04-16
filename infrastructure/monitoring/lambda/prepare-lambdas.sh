#!/bin/bash
# Script to prepare Lambda deployment packages for Terraform

set -e  # Exit on any error

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo "Preparing Lambda deployment packages for Terraform..."

# Prepare the enhanced health check
echo "Creating enhanced health check package..."
cp health-check.js index.js
zip -r health-check.zip index.js package.json
rm index.js

# Prepare the basic health check
echo "Creating basic health check package..."
cp basic-health-check.js index.js
zip -r basic-health-check.zip index.js basic-package.json
rm index.js

echo "Lambda packages prepared successfully!"
echo " - health-check.zip: Enhanced health check for monitoring.tf"
echo " - basic-health-check.zip: Basic health check for main.tf"
echo ""
echo "You can now run 'terraform init' and 'terraform apply'" 