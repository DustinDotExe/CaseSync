#!/bin/bash
set -e

# Load env vars from .env (gitignored — keys never touch the repo)
set -a; source .env; set +a

FIREBASE_CONFIG_FILE="firebase.json"
FIREBASE_CONFIG_TEMP=""

if [[ -n "${VITE_FIREBASE_FIRESTORE_DATABASE_ID:-}" && "${VITE_FIREBASE_FIRESTORE_DATABASE_ID}" != "(default)" ]]; then
  FIREBASE_CONFIG_TEMP="$(mktemp)"
  FIREBASE_CONFIG_FILE="$FIREBASE_CONFIG_TEMP"
  node -e "const fs=require('fs'); const path=require('path'); const config=JSON.parse(fs.readFileSync('firebase.json','utf8')); config.firestore={...(config.firestore||{}), database: process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID, rules: path.resolve('firestore.rules'), indexes: path.resolve('firestore.indexes.json')}; fs.writeFileSync(process.argv[1], JSON.stringify(config, null, 2));" "$FIREBASE_CONFIG_FILE"
fi

cleanup() {
  if [[ -n "$FIREBASE_CONFIG_TEMP" ]]; then
    rm -f "$FIREBASE_CONFIG_TEMP"
  fi
}
trap cleanup EXIT

firebase deploy \
  --only firestore:rules \
  --project "$VITE_FIREBASE_PROJECT_ID" \
  --config "$FIREBASE_CONFIG_FILE"

gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=\
_VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY,\
_VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN,\
_VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID,\
_VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID,\
_VITE_FIREBASE_FIRESTORE_DATABASE_ID=$VITE_FIREBASE_FIRESTORE_DATABASE_ID,\
_VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET,\
_VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
