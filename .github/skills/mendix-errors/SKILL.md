---
name: mendix-errors
description: Diagnose Mendix and mxcli errors - CE/CW build codes, MDL/MPR lint codes, parse errors, reference-not-found, forward references - and fix them. Use whenever check, exec, lint, docker check or Studio Pro reports a code.
---
# Fixing errors

1. Get the code. `mxcli help <code>` explains an MDL code; `mxcli syntax errors` lists common validation errors and fixes.
2. Re-run the smallest thing that reproduces it: `mxcli check script.mdl -p app.mpr`. Fix the first error only, then re-check (later errors are often consequences).
3. Do not edit the `.mpr`. Fix with a new small script.

## Common codes
| Code | Cause | Fix |
|---|---|---|
| CE0053 / MDL043 / MDL040 | declared an object or list variable | get it from a parameter, retrieve, create or loop |
| CE0105 | flow does not end with RETURN | return on every path |
| CE0104, CE0709 (MDL-FLOW05) | code after RETURN/BREAK, `while true` with no BREAK | remove or restructure |
| CE0068 (MDL062) | RETURN inside a loop | flag + BREAK, return after the loop |
| CE0111 (MDL063) | duplicate variable name | one creator per name; use SET to change |
| CE0117 | expression error | qualify association paths, use `div`, use `$currentObject/Attr`, enum as `Module.Enum.Value` |
| CE0161 | XPath arithmetic or expression function | compute into a variable first |
| CE1571 | call parameter has no argument | pass it by name; menu items cannot open parametrised pages |
| CE0106 (MDL-SEC21) | element has no allowed roles | grant it in the same script |
| CE1613 / MDL-GRANT02 | unqualified module role | `Module.Role` |
| CE0066 | stale access rule | `UPDATE SECURITY <Module>` |
| CE6035 / MDL076 | `ON ERROR CONTINUE` on an activity that refuses it | custom handler block |
| CE0174 / MDL030-031 / CE6770 | view entity OQL rules | alias every column, String(200) for derived text |
| CE7247 | AutoNumber without DEFAULT 1 | `Nr: AutoNumber DEFAULT 1` |
| CW0094 | unused variable | remove it |

## "Not found" errors
- Module, entity or microflow not found: spelling and qualification (`mxcli -c "list entities in <Module>"`).
- Not found but the script creates it **further down** (MDL-PAGE01, MDL-ORDER01): reorder so definitions come before use, or split the script.
- Parse error on a name: it may be a reserved word; quote it (`mxcli syntax domain-model.keywords`).
- A page or element exists but is blank at runtime with no error: security (`mendix-security`, SEC010, System-module ceiling).

## Quick validation list before exec
Objects and lists not declared; every SET target declared; association paths qualified; enums as `Module.Enum.Value` in expressions; every path returns; `div` not `/`; every statement ends in `;`; every IF/LOOP closed.