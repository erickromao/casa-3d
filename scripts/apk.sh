#!/usr/bin/env bash
# Gera o APK debug (android/app/build/outputs/apk/debug/app-debug.apk). Precisa de JDK 21 e do Android SDK.
set -e
cd "$(dirname "$0")/.."
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
if [ -z "$JAVA_HOME" ] || ! "$JAVA_HOME/bin/java" -version 2>&1 | grep -q '"21'; then
  J=$(ls -d "$HOME"/.local/share/mise/installs/java/*21* /usr/lib/jvm/java-21* 2>/dev/null | head -1)
  [ -n "$J" ] && export JAVA_HOME="$J"
fi
echo "JAVA_HOME=$JAVA_HOME"
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
npx vite build
npx cap sync android
(cd android && ./gradlew assembleDebug)
ls -lh android/app/build/outputs/apk/debug/app-debug.apk
