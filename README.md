# Geographic Information System (GIS)

## Deploy instructions

### Server setup:

- install Nginx, Node.js, npm, Docker, Docker Compose, certbot and python3-certbot-nginx on server (if there are errors, check if they actually are the latest versions)

#### For inital deploy:

- git clone repo in home directory
- cd into the cloned repo
- in nginx-appname.conf file comment (#) the localhost line and uncomment the line with your domain
- copy and change database connection variables from .env.example to a new .env file
- run ./setup-and-deploy.sh
- setup SSL for the new app/domain
  - certbot --nginx

#### For redeploys:

- run ./redeploy.sh

#### For removing app and configuration (USE WITH CAUTION, IT DELETES EVERYTHING):

## Dokploy / Docker Compose (CI-friendly)

This repository includes a `docker-compose.dokploy.yml` that builds the backend and frontend images and a Postgres service. It's intended for use with Dokploy or any CI that can run `docker compose -f docker-compose.dokploy.yml up --build -d`.

Quick local test (requires Docker Engine):

```fish
# Build and start services in detached mode
docker compose -f docker-compose.dokploy.yml up --build -d

# Tail logs
docker compose -f docker-compose.dokploy.yml logs -f

# Stop and remove
docker compose -f docker-compose.dokploy.yml down -v
```

Environment variables:

- `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` control backend DB connection and are expected to be provided by Dokploy or set in your environment (for example in a `.env` file). Example from your `.env` shows the pattern you are using:

```properties
POSTGRES_USER=postgres
POSTGRES_PASSWORD=bazepodataka
POSTGRES_DB=postgresql://postgres:bazepodataka@restorative-practices-creative-cluster-database-sk2lhf:5432/ur-gis
```

Note: `docker-compose.dokploy.yml` intentionally does NOT create a local Postgres service. When using Dokploy, use the managed database Dokploy provides (or an external DB) and set the `SPRING_DATASOURCE_*` variables (or a full JDBC URL) appropriately.

When using Dokploy, point it at `docker-compose.dokploy.yml` so it can build and push the images, or build locally and deploy the produced images.
