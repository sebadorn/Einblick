#!/usr/bin/env bash

# This script will remove all "Einblick" related files and directories, which are:
# 1. /usr/share/Einblick
# 2. /usr/bin/Einblick
# 3. /usr/share/applications/Einblick.desktop
# 4. $HOME/.config/Einblick

PROJECT_NAME=Einblick

cd $(dirname "$0")

echo ""
echo "  This script will remove $PROJECT_NAME from the system."
echo "  ------------------------------------------------------"

if [ "$(id -u)" != "0" ]; then
	echo "  This script must be run as root: sudo ./uninstall.sh" 1>&2
	echo ""
	exit 1
fi

if [ -z "$PROJECT_NAME" ]; then
	echo "  No project name set!" 1>&2
	echo ""
	exit 1
fi

printf "  1. Removing /usr/share/Einblick/ ..."
rm -r /usr/share/Einblick
echo " Done."

printf "  2. Removing executable /usr/bin/Einblick ..."
rm /usr/bin/Einblick
echo " Done."

printf "  3. Removing Einblick.desktop in /usr/share/applications/ ..."
rm /usr/share/applications/Einblick.desktop
echo " Done."

printf "  4. Removing electron data in $HOME/.config/$PROJECT_NAME ..."
rm -r "$HOME/.config/$PROJECT_NAME"
echo " Done."

echo "  ---------------------------------------"
echo "  The removale has finished!"
echo ""
