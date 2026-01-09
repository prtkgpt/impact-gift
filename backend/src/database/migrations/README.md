# Database Migrations

This directory contains SQL migration files that are automatically applied to the database on deployment.

## How It Works

1. **Automatic Execution**: Migrations run automatically before each deployment via `preDeployCommand` in `render.yaml`
2. **Tracking**: A `migrations` table tracks which migrations have been applied
3. **Alphabetical Order**: Migrations are applied in alphabetical order (use naming like `001_description.sql`, `002_description.sql`)
4. **Idempotent**: Each migration runs only once; already-applied migrations are skipped
5. **Transactional**: Each migration runs in a transaction - if it fails, changes are rolled back

## Running Migrations

### Production (Automatic)
Migrations run automatically on Render deployment via:
```bash
npm run migrate:prod
```

### Development (Manual)
```bash
npm run migrate
```

## Creating a New Migration

1. Create a new `.sql` file in this directory
2. Name it with a prefix for ordering (e.g., `003_add_new_feature.sql`)
3. Write your SQL changes
4. Commit and push - it will run automatically on next deployment

## Migration Files

- `phase1.sql` - Initial database schema
- `add_rsvp.sql` - RSVP functionality columns
- `add_guest_list_visibility.sql` - Guest list privacy toggle

## Best Practices

- Always use `IF NOT EXISTS` or `IF EXISTS` to make migrations idempotent
- Test migrations locally first
- Keep migrations small and focused
- Never edit a migration that has already been applied to production
- Use transactions for data changes
