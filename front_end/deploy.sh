#!/bin/bash

# ─── VISTA Frontend Deployment to GCP Cloud Run ───
# Run this from the frontendmahima/ directory

# Set your project ID (same GCP project as your translation API)
PROJECT_ID="translation-api-project"  # ← change this to your actual project ID
REGION="us-central1"
SERVICE_NAME="vista-frontend"

# 1. Set the project
echo "Setting GCP project..."
gcloud config set project $PROJECT_ID

# 2. Build and push using Cloud Build (no local Docker needed)
echo "Building and deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --port 8080 \
  --allow-unauthenticated \
  --memory 256Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --set-env-vars="NODE_ENV=production"

echo ""
echo "✅ Deployment complete!"
echo "Your VISTA frontend is live at the URL shown above."
echo ""
echo "Your translation API remains at:"
echo "https://translation-api-1050963407386.us-central1.run.app"