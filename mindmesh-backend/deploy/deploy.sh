#!/bin/bash
set -euo pipefail

# --- Configuration ---
REGION="eu-central-1"
ACCOUNT_ID="675492141713"
REPO_NAME="mindmesh"
FUNCTION_NAME="MindMeshFastAPI"
ROLE_NAME="MindMeshLambdaRole"
IMAGE_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_NAME}:latest"
MEMORY=3008   # MB – SPECTER model needs ~2.5 GB
TIMEOUT=300   # seconds – cold starts load ML models

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"

cd "$PROJECT_ROOT"

# ---------------------------------------------------------------------------
# Read .env as KEY=value (one line per var; ignores blank lines and # comments)
# Build JSON for Lambda via Python so JWT/special chars are escaped safely
# ---------------------------------------------------------------------------
ENV_VARS=$(ENV_FILE="$ENV_FILE" python3 - <<'PY'
import json, os
from pathlib import Path

path = Path(os.environ["ENV_FILE"])
if not path.is_file():
    raise SystemExit(f"Missing env file: {path}")

data = {}
for raw in path.read_text(encoding="utf-8").splitlines():
    line = raw.strip().rstrip("\r")
    if not line or line.startswith("#"):
        continue
    if "=" not in line:
        continue
    k, v = line.split("=", 1)
    data[k.strip()] = v.strip()

required = (
    "SUPABASE_URL",
    "SUPABASE_KEY",
    "GOOGLE_CLIENT_ID",
    "JWT_SECRET",
    "FEATHERLESS_API_KEY",
)
missing = [k for k in required if not data.get(k)]
if missing:
    raise SystemExit(f".env missing or empty: {', '.join(missing)}")

print(json.dumps({"Variables": {k: data[k] for k in required}}))
PY
)

# ---------------------------------------------------------------------------
# 1. ECR repository
# ---------------------------------------------------------------------------
echo "1. Ensuring ECR repository exists..."
if ! aws ecr describe-repositories --repository-names "$REPO_NAME" --region "$REGION" > /dev/null 2>&1; then
  aws ecr create-repository --repository-name "$REPO_NAME" --region "$REGION" --no-cli-pager
  echo "   Created repository: $REPO_NAME"
else
  echo "   Repository already exists."
fi

# ---------------------------------------------------------------------------
# 2. ECR login
# ---------------------------------------------------------------------------
echo "2. Logging in to ECR..."
aws ecr get-login-password --region "$REGION" | \
  docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

# ---------------------------------------------------------------------------
# 3. Build & push Docker image
# ---------------------------------------------------------------------------
echo "3. Building Docker image..."
docker build --platform linux/amd64 --provenance=false \
  -f mindmesh-backend/deploy/Dockerfile -t "$REPO_NAME" .

echo "4. Pushing image to ECR..."
docker tag "$REPO_NAME:latest" "$IMAGE_URI"
docker push "$IMAGE_URI"

# ---------------------------------------------------------------------------
# 5. IAM execution role
# ---------------------------------------------------------------------------
echo "5. Ensuring IAM execution role exists..."
ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" \
  --query 'Role.Arn' --output text 2>/dev/null) || true

if [[ -z "$ROLE_ARN" || "$ROLE_ARN" == "None" ]]; then
  TRUST_POLICY=$(cat <<'POLICY'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "lambda.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
POLICY
)
  ROLE_ARN=$(aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document "$TRUST_POLICY" \
    --query 'Role.Arn' --output text)

  aws iam attach-role-policy --role-name "$ROLE_NAME" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

  echo "   Created role – waiting for IAM propagation..."
  sleep 10
else
  echo "   Role exists: $ROLE_ARN"
fi

# ---------------------------------------------------------------------------
# 6. Create or update Lambda function
# ---------------------------------------------------------------------------
echo "6. Creating / updating Lambda function..."

if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" > /dev/null 2>&1; then
  # ---- UPDATE existing function ----
  aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --image-uri "$IMAGE_URI" \
    --region "$REGION" --no-cli-pager > /dev/null

  echo "   Waiting for code update..."
  aws lambda wait function-updated-v2 \
    --function-name "$FUNCTION_NAME" --region "$REGION"

  aws lambda update-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --memory-size "$MEMORY" \
    --timeout "$TIMEOUT" \
    --environment "$ENV_VARS" \
    --region "$REGION" --no-cli-pager > /dev/null

  echo "   Waiting for config update..."
  aws lambda wait function-updated-v2 \
    --function-name "$FUNCTION_NAME" --region "$REGION"

  echo "   Function updated."
else
  # ---- CREATE new function ----
  aws lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --package-type Image \
    --code "ImageUri=$IMAGE_URI" \
    --role "$ROLE_ARN" \
    --architectures x86_64 \
    --memory-size "$MEMORY" \
    --timeout "$TIMEOUT" \
    --environment "$ENV_VARS" \
    --region "$REGION" --no-cli-pager > /dev/null

  echo "   Waiting for function to become active..."
  aws lambda wait function-active-v2 \
    --function-name "$FUNCTION_NAME" --region "$REGION"

  echo "   Function created."
fi

# ---------------------------------------------------------------------------
# 7. Function URL (public HTTP endpoint)
# ---------------------------------------------------------------------------
echo "7. Ensuring Function URL exists..."
FUNC_URL=$(aws lambda get-function-url-config \
  --function-name "$FUNCTION_NAME" --region "$REGION" \
  --query 'FunctionUrl' --output text 2>/dev/null) || true

if [[ -z "$FUNC_URL" || "$FUNC_URL" == "None" ]]; then
  FUNC_URL=$(aws lambda create-function-url-config \
    --function-name "$FUNCTION_NAME" \
    --auth-type NONE \
    --region "$REGION" \
    --query 'FunctionUrl' --output text)

  aws lambda add-permission \
    --function-name "$FUNCTION_NAME" \
    --statement-id FunctionURLPublicAccess \
    --action lambda:InvokeFunctionUrl \
    --principal "*" \
    --function-url-auth-type NONE \
    --region "$REGION" --no-cli-pager > /dev/null 2>&1 || true

  echo "   Created Function URL: $FUNC_URL"
else
  echo "   Function URL: $FUNC_URL"
fi

# CORS on the Function URL only (FastAPI CORSMiddleware is disabled on Lambda to avoid duplicate ACAO headers)
echo "7b. Applying Function URL CORS..."
aws lambda update-function-url-config \
  --function-name "$FUNCTION_NAME" \
  --region "$REGION" \
  --cors "AllowOrigins=*,AllowMethods=*,AllowHeaders=*,MaxAge=86400" \
  --no-cli-pager > /dev/null
echo "   CORS updated."

# ---------------------------------------------------------------------------
# 8. Smoke test
# ---------------------------------------------------------------------------
echo "8. Smoke-testing the deployment..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${FUNC_URL}docs" --max-time 90) || HTTP_CODE="000"

if [[ "$HTTP_CODE" == "200" ]]; then
  echo "   Health check passed (HTTP $HTTP_CODE)"
else
  echo "   Health check returned HTTP $HTTP_CODE (cold start may take ~60s, retry manually)"
fi

echo ""
echo "=== Deployment complete ==="
echo "API:  $FUNC_URL"
echo "Docs: ${FUNC_URL}docs"
