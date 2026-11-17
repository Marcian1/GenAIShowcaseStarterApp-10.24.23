---
name: mendix-security
description: Set up or review Mendix security in MDL - module roles, user roles, entity access with XPath rules, page and microflow access, project security level, demo users, guest access. Use whenever a new entity, page or microflow is created, or someone asks who can see or do what.
---
# Security in MDL

Syntax: `mxcli syntax security.module-role`, `.entity-access`, `.page-access`, `.microflow-access`, `.user-role`, `.project-security`, `.demo-user`, `.guest-access`. Inspect: `mxcli describe security matrix in <Module>`, `mxcli describe user role <Name>`.

## Order of work
1. Module roles (module must exist), 2. entity access, 3. microflow execute and page view access, 4. user roles that bundle module roles, 5. verify with the matrix and `mxcli lint`.

```mdl
mdl 1;
CREATE MODULE ROLE Shop.User DESCRIPTION 'Regular user';
CREATE MODULE ROLE Shop.Admin DESCRIPTION 'Administrator';
GRANT CREATE, DELETE, READ *, WRITE * ON ENTITY Shop.Product TO Shop.Admin;
GRANT READ * ON ENTITY Shop.Product TO Shop.User WHERE [Active = true()];
GRANT EXECUTE ON MICROFLOW Shop.ACT_Product_Save TO Shop.User, Shop.Admin;
GRANT VIEW ON PAGE Shop.Product_Overview TO Shop.User, Shop.Admin;
CREATE USER ROLE AppUser ( ModuleRoles: (Shop.User, System.User) );
```
Confirm exact forms with `mxcli syntax security.<topic>`; do not guess keywords.

## Rules
- **Always `Module.Role`.** A bare role name parses, then fails at exec or becomes CE1613 (MDL-GRANT02).
- **A new document starts with no access.** A page, microflow or entity you create is unreachable until granted; MxBuild reports CE0106 where it is used (MDL-SEC21). Grant in the same script that creates it.
- `DROP` + `CREATE` of a flow loses its grants. Use `ALTER` or `CREATE OR MODIFY`, or regrant in the same script.
- **System module ceiling:** no project module can widen access to `System.User`, `System.Workflow` or `System.WorkflowUserTask`. A grid or combo box over them shows blank rows to non-admins, and `check`, `lint` and `docker check` can all pass. Use a module-owned entity or `Administration.Account` (show `FullName`) for pickers. A microflow data source returns the rows, but entity access is re-applied per object when serialising, so members still arrive blank.
- Entity rights: `READ *`/`WRITE *` for all members, or lists `READ (Name, Email)`. A rule written with member lists alone gives `None` to attributes added later; widen with a new GRANT. `READ *` and `WRITE *` also cover newly added members.
- XPath-restricted rules go in `WHERE [...]` (unquoted brackets). Prefer a constraint to a broad `READ *` for anonymous and PII entities (SEC006/SEC010).
- In Production security level every user role needs at least one System module role (CE0156).
- Entities extending `System.User` have platform members Mendix manages; do not grant `Name`, `Password`, `Blocked`.
- Demo users must be off at Production level (SEC003). Guest access: `mxcli syntax security.guest-access`, and review what anonymous can read.
- `UPDATE SECURITY [<Module>]` repairs stale access rules (CE0066) after outside edits or a Marketplace install.

## Verify
`mxcli lint` (SEC001 no access rules, SEC002 password policy, SEC003 demo users, SEC004-006 guest/strict/PII, SEC010 unreadable page data, MPR007 navigation pages need roles), then `mxcli docker check` if available.