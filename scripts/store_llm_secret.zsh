#!/bin/zsh
set -euo pipefail

if ! command -v aws >/dev/null 2>&1; then
  echo "awscli is required. Install with Homebrew: brew install awscli" >&2
  exit 1
fi

PROFILE_MSG="Using AWS_PROFILE='${AWS_PROFILE:-default}'"
echo $PROFILE_MSG

PROVIDER=${LLM_PROVIDER:-}
if [[ -z "${PROVIDER}" ]]; then
  read -r "?LLM provider (openai|anthropic) [openai]: " PROVIDER
  PROVIDER=${PROVIDER:-openai}
fi
if [[ "$PROVIDER" != "openai" && "$PROVIDER" != "anthropic" ]]; then
  echo "Provider must be 'openai' or 'anthropic'" >&2
  exit 1
fi

KEY_INPUT=${LLM_KEY:-}
if [[ -z "${KEY_INPUT}" ]]; then
  echo -n "Enter ${(U)PROVIDER} API key (input hidden): "
  read -rs KEY_INPUT
  echo
fi
if [[ -z "$KEY_INPUT" ]]; then
  echo "Key cannot be empty" >&2
  exit 1
fi

SECRET_NAME="yafa/ms/llm/${PROVIDER}/api_key"

echo "Creating or updating secret: $SECRET_NAME"
if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" >/dev/null 2>&1; then
  aws secretsmanager put-secret-value --secret-id "$SECRET_NAME" --secret-string "$KEY_INPUT" >/dev/null
  echo "Updated secret value."
else
  aws secretsmanager create-secret --name "$SECRET_NAME" --secret-string "$KEY_INPUT" --tags Key=app,Value=yafa-ms Key=component,Value=llm Key=provider,Value=$PROVIDER >/dev/null
  echo "Created secret."
fi

echo "Done. Secret stored in AWS Secrets Manager under: $SECRET_NAME"
echo "Next: I will wire the backend to read this secret via task role and enable rotation in a follow-up step."


