#!/usr/bin/env python3
"""Convierte db/schema.ts de SQLite a PostgreSQL de forma robusta."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
schema = ROOT / "db" / "schema.ts"
content = schema.read_text()

# Imports
content = re.sub(
    r'import\s*\{[^}]*\}\s*from\s*"drizzle-orm/sqlite-core";',
    'import {\n  pgTable,\n  serial,\n  integer,\n  text,\n  real,\n  boolean,\n  timestamp,\n} from "drizzle-orm/pg-core";\nimport { sql } from "drizzle-orm";',
    content,
)

# sqliteTable -> pgTable
content = content.replace("sqliteTable(", "pgTable(")

# id autoincrement -> serial
content = re.sub(
    r'integer\("id"\)\.primaryKey\(\{ autoIncrement: true \}\)',
    'serial("id").primaryKey()',
    content,
)

# integer timestamp -> timestamp
content = re.sub(
    r'integer\("([^"]+)"\, \{ mode: "timestamp" \}\)',
    r'timestamp("\1", { withTimezone: true })',
    content,
)

# integer boolean -> boolean
content = re.sub(
    r'integer\("([^"]+)"\, \{ mode: "boolean" \}\)',
    r'boolean("\1")',
    content,
)

# unixepoch default -> defaultNow
content = re.sub(
    r'\.default\(sql`\(unixepoch\(\)\)`\)',
    ".defaultNow()",
    content,
)

# text enum antiguo -> text enum nuevo
content = re.sub(
    r'text\("([^"]+)"\, \[([^\]]+)\]\)',
    r'text("\1", { enum: [\2] })',
    content,
)

# randomblob default -> gen_random_uuid (sólo para unionId)
content = content.replace(
    'sql`(lower(hex(randomblob(16))))`',
    'sql`lower(gen_random_uuid()::text)`',
)

schema.write_text(content)
print("Converted", schema)
