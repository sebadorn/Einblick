#!/usr/bin/env bash

cd $(dirname "$0")

git submodule update --init --recursive

cd pdf.js
gulp generic
cd ..

cp pdf.js/build/generic/build/pdf.js app/js/
cp pdf.js/build/generic/build/pdf.worker.js app/js/
cp pdf.js/web/compatibility.js app/js/

chmod +x build.sh
chmod +x run.sh
