# Deploy Secure Reader (V4.2)

Function is an anonymous public endpoint; set `verify_jwt = false` during deployment.
It uses server-only Supabase service key to read released episodes and returns <=1800 characters per request, rate-limited by `qr_consume_read_budget` (120 requests/minute per hashed visitor). The IP-derived hash is salted with `READER_RATE_SALT`, which must never appear in the frontend.

Production needs additional CDN/WAF controls because browser automation and IP spoofing through some proxies can still scrape sequential parts. Chunking is a deterrent, not DRM.

Deployment order matters: apply **migration 1 (RPC / limiter without revocation)**, deploy this Edge Function, deploy V4.2 frontend and test, then apply **migration 2 (revokes public full-text SELECT)**. Never revoke access until the Edge Function and V4.2 frontend work on Preview. No old `release_at` values are touched.
