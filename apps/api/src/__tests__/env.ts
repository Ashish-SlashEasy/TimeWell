// Loaded via Jest setupFiles before the module under test imports config/env.
process.env.NODE_ENV = "test";
process.env.PORT = "0";
process.env.LOG_LEVEL = "error";
process.env.WEB_APP_URL = "http://localhost:3000";
process.env.API_PUBLIC_URL = "http://localhost:4000";
process.env.CORS_ORIGINS = "http://localhost:3000";
process.env.MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://placeholder/timewell-test";
process.env.REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? "test-access-secret-do-not-use-in-prod-aaaaaaaaaa";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? "test-refresh-secret-do-not-use-in-prod-bbbbbbbbbb";
process.env.JWT_ACCESS_TTL = "15m";
process.env.JWT_REFRESH_TTL = "7d";
process.env.BCRYPT_COST = "4";
process.env.COOKIE_DOMAIN = "";
process.env.COOKIE_SECURE = "false";
process.env.SENDGRID_API_KEY = "SG.test";
process.env.SENDGRID_FROM_EMAIL = "noreply@timewell.test";
process.env.SENDGRID_FROM_NAME = "Timewell Test";
process.env.TWILIO_ACCOUNT_SID = "ACtest";
process.env.TWILIO_AUTH_TOKEN = "test";
process.env.TWILIO_FROM_NUMBER = "+15555550100";
process.env.AWS_REGION = "us-east-1";
process.env.AWS_ACCESS_KEY_ID = "test";
process.env.AWS_SECRET_ACCESS_KEY = "test";
process.env.S3_BUCKET = "timewell-media-test";
process.env.S3_ENDPOINT = "http://localhost:4566";
process.env.S3_FORCE_PATH_STYLE = "true";
process.env.STRIPE_SECRET_KEY = "sk_test_placeholder";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_placeholder";
