#!/bin/bash
set -e

gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=\
_VITE_FIREBASE_API_KEY=VITE_FIREBASE_API_KEY_REMOVED,\
_VITE_FIREBASE_AUTH_DOMAIN=ai-studio-applet-webapp-db5ca.firebaseapp.com,\
_VITE_FIREBASE_PROJECT_ID=ai-studio-applet-webapp-db5ca,\
_VITE_FIREBASE_APP_ID=VITE_FIREBASE_APP_ID_REMOVED,\
_VITE_FIREBASE_FIRESTORE_DATABASE_ID=VITE_FIREBASE_FIRESTORE_DATABASE_ID_REMOVED,\
_VITE_FIREBASE_STORAGE_BUCKET=ai-studio-applet-webapp-db5ca.firebasestorage.app,\
_VITE_FIREBASE_MESSAGING_SENDER_ID=255380395379
