FROM rust

ENV CARGO_HOME=/h
WORKDIR /c

COPY src /c/src/
COPY build.rs Cargo.toml Cargo.lock /c/
RUN cargo build --bin builder --release

CMD gzip < target/release/builder | base64
