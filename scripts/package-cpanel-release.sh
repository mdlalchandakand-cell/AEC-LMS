#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
OUTPUT_DIR="${1:-$ROOT_DIR/release}"
PACKAGE_NAME="aloms-english-center-cpanel"
STAGING_DIR="$(mktemp -d)"
trap 'rm -rf "$STAGING_DIR"' EXIT

if [[ ! -f "$DIST_DIR/index.html" || ! -f "$DIST_DIR/.htaccess" ]]; then
  echo "ERROR: Production frontend is missing. Run the production build first." >&2
  exit 1
fi

for required in api database scripts storage docs/CPANEL-DEPLOYMENT.md docs/RELEASE-READINESS-AUDIT.md docs/COMMERCIAL-RELEASE-BLOCKERS.md; do
  [[ -e "$ROOT_DIR/$required" ]] || { echo "ERROR: Required release path is missing: $required" >&2; exit 1; }
done

mkdir -p "$OUTPUT_DIR"
OUTPUT_DIR="$(cd "$OUTPUT_DIR" && pwd)"
cp -a "$DIST_DIR/." "$STAGING_DIR/"
for required in api database scripts storage; do
  cp -a "$ROOT_DIR/$required" "$STAGING_DIR/$required"
done
mkdir -p "$STAGING_DIR/docs"
for guide in CPANEL-DEPLOYMENT.md RELEASE-READINESS-AUDIT.md COMMERCIAL-RELEASE-BLOCKERS.md; do
  cp "$ROOT_DIR/docs/$guide" "$STAGING_DIR/docs/$guide"
done
cp "$ROOT_DIR/README.md" "$STAGING_DIR/PROJECT-README.md"

cat > "$STAGING_DIR/CPANEL-ENVIRONMENT.example" <<'EOF'
# Configure these values on the server; never commit real credentials.
AEC_DB_HOST=localhost
AEC_DB_PORT=3306
AEC_DB_NAME=your_cpanel_database
AEC_DB_USER=your_cpanel_database_user
AEC_DB_PASS=replace_with_a_unique_database_password
AEC_APP_URL=https://your-domain.example
AEC_MAIL_FROM=no-reply@your-domain.example
EOF

cat > "$STAGING_DIR/INSTALL-NOTES.txt" <<'EOF'
ALOM'S ENGLISH CENTER — CPANEL RELEASE PACKAGE
This package contains the built React frontend, real PHP API, database migrations,
CLI scripts and protected storage rules.
IMPORTANT:
- There is no browser-based /install wizard in this release.
- Do not import an old schema.sql or run DROP TABLE statements.
- Back up any existing database before deployment or upgrade.
- Follow docs/CPANEL-DEPLOYMENT.md in full.
- Configure AEC_DB_* environment variables before running migrations.
- Run from cPanel Terminal/SSH: php scripts/migrate.php --status
  then --dry-run, review output, and only then php scripts/migrate.php.
- Create the first administrator with php scripts/create-admin.php.
  Delete scripts/create-admin.php from the hosting account after use.
- Keep storage/private/.htaccess and nested private-storage deny rules.
- This ZIP does not prove every release gate or a clean cPanel rehearsal passed.
EOF

COMMIT_SHA="${GITHUB_SHA:-$(git -C "$ROOT_DIR" rev-parse HEAD 2>/dev/null || echo unknown)}"
printf 'Product: Alom\x27s English Center LMS\nCommit: %s\nBuilt: %s\n' "$COMMIT_SHA" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$STAGING_DIR/RELEASE-MANIFEST.txt"

# Never ship local secrets, VCS metadata, dependencies, logs or caches.
find "$STAGING_DIR" -type f \( -name '.env' -o -name '.env.*' -o -name '*.log' \) -delete
find "$STAGING_DIR" -type d \( -name '.git' -o -name 'node_modules' -o -name '.cache' \) -prune -exec rm -rf {} +

test -f "$STAGING_DIR/index.html"
test -f "$STAGING_DIR/.htaccess"
test -f "$STAGING_DIR/api/_bootstrap.php"
test -f "$STAGING_DIR/scripts/migrate.php"
test -f "$STAGING_DIR/storage/private/.htaccess"
test -d "$STAGING_DIR/database/migrations"
find "$STAGING_DIR/database/migrations" -maxdepth 1 -type f -name '*.sql' | grep -q .
if find "$STAGING_DIR" -type f \( -name '.env' -o -name '.env.*' \) | grep -q .; then
  echo "ERROR: Environment file detected in release staging directory." >&2
  exit 1
fi

rm -f "$OUTPUT_DIR/$PACKAGE_NAME.zip"
(cd "$STAGING_DIR" && zip -qr "$OUTPUT_DIR/$PACKAGE_NAME.zip" .)
echo "Created $OUTPUT_DIR/$PACKAGE_NAME.zip"
