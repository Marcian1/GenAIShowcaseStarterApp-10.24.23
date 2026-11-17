---
description: Overview and NewEdit pages with save/delete flow for an existing entity
agent: agent
---
Use `mendix-explore` then `mendix-write-mdl`. Build CRUD for the existing entity `${input:entity:Module.Entity}`:
a `<Entity>_Overview` page (data grid, New and Edit buttons), a `<Entity>_NewEdit` page (form, Save, Cancel),
and page access for the roles that can read the entity. Reuse an existing layout from the project; run
`mxcli syntax page.create` and `mxcli syntax page.datasource` rather than guessing. Check, diff, exec, lint.