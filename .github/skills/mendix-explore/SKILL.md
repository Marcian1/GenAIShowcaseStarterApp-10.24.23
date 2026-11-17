---
name: mendix-explore
description: Understand an existing Mendix app with mxcli before changing it - list modules, entities, microflows, pages, find usages, see what a change would affect. Use for any question about what is in the project.
---
# Explore a Mendix project cheaply

Go from wide to narrow and stop as soon as you can answer.

| Need | Command |
|---|---|
| Size and shape | `mxcli structure -d 1` (counts per module) |
| One module | `mxcli structure -m <Module> -d 2` |
| List a type | `mxcli -c "list entities in <Module>"` (also microflows, pages, enumerations, associations) |
| One element in full | `mxcli describe <Module.Element>` |
| Element plus neighbours | `mxcli context <Module.Element> --depth 1` |
| Who uses it | `mxcli refs <Module.Element>`, `mxcli impact <Module.Element>` |
| Callers / callees of a microflow | `mxcli callers <Module.Mf>`, `mxcli callees <Module.Mf>` |
| Find by text | `mxcli search "<text>"` (add `-q --format names` for compact output) |
| Architecture problems | `mxcli graph-report` |

Rules:
- Default depth 1, one module at a time. System and marketplace modules are hidden unless you add `--all`; leave them hidden.
- `describe` prints re-runnable MDL, so it doubles as the template for a similar change.
- Use `context` instead of chaining several `describe` calls.
- Answer from what you saw. Do not read `.mpr` or `mprcontents/`.
