---
name: mendix-navigation
description: Configure Mendix navigation in MDL - home pages (per role), login page, menu tree, profiles (Responsive, Phone, Tablet and offline), menu documents. Use when a new page must be reachable from the menu or the home page changes.
---
# Navigation in MDL

Syntax: `mxcli syntax navigation.create`, `navigation.alter`, `navigation.menu-document`. Read first: `mxcli describe navigation`, `mxcli -c "list navigation menu"` (prints the item Address used by ALTER).

## Rules
- Profile names are a closed set: `Responsive`, `Phone`, `Tablet` and their `*Offline` twins. An invented name is an error (the platform routes by user agent).
- **Add one page to an existing menu with `ALTER NAVIGATION`** addressing the item; never re-create the whole profile to add an item (you would lose what you did not restate).
- Targets and roles are qualified (`Shop.Product_Overview`, `Shop.Admin`). Menu items nest in `{ }`, sub-menus in `MENU 'Caption' { ... }`, no `;` between items.
- **A menu item cannot open a page that has a required parameter** (CE1571). Open a parameterless page, or call a microflow that opens it.
- A menu item action is show page, call microflow/nanoflow, open link, create object, sign out, or nothing; not save/delete/close page.
- Every role that sees an item needs `GRANT VIEW` on its page, and every user role must be able to open its home page (lint MPR007). Do security (`mendix-security`) in the same change.
- Role-based home pages override the default per role.
- `Icon:` is a qualified icon name; check it exists with `describe icon collection <Module.Name>`, do not guess.
- **Offline profiles** constrain every page they reach: no attribute binding across more than one association (CE6206), and `progressive web app ( Precaching: true )` is required or no page opens offline. See `mxcli syntax navigation.create` before touching one.
- A standalone menu document (`CREATE MENU`) is a different document type than a profile menu; confirm which you mean with `list navigation menu` vs `describe menu`.

## Workflow
1. `describe navigation` -> 2. write an `ALTER NAVIGATION` script (or create for a new project) -> 3. check, diff, exec -> 4. `describe navigation` again -> 5. `mxcli lint`.