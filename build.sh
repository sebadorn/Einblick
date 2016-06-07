#!/usr/bin/env bash

ELECTRON=./electron/electron-v1.2.1-linux-x64

cd $(dirname "$0")

if [ ! -d ./build ]; then
	mkdir ./build
fi


