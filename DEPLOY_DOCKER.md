# Docker Deployment

This repository can be deployed with Docker Compose.

## Files added

- `Dockerfile`: builds the Node.js + Playwright app image and installs Chromium during build.
- `docker-compose.yml`: starts the app and MySQL together.
- `.env.docker.example`: template for Docker runtime variables.

## Quick start

1. Copy the template and fill in the real values:

```powershell
Copy-Item .env.docker.example .env.docker
```

2. Start the stack:

```powershell
docker compose --env-file .env.docker up -d --build
```

3. Check status:

```powershell
docker compose ps
docker compose logs -f app
```

4. Open:

```text
http://localhost:3000
http://localhost:3000/admin
```

## Persistence

The following data is persisted:

- MySQL data in the named volume `mysql_data`
- Generated product files in `./product_files`
- Playwright debug screenshots in `./debug_screenshots`

## Notes

- The image is built from `node:20-bookworm` and installs Playwright Chromium plus required system packages during build.
- `HEADFUL=0` is recommended in Docker. Headful browser mode inside a container usually needs extra X11/VNC setup.
- The app automatically creates tables, but the MySQL database itself is created by the `mysql` container from `DB_NAME`.
- Inside Docker, the app always connects to MySQL with `DB_HOST=mysql`.

## Stop / remove

```powershell
docker compose down
docker compose down -v
```

Use `docker compose down -v` only if you also want to remove the MySQL data volume.
