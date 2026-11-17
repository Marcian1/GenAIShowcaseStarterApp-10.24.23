---
description: Lint and review the current Mendix changes before a commit
agent: agent
---
Use the `mendix-review` skill. Run `mxcli diff-local` and `mxcli lint`, then give: what changed in 5 lines,
findings by severity with the one-line fix each, and whether it is safe to commit. Do not change anything.