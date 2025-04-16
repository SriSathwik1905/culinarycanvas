#!/bin/bash
# SonarCloud token checker and refresher

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}SonarCloud Token Checker${NC}"
echo "This script helps verify your SonarCloud token and test the connection."
echo ""

# Check if SONAR_TOKEN is set
if [ -z "$SONAR_TOKEN" ]; then
  echo -e "${RED}Error: SONAR_TOKEN environment variable is not set.${NC}"
  echo "Please set it with: export SONAR_TOKEN=your_token_here"
  echo ""
  echo "You can generate a new token at: https://sonarcloud.io/account/security"
  exit 1
fi

# Mask token for display
TOKEN_PREVIEW="${SONAR_TOKEN:0:5}...${SONAR_TOKEN: -5}"
echo -e "Current token: ${GREEN}$TOKEN_PREVIEW${NC}"

# Test SonarCloud connection
echo "Testing connection to SonarCloud..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X GET \
  "https://sonarcloud.io/api/system/status" \
  -H "Authorization: Bearer $SONAR_TOKEN")

if [ "$RESPONSE" == "200" ]; then
  echo -e "${GREEN}✓ SonarCloud service is reachable${NC}"
else
  echo -e "${RED}✗ Could not reach SonarCloud service (HTTP $RESPONSE)${NC}"
  echo "Please check your internet connection and try again."
  exit 1
fi

# Test token validity
echo "Checking token validity..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X GET \
  "https://sonarcloud.io/api/authentication/validate" \
  -H "Authorization: Bearer $SONAR_TOKEN")

if [ "$RESPONSE" == "200" ]; then
  echo -e "${GREEN}✓ Token is valid${NC}"
else
  echo -e "${RED}✗ Token validation failed (HTTP $RESPONSE)${NC}"
  echo "Your token may be invalid or expired."
  echo "Please generate a new token at: https://sonarcloud.io/account/security"
  exit 1
fi

# Check project access
echo "Checking project access..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X GET \
  "https://sonarcloud.io/api/projects/search?projects=SriSathwik1905_culinarycanvas" \
  -H "Authorization: Bearer $SONAR_TOKEN")

if [ "$RESPONSE" == "200" ]; then
  echo -e "${GREEN}✓ Project access confirmed${NC}"
else
  echo -e "${RED}✗ Could not access project (HTTP $RESPONSE)${NC}"
  echo "Your token may not have access to this project."
  echo "Make sure the token has the correct permissions."
  exit 1
fi

echo ""
echo -e "${GREEN}All checks passed! Your token appears to be working correctly.${NC}"
echo "You can now try running the SonarCloud analysis with:"
echo "bash analyze-sonar.sh"
echo ""
echo "If you're still having issues with GitHub Actions, please check README-SONARCLOUD.md for troubleshooting steps." 