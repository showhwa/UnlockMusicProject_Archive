#!/bin/bash

if [[ ! "$GITHUB_REF" =~ ^refs/tags/ ]]; then
    echo "skip package publish, pack only."
    pnpm pack
    exit 0
fi

echo '//git.unlock-music.dev/api/packages/um/npm/:_authToken=${NPM_TOKEN}' > $HOME/.npmrc
pnpm publish --access=public --no-git-checks
