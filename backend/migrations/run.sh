#!/bin/sh
set -e

export DATABASE_URL="postgres://${DATABASE_USER}:${DATABASE_PASSWORD}@${DATABASE_HOST}:5432/${DATABASE_NAME}"

echo "Running SQLx migrations..."
sqlx migrate run
