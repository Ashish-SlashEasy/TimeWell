#!/bin/bash
# Initialize LocalStack S3 bucket for local dev
awslocal s3 mb s3://timewell-media-local || true
awslocal s3api put-bucket-cors --bucket timewell-media-local --cors-configuration '{
  "CORSRules": [{
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }]
}'
echo "LocalStack S3 bucket ready: timewell-media-local"
