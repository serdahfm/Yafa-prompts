#!/bin/zsh
set -euo pipefail

echo "YAFA-ms: AWS profile setup (break-glass)"

if ! command -v aws >/dev/null 2>&1; then
  echo "awscli not found. Installing with Homebrew..."
  if ! command -v brew >/dev/null 2>&1; then
    echo "Homebrew is required. Install from https://brew.sh and re-run." >&2
    exit 1
  fi
  brew install awscli
fi

read -r "?AWS profile name [yafa-break-glass]: " AWS_PROFILE_NAME
AWS_PROFILE_NAME=${AWS_PROFILE_NAME:-yafa-break-glass}

read -r "?AWS region [us-east-1]: " AWS_REGION
AWS_REGION=${AWS_REGION:-us-east-1}

echo -n "Enter AWS Access Key ID: "
read -rs AWS_ACCESS_KEY_ID
echo
echo -n "Enter AWS Secret Access Key: "
read -rs AWS_SECRET_ACCESS_KEY
echo

aws configure set aws_access_key_id "$AWS_ACCESS_KEY_ID" --profile "$AWS_PROFILE_NAME"
aws configure set aws_secret_access_key "$AWS_SECRET_ACCESS_KEY" --profile "$AWS_PROFILE_NAME"
aws configure set region "$AWS_REGION" --profile "$AWS_PROFILE_NAME"

echo "Verifying credentials (STS)..."
AWS_PROFILE="$AWS_PROFILE_NAME" aws sts get-caller-identity >/dev/null
echo "Profile '$AWS_PROFILE_NAME' configured for region '$AWS_REGION'."
echo "To use it in this shell: export AWS_PROFILE=$AWS_PROFILE_NAME"



