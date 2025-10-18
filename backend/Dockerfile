FROM rust:1.82-bullseye as builder

WORKDIR /app

COPY Cargo.toml Cargo.lock ./

RUN mkdir src && echo "fn main() {}" > src/main.rs

RUN cargo build --release || true

COPY . .
RUN cargo build --release

FROM debian:bookworm-slim AS runtime

RUN apt-get update && apt-get install -y ca-certificates tzdata && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/target/release/strava_analyser /usr/local/bin/strava_analyser

ENV PORT=8080
EXPOSE 8080

ENV RUST_LOG=info

CMD ["strava_analyser"]
