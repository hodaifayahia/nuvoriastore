# Deploying the Telegram bot (Supabase)

Vercel only builds the website. The Telegram bot (`telegram-bot`), the
notification function (`telegram-notify`) and the new-order trigger live in
Supabase project `gppdjfjvceciejnyzxem` and must be deployed there.

## One-time manual deploy

```bash
supabase login
supabase functions deploy telegram-bot --project-ref gppdjfjvceciejnyzxem --no-verify-jwt
supabase functions deploy telegram-notify --project-ref gppdjfjvceciejnyzxem --no-verify-jwt
supabase functions deploy telegram-set-webhook --project-ref gppdjfjvceciejnyzxem
psql "<DB connection string>" -f supabase/migrations/20261008100000_telegram_notify_all_orders.sql
```

(Or paste the migration file into Supabase Dashboard → SQL Editor and run it.)

Then open the site → Admin → Settings → Telegram, check the bot token and
chat IDs, enable notifications, and press **ربط الويب هوك** (set webhook).
That re-points Telegram to this project's `telegram-bot`, so the bot reads
the same orders as the website.

## Automatic deploy on every push to main (optional)

Add repository secrets `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_URL`, then
create `.github/workflows/supabase-deploy.yml` with:

```yaml
name: Deploy Supabase (Telegram bot + notifications)

# Vercel only deploys the website. The Telegram bot and the new-order trigger
# live in Supabase, so they are deployed here on every push to main.
#
# Required repository secrets (Settings → Secrets and variables → Actions):
#   SUPABASE_ACCESS_TOKEN  personal access token from supabase.com/dashboard/account/tokens
#   SUPABASE_DB_URL        Postgres connection string of project gppdjfjvceciejnyzxem
#                          (Project Settings → Database → Connection string → URI)

on:
  push:
    branches: [main]
    paths:
      - "supabase/**"
      - ".github/workflows/supabase-deploy.yml"
  workflow_dispatch:

env:
  PROJECT_REF: gppdjfjvceciejnyzxem
  SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
  SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_URL }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Deploy Telegram edge functions
        if: ${{ env.SUPABASE_ACCESS_TOKEN != '' }}
        run: |
          supabase functions deploy telegram-bot --project-ref "$PROJECT_REF" --no-verify-jwt
          supabase functions deploy telegram-notify --project-ref "$PROJECT_REF" --no-verify-jwt
          supabase functions deploy telegram-set-webhook --project-ref "$PROJECT_REF"

      - name: Apply Telegram notification migration
        if: ${{ env.SUPABASE_DB_URL != '' }}
        run: |
          sudo apt-get install -y postgresql-client >/dev/null
          psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20261008100000_telegram_notify_all_orders.sql

      - name: Missing secrets
        if: ${{ env.SUPABASE_ACCESS_TOKEN == '' || env.SUPABASE_DB_URL == '' }}
        run: echo "::warning::Add SUPABASE_ACCESS_TOKEN and SUPABASE_DB_URL repository secrets to deploy the Telegram bot automatically."
```

## Vercel deploys

Vercel builds the site from `main`. Do not connect Vercel Storage
integrations (Supabase/Neon) to the `nuvoriastore` project: the site reads
its Supabase project from `.env`, and if a connected integration's database
gets paused, Vercel refuses every deployment before the build even starts
("One or more integration resources failed to provision").
