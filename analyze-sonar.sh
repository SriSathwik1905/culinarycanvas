#!/bin/bash
# Direct SonarCloud analysis script

# This script can be run manually if GitHub Actions is having trouble
# You'll need to set SONAR_TOKEN as an environment variable first

# Check if SONAR_TOKEN is set
if [ -z "$SONAR_TOKEN" ]; then
  echo "Error: SONAR_TOKEN environment variable is not set."
  echo "Please set it with: export SONAR_TOKEN=your_token_here"
  exit 1
fi

echo "Starting direct SonarCloud analysis..."

# Download SonarScanner if not already present
if [ ! -d "sonar-scanner" ]; then
  echo "Downloading SonarScanner..."
  wget https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-4.8.0.2856-linux.zip
  unzip sonar-scanner-cli-4.8.0.2856-linux.zip
  mv sonar-scanner-4.8.0.2856-linux sonar-scanner
  rm sonar-scanner-cli-4.8.0.2856-linux.zip
fi

# Run the analysis
./sonar-scanner/bin/sonar-scanner \
  -Dsonar.projectKey=SriSathwik1905_culinarycanvas \
  -Dsonar.organization=srisathwik1905 \
  -Dsonar.host.url=https://sonarcloud.io \
  -Dsonar.login=$SONAR_TOKEN \
  -Dsonar.branch.name=main \
  -Dsonar.verbose=true

echo "Analysis completed." 