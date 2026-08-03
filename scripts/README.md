# Operations scripts

Run these POSIX shell scripts from an Ubuntu VPS after creating `.env.production`:

- `preflight.sh`: validates Docker, required secrets, hostname syntax, free space, and Compose.
- `deploy.sh`: runs preflight, builds/starts the stack, waits for health, and prints service state.
- `seed-production.sh`: explicitly runs the idempotent sample/admin/customer seed. It requires
  `SEED_CONFIRM=commerce` because seeded account passwords are reset on every execution.
- `backup.sh`: writes a private PostgreSQL custom-format dump and SHA-256 sidecar to `backups/` or
  `$BACKUP_DIRECTORY`.
- `restore.sh`: verifies a sidecar when present, stops application traffic, replaces database
  objects, reapplies migrations, and health-checks the restarted stack. It requires
  `RESTORE_CONFIRM=commerce`.

Make the scripts executable once with `chmod 750 scripts/*.sh`. Store backups encrypted and
off-server; a backup on the same VPS is not disaster recovery.
