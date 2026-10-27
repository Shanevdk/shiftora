# Shiftora

**Work smarter. Shift better.** Time clock, timesheets, approvals, and shift scheduling for hourly teams.

Shiftora is a Laravel 13 monolith with an Inertia v3 + React 19 + TypeScript frontend. It is styled with Tailwind v4 and shadcn/ui, bills through Laravel Cashier (Stripe), and is built to deploy on [Laravel Cloud](https://cloud.laravel.com).

## Plans

Plans, prices, seat limits and features are all defined in `config/shiftora.php`. The server enforces them through `Organization::activePlan()`, the `feature:*` / `subscribed` route middleware, and the policies.

| Plan         | Price                  | Employees | Includes                                                                             |
| ------------ | ---------------------- | --------- | ------------------------------------------------------------------------------------ |
| Starter      | $4 / employee / month  | 10        | Time clock and timesheets (no scheduling)                                            |
| Professional | $7 / employee / month  | 100       | Adds shift scheduling, drag-and-drop, approvals, reports, CSV export, overtime rules |
| Business     | $10 / employee / month | Unlimited | Adds geofenced clock-in, audit log, multiple locations, priority support             |

Every new organization gets a 90-day trial of every feature with no card required. Subscribing during the trial carries the remaining days over, so the card is first charged when the trial ends.

## Local development

```bash
composer install && npm install
cp .env.example .env && php artisan key:generate
php artisan migrate:fresh --seed   # needs a local Postgres database named "shiftora" (Herd ships one)
php artisan storage:link
composer run dev                   # app server, queue worker, and Vite
```

The seeded demo logins all use the password `password`:

| Email                  | Role     |
| ---------------------- | -------- |
| `test@example.com`     | Owner    |
| `admin@example.com`    | Admin    |
| `manager@example.com`  | Manager  |
| `employee@example.com` | Employee |

Tests run on in-memory SQLite by default. CI runs them after migrating and seeding a real Postgres database.

```bash
php artisan test --compact
composer ci:check   # lint, types, PHPStan and tests (what CI runs)
```

### Stripe (test mode)

1. Put your test keys in `.env`: `STRIPE_KEY`, `STRIPE_SECRET`.
2. Run `php artisan shiftora:stripe-setup`. It creates the three products and their per-employee monthly prices, then prints the `STRIPE_PRICE_*` lines to paste into `.env`.
3. Forward webhooks so subscriptions sync: `stripe listen --forward-to shiftora.test/stripe/webhook`. Then set `STRIPE_WEBHOOK_SECRET` to the secret the CLI prints.

## Architecture notes

- **Tenancy.** Every tenant-owned model uses `BelongsToOrganization`, a global scope keyed to the organization that `SetCurrentOrganization` resolves for the request. That middleware runs before route model binding, so a record from another organization returns 404. The policies check organization and role a second time.
- **Time clock.** Clock-in, clock-out, and breaks run in database transactions that lock rows. A partial unique index also guarantees an employee has at most one open entry.
- **Audit trail.** Employees, time entries, timesheets, and shifts log every create, update, and delete to `audit_logs`, an append-only table. Approved timesheets lock their week's entries.
- **Times.** All times are stored in UTC and shown in the organization's timezone. Overtime is calculated per pay week (`App\Support\Timesheets`).
- **Background work.** Notifications and Stripe seat syncing run as queued jobs. Shift reminders, missed clock-out alerts, and trial-ending notices are scheduled in `routes/console.php`.

## Deploying to Laravel Cloud

Laravel Cloud reads no config file from the repository. Set these values in the Cloud dashboard or with the `cloud` CLI.

1. **Create the application** from this GitHub repository, using PHP 8.4. Use a `production` environment, and add a `staging` environment to verify releases first.
2. **Attach resources** to each environment:
    - **Serverless Postgres database.** It injects `DB_*`. Use the pooled (`-pooler`) host.
    - **Object Storage, two buckets.** A private bucket as the default disk, and a **public** bucket with the disk name `public`. Organization logos are stored on the `public` disk.
    - **Managed queue.** It sets `QUEUE_CONNECTION=cloud`. `aws/aws-sdk-php` is already installed.
    - **Optional: Valkey cache.** The database cache and sessions work out of the box.
3. **Build commands:**
    ```
    composer install --no-dev --optimize-autoloader
    npm ci --audit false
    npm run build
    php artisan optimize
    ```
4. **Deploy command:** `php artisan migrate --force`. Do not add `storage:link`, `queue:restart`, or `optimize:clear`.
5. **Enable the scheduler** on the App cluster. Tasks use `onOneServer()`, so they are safe with several replicas.
6. **Environment variables.** Cloud injects the database, storage, and queue values. Set the rest yourself:
    ```
    APP_NAME=Shiftora
    APP_ENV=production
    APP_DEBUG=false
    APP_KEY=base64:...            # php artisan key:generate --show
    APP_URL=https://your-domain
    LOG_LEVEL=info
    MAIL_MAILER=...               # e.g. postmark/resend/ses credentials
    MAIL_FROM_ADDRESS=hello@your-domain
    CASHIER_CURRENCY=usd
    STRIPE_PRICE_STARTER=price_...
    STRIPE_PRICE_PROFESSIONAL=price_...
    STRIPE_PRICE_BUSINESS=price_...
    ```
    Store `STRIPE_KEY`, `STRIPE_SECRET`, and `STRIPE_WEBHOOK_SECRET` in **Secrets Manager** and attach them to the environment. Never give a secret a `VITE_` prefix, because `VITE_*` values are compiled into the browser bundle.
7. **Stripe webhook.** Add `https://your-domain/stripe/webhook` as an endpoint in the Stripe dashboard, or run `php artisan cashier:webhook` once from a Cloud command.
8. **Domain and HTTPS.** Add the custom domain in Cloud. SSL is provisioned automatically. In production the app forces `https://` URLs, and Cloud's proxy is trusted automatically.
9. **Monitoring.** Application logs and exceptions stream to the Cloud dashboard. `/up` is the health check endpoint.

After you change environment variables, secrets, or attached resources, **redeploy** for the changes to take effect.
