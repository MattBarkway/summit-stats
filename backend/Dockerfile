FROM rust:1.90-bullseye AS builder

WORKDIR /app

COPY Cargo.toml Cargo.lock ./

COPY .sqlx .sqlx
COPY . .

ENV SQLX_OFFLINE="true"
RUN cargo build --release

FROM debian:bullseye-slim AS runtime

RUN apt-get update && apt-get install -y \
    ca-certificates \
    tzdata \
    libssl1.1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/target/release/strava_analyser /usr/local/bin/strava_analyser

ENV PORT=8080
EXPOSE 8080

ENV RUST_LOG=info

CMD ["strava_analyser"]
