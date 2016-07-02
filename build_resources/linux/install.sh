#!/usr/bin/env bash

# This script will install "Einblick":
#
# 1. /usr/share/Einblick
# 2. /usr/bin/Einblick
#
# electron will automatically create a data directory
# in $HOME/.config/Einblick whenever it is started.

PROJECT_NAME=Einblick

cd $(dirname "$0")

echo ""
echo "  This script will install $PROJECT_NAME."
echo "  ---------------------------------------"

if [ "$(id -u)" != "0" ]; then
	echo "  This script must be run as root: sudo ./install.sh" 1>&2
	echo ""
	exit 1
fi

if [ -z "$PROJECT_NAME" ]; then
	echo "  No project name set!" 1>&2
	echo ""
	exit 1
fi

if [ ! -d /usr/share/ ]; then
	echo "  Directory /usr/share/ not found. Cancelling installation."
	echo ""
	exit
fi

if [ ! -d /usr/bin/ ]; then
	echo "  Directory /usr/bin/ not found. Cancelling installation."
	echo ""
	exit
fi

printf "  1. Moving files to /usr/share/Einblick/ ..."
mkdir -p /usr/share/Einblick
cp -R ../Einblick /usr/share/
chmod 0755 /usr/bin/Einblick/resources
chmod 0755 /usr/bin/Einblick/locales
echo " Done."

printf "  2. Create executable in /usr/bin/Einblick ..."
cp ./Einblick /usr/bin/Einblick
echo " Done."

printf "  3. Create Einblick.desktop in /usr/share/applications/ ..."
if [ -d /usr/share/applications ]; then
	cp ./Einblick.desktop /usr/share/applications
	echo " Done."
else
	echo ""
	echo "    - No such directory: /usr/share/applications/. Skipping step."
fi

echo "  ---------------------------------------"
echo "  The installation has finished!"
echo ""
