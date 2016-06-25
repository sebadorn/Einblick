#!/usr/bin/env bash

cd $(dirname "$0")

git submodule update --init --recursive

cd pdf.js
git checkout master
git pull
gulp generic
cd ..

cp pdf.js/build/generic/build/pdf.js app/js/
cp pdf.js/build/generic/build/pdf.worker.js app/js/

chmod +x build.sh
chmod +x run.sh
