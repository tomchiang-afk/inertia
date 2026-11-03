#!/usr/bin/env bash
# Local Play upload key. The keystore and passwords stay gitignored.
# Production CI can instead set INERTIA_KEYSTORE / INERTIA_KEYSTORE_PASSWORD /
# INERTIA_KEY_ALIAS / INERTIA_KEY_PASSWORD in the environment.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROPS="$ROOT/android/keystore.properties"
STORE="$ROOT/android/app/keystore/inertia-upload.jks"

if [ -f "$PROPS" ] && [ -f "$STORE" ]; then
  echo "upload keystore already exists: $STORE"
  exit 0
fi

JAVA_HOME="${JAVA_HOME:-$HOME/android-sdk/jdk-17}"
KEYTOOL="$JAVA_HOME/bin/keytool"
[ -x "$KEYTOOL" ] || KEYTOOL="$(command -v keytool)"

mkdir -p "$(dirname "$STORE")"
PASS="$(openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | head -c 28)"
ALIAS="inertia-upload"

"$KEYTOOL" -genkeypair \
  -keystore "$STORE" \
  -alias "$ALIAS" \
  -keyalg RSA \
  -keysize 4096 \
  -validity 10000 \
  -storepass "$PASS" \
  -keypass "$PASS" \
  -dname "CN=Inertia Upload, O=Inertia, C=TW"

cat > "$PROPS" <<PROPS
storeFile=keystore/inertia-upload.jks
storePassword=$PASS
keyAlias=$ALIAS
keyPassword=$PASS
PROPS
chmod 600 "$PROPS"
echo "created $STORE and $PROPS"
