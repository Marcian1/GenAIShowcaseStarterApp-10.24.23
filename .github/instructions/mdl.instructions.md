---
applyTo: "**/*.mdl"
---
MDL script rules:
- Header `mdl 1;` on line 1. No header means the older mdl 0: upgrade with `mxcli fmt --upgrade --header -w <file>`.
- One statement ends with `;`. Never mix mdl 0 and mdl 1 in a file.
- No `AS` keyword in attribute declarations: `Name: String(200)`.
- Make scripts re-runnable with `CREATE ... IF NOT EXISTS` / `ALTER ENTITY ... ADD ATTRIBUTE IF NOT EXISTS`; confirm with a second `exec` that changes nothing.
- Avoid `CREATE OR MODIFY` on existing elements: it rebuilds from the statement and drops anything the statement omits. Use `ALTER` to change an existing element.
- Qualify every name `Module.Element`.
- Unsure about a construct? `mxcli syntax <dotted.path>` (e.g. `microflow.create`); never invent keywords.
- Format with `mxcli fmt <file>` before showing the script to the user.
