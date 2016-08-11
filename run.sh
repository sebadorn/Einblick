#!/usr/bin/env bash

ELECTRON=./electron/electron-v1.3.3-linux-x64/electron

cd $(dirname "$0")

"$ELECTRON" ./app/ --js-flags="--expose-gc" "$@"
