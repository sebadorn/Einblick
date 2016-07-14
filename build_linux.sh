#!/usr/bin/env bash

BUILD_DIR=./build/linux
ELECTRON=./electron/electron-v1.2.7-linux-x64
PLATFORM=linux
PROJECT_NAME=Einblick

cd $(dirname "$0")

echo ""
echo "  Building $PROJECT_NAME for $PLATFORM ..."
echo "  ----------------------------------------"

if [ ! -d "build/$PLATFORM" ]; then
	mkdir -p "build/$PLATFORM"
fi


# Delete old build.
if [ -d "build/$PLATFORM/$PROJECT_NAME" ]; then
	printf "  - Delete old build ..."
	rm -r "build/$PLATFORM/$PROJECT_NAME"
	echo " Done."
fi


# Copy electron.
printf "  - Copying electron ..."
cp -r "$ELECTRON" "$BUILD_DIR/$PROJECT_NAME"
echo " Done."


# Copy app directory and files for start.

printf "  - Copying app directory into electron ..."

cp -r app "$BUILD_DIR/$PROJECT_NAME/resources/"

cp "build_resources/$PLATFORM/Einblick.desktop" "$BUILD_DIR/$PROJECT_NAME"
chmod +x "$BUILD_DIR/$PROJECT_NAME/Einblick.desktop"

cp "build_resources/$PLATFORM/Einblick" "$BUILD_DIR/$PROJECT_NAME"
chmod +x "$BUILD_DIR/$PROJECT_NAME/Einblick"

cp "build_resources/$PLATFORM/install.sh" "$BUILD_DIR/$PROJECT_NAME"
chmod +x "$BUILD_DIR/$PROJECT_NAME/install.sh"

cp "build_resources/$PLATFORM/uninstall.sh" "$BUILD_DIR/$PROJECT_NAME"
chmod +x "$BUILD_DIR/$PROJECT_NAME/uninstall.sh"

echo " Done."


echo "  ----------------------------------------"
echo "  All done."
echo ""
