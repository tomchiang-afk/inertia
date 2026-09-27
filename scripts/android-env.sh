#!/usr/bin/env bash
# Source this file:  source scripts/android-env.sh
# Box has Debian trixie (no openjdk-17 in main repos) → Temurin 17 from Adoptium apt.
if [ -d /usr/lib/jvm/temurin-17-jdk-amd64 ]; then
  export JAVA_HOME=/usr/lib/jvm/temurin-17-jdk-amd64
elif [ -d /usr/lib/jvm/java-17-openjdk-amd64 ]; then
  export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
fi
export ANDROID_HOME="${ANDROID_HOME:-$HOME/android-sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/34.0.0:$PATH"
