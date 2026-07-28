#!/usr/bin/env python3
"""Convierte db/schema.ts de drizzle mysql-core a sqlite-core."""
import re

with open("db/schema.ts", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Imports
content = re.sub(
    r"import \{[\s\S]*?\} from \"drizzle-orm/mysql-core\";",
    'import {\n  sqliteTable,\n  text,\n  integer,\n  real,\n} from "drizzle-orm/sqlite-core";\nimport { sql } from "drizzle-orm";',
    content,
)

# 2. mysqlTable -> sqliteTable
content = content.replace("mysqlTable(", "sqliteTable(")

# 3. mysqlEnum(...) -> text(...)  (mantener nombre de columna)
content = re.sub(r"mysqlEnum\(([^)]+)\)", r"text(\1)", content)

# 4. serial("id").primaryKey() -> integer("id").primaryKey({ autoIncrement: true })
content = re.sub(
    r"serial\((\"[^\"]+\")\)\.primaryKey\(\)",
    r'integer(\1).primaryKey({ autoIncrement: true })',
    content,
)

# 5. varchar("...", { length: N }) -> text("...")
content = re.sub(r"varchar\((\"[^\"]+\"), \{ length: \d+ \}\)", r"text(\1)", content)

# 6. timestamp("...") -> integer("...", { mode: "timestamp" })
content = re.sub(r"timestamp\((\"[^\"]+\")\)", r'integer(\1, { mode: "timestamp" })', content)

# 7. int("...") -> integer("...")
content = re.sub(r"int\((\"[^\"]+\")\)", r"integer(\1)", content)

# 8. decimal("...", { precision: N, scale: M }) -> real("...")
content = re.sub(r"decimal\((\"[^\"]+\"), \{[^}]+\}\)", r"real(\1)", content)

# 9. json("...") -> text("...")
content = re.sub(r"json\((\"[^\"]+\")\)", r"text(\1)", content)

# 10. defaultNow() sobre integer timestamp -> sql`(unixepoch())`
content = content.replace('.defaultNow()', '.default(sql`(unixepoch())`)')

# 11. Booleanos: campos que usan 0/1 los convertimos a modo boolean
BOOLEAN_FIELDS = {
    'alerts': ['read'],
    'knowledgeArticles': ['isPublic'],
    'operations': ['isSuccess'],
    'prequalifications': ['hasGuarantor', 'pets', 'smoker'],
    'properties': ['hasElevator', 'hasTerrace', 'hasParking', 'hasStorage', 'hasPool', 'hasGarden', 'hasAirConditioning', 'hasHeating', 'hasFurniture'],
    'operationChecklist': ['checked'],
}

# Aplicar conversión de integer("field").default(0) a integer("field", { mode: "boolean" }).default(false)
for table, fields in BOOLEAN_FIELDS.items():
    for field in fields:
        pattern = rf'integer\("{field}"\)(\.default\(0\))?'
        repl = f'integer("{field}", {{ mode: "boolean" }}).default(false)'
        content = re.sub(pattern, repl, content)

with open("db/schema.ts", "w", encoding="utf-8") as f:
    f.write(content)

print("schema.ts convertido a sqlite-core")
