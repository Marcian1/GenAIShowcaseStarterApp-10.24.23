---
name: mendix-review
description: Review and validate Mendix changes - lint conventions and security, check an MDL script, preview a diff, run the Mendix build check, and compare local changes against git. Use before committing, or when asked to review, audit or validate the app.
---
# Review a Mendix change

| Question | Command |
|---|---|
| Is my script valid? | `mxcli check <file>.mdl` (add `-p` for full reference checks) |
| What would it change? | `mxcli diff <file>.mdl` |
| Naming, security, best practice | `mxcli lint` (add `--json` if you need to filter) |
| Quality report | `mxcli report` |
| What changed since git HEAD | `mxcli diff-local` |
| Does the real compiler accept it? | `mxcli docker check` (needs MxBuild; if missing, say so and skip) |
| Blast radius of a rename or delete | `mxcli impact <Module.Element>` |

How to report: group findings by severity, give element name plus the one-line fix, and skip anything lint already
reports as informational. Do not paste full lint output. Fix with a new small `.mdl` script, never by editing the `.mpr`.

Before suggesting a commit: lint clean or explained, second `exec` changes nothing, `diff-local` shows only intended changes.
