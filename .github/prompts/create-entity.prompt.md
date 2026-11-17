---
description: Add an entity with security via a checked MDL script
agent: agent
---
Use the `mendix-write-mdl` skill. Create entity `${input:entity:Module.Entity}` with attributes: ${input:attributes:Name String(200), Active Boolean}.
Include access rules for the roles that already exist in that module (look them up, do not invent roles).
Follow the loop: script in `changes/`, check, diff, exec, describe, lint. Report only the result and lint status.