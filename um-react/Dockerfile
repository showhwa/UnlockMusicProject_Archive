FROM node:22-slim AS build
ENV PNPM_HOME="/p"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app

RUN corepack enable pnpm \
    && apt-get update \
    && apt-get install -y --no-install-recommends git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm exec true
COPY . .
RUN pnpm install --frozen-lockfile

ARG GIT_COMMIT=
ARG GIT_COMMIT_FULL=

RUN pnpm build

FROM caddy:latest
COPY --from=build /app/dist /srv/um-react
EXPOSE 80
CMD ["caddy", "file-server", "--root", "/srv/um-react"]
