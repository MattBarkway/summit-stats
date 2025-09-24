# 1. Build stage
FROM rust AS builder

WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src

RUN cargo build --release

FROM debian:bookworm-slim

WORKDIR /app

COPY --from=builder /app/target/release/strava_analyser ./strava_analyser

EXPOSE 8000

CMD ["./strava_analyser"]
