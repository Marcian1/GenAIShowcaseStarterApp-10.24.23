---
description: What breaks if I rename or delete an element
agent: agent
---
Use `mendix-explore`. For `${input:element:Module.Element}` run `mxcli impact` and `mxcli refs`.
Answer in a table: referencing element, type, what would break. End with a safe plan (rename with `mxcli rename`, not by hand).
Do not change anything.