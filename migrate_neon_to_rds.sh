#!/bin/bash
# MobilityGrid — Neon → AWS RDS Migration
# FILL IN RDS_HOST and RDS_PASS below, then: bash migrate_neon_to_rds.sh
set -e

NEON_URL="postgresql://neondb_owner:npg_YKhJs2ARjO3l@ep-lingering-fog-aob8kr0a-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

RDS_HOST=""       # e.g. mg-production-db.xxxx.ap-south-1.rds.amazonaws.com
RDS_DB="mgdb"
RDS_USER="mgadmin"
RDS_PASS=""       # your RDS master password

# ─────────────────────────────────────────────────────────────────────────────
if [ -z "$RDS_HOST" ] || [ -z "$RDS_PASS" ]; then
  echo "❌  Fill in RDS_HOST and RDS_PASS at the top of this script first"
  exit 1
fi

RDS_URL="postgresql://${RDS_USER}:${RDS_PASS}@${RDS_HOST}:5432/${RDS_DB}?sslmode=require"
DUMP="/tmp/mg_neon_$(date +%Y%m%d_%H%M%S).sql"

echo "🔵  Step 1/3 — Dumping Neon DB..."
pg_dump "$NEON_URL" --no-owner --no-acl --schema=public -F p -f "$DUMP"
echo "✅  Dump: $DUMP  ($(du -sh $DUMP | cut -f1))"

echo ""
echo "🔵  Step 2/3 — Restoring to RDS..."
PGPASSWORD="$RDS_PASS" psql "$RDS_URL" -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;" -q
PGPASSWORD="$RDS_PASS" psql "$RDS_URL" -f "$DUMP" -q
echo "✅  Restore complete"

echo ""
echo "🔵  Step 3/3 — Row counts..."
PGPASSWORD="$RDS_PASS" psql "$RDS_URL" -c \
  "SELECT tablename, n_live_tup AS rows FROM pg_stat_user_tables WHERE schemaname='public' ORDER BY tablename;"

echo ""
echo "══════════════════════════════════════════════════"
echo "✅  DONE — Update Render with this DATABASE_URL:"
echo ""
echo "  postgresql://${RDS_USER}:${RDS_PASS}@${RDS_HOST}:5432/${RDS_DB}?sslmode=require"
echo "══════════════════════════════════════════════════"
