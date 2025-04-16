@echo off
REM Script to prepare Lambda deployment packages for Terraform on Windows

echo Preparing Lambda deployment packages for Terraform...

cd "%~dp0"

REM Prepare the enhanced health check
echo Creating enhanced health check package...
copy health-check.js index.js
powershell -Command "Compress-Archive -Path index.js,package.json -DestinationPath health-check.zip -Force"
del index.js

REM Prepare the basic health check
echo Creating basic health check package...
copy basic-health-check.js index.js
powershell -Command "Compress-Archive -Path index.js,basic-package.json -DestinationPath basic-health-check.zip -Force"
del index.js

echo Lambda packages prepared successfully!
echo  - health-check.zip: Enhanced health check for monitoring.tf
echo  - basic-health-check.zip: Basic health check for main.tf
echo.
echo You can now run 'terraform init' and 'terraform apply' 