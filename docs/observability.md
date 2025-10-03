# Observability Playbook

## Sentry (APM + Replay)
- Configure `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` in Vercel -> Project Settings -> Environment Variables.
- Optional tuning knobs:
  - `SENTRY_TRACES_SAMPLE_RATE` / `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` (defaults to `0.1`).
  - `SENTRY_PROFILES_SAMPLE_RATE` to enable CPU profiling for server spans.
  - `NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE` / `NEXT_PUBLIC_SENTRY_REPLAYS_ERROR_SAMPLE_RATE` to control Session Replay volume.
- Typical rollout: `vercel env pull` -> `npm run build` (validates source-map upload via the Sentry webpack plugin).

## LogRocket (Frontend Session Logging)
- Set `NEXT_PUBLIC_LOGROCKET_APP_ID` from the LogRocket workspace.
- Toggle capture with `NEXT_PUBLIC_LOGROCKET_ENABLED=true|false`.
- Session URLs are attached to each Sentry event under the `logrocket_session_url` tag once LogRocket initializes.

## Cloudflare Workers / R2
- Tail edge/runtime logs: `pwsh scripts/cloudflare-tail.ps1 -Service <worker-name> -Environment production`.
  - Supplying `CLOUDFLARE_WORKER_NAME` and `CLOUDFLARE_ENVIRONMENT` env vars makes the command zero-arg.
- Cache busting checklist for R2 assets:
  - Ensure Next.js build emits hashed filenames (default in production builds).
  - After upload: `wrangler r2 object put <bucket>/<path> --http-metadata cache-control="public, max-age=31536000, immutable"`.
- Logpush pipeline:
  1. Cloudflare Dashboard -> R2 -> Analytics -> enable Logpush to R2 or BigQuery.
  2. Point BI tooling at the delivery bucket/table for long-term investigations.

## MongoDB Atlas
- Enable Performance Advisor (Atlas -> Cluster -> Performance Advisor) to receive index guidance.
- Ad-hoc profiling via `mongosh`:
  ```sh
  mongosh "<cluster-connection-string>" --eval "db.setProfilingLevel(1)"
  ```
  Reset with `db.setProfilingLevel(0)` after debugging.
- When returning API responses, include request identifiers so Sentry breadcrumbs can link HTTP spans to Mongo queries.

## Deployment Flow
1. Update environment variables, then `vercel env pull` to sync locally.
2. `npm run build` locally to verify Sentry/LogRocket hooks.
3. Deploy (`npm run deploy` or existing CI) once the build succeeds.
4. Monitor rollout with Cloudflare tail, `vercel logs`, and the Sentry Issues/Performance dashboards.