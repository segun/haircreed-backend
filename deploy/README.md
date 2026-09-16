# Haircreed database deployment

Haircreed uses an existing MySQL 8 and Redis installation. Do not run this
directory's Compose stack on a host where those shared services are already
running. `deploy.sh` therefore leaves Compose disabled unless
`AUTO_START_DOCKER_SERVICES=true` is explicitly set.

## One-time database provisioning

Run these statements using a privileged account on the existing MySQL server.
Replace the username and password with the application credentials in `.env`.

```sql
CREATE DATABASE IF NOT EXISTS `haircreed`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'haircreed'@'%' IDENTIFIED BY 'replace-me';
GRANT ALL PRIVILEGES ON `haircreed`.* TO 'haircreed'@'%';
FLUSH PRIVILEGES;
```

If Haircreed shares the existing application user, omit `CREATE USER` and grant
that user access to `haircreed` instead.

## Application configuration

Add the `DB_*` and `REDIS_*` variables shown in `.env.example`. `DB_NAME` is the
separate Haircreed database; the host and port point to the existing services.

Create or update all tables with:

```bash
yarn migration:run
```

The migration is idempotent and is also run by `deploy/deploy.sh` before the
application restarts.