FROM rust:1.90-bullseye

RUN cargo install sqlx-cli --no-default-features --features postgres

WORKDIR /app
COPY migrations/run.sh /usr/local/bin/run.sh
COPY migrations ./migrations

ENTRYPOINT ["/usr/local/bin/run.sh"]
