---
name: mendix-domain-model
description: Design and change the Mendix domain model in MDL - entities, attributes, associations, enumerations, view entities, indexes - including safe changes to existing entities and data-loss traps. Use for any new or changed entity, association or enumeration.
---
# Domain model in MDL

Syntax: `mxcli syntax domain-model.entity.create`, `.entity.alter`, `.entity.attributes`, `.association.create`, `.enumeration.create`, `.view-entity`, `.keywords`. Look at the module first: `mxcli structure -m <Module>`.

## Design checklist
- One concern per module; entities PascalCase singular; associations named `<From>_<To>` (`Order_Customer`).
- Persistent for business data, non-persistent for page/helper state, view entity (OQL) for read-only aggregates.
- Required fields `NOT NULL` with an `ERROR MESSAGE`; natural keys `UNIQUE`; index columns used in XPath, sorts and joins.
- Attribute types: `String(n)` (always a length), `Integer`, `Long`, `Decimal`, `Boolean` (defaults false), `DateTime` (add `NOT LOCALIZED` for calendar dates), `AutoNumber` (needs `DEFAULT 1`), `Enumeration`.
- Never name attributes `CreatedDate`, `ChangedDate`, `Owner`, `ChangedBy`, `Type`, `ID` (system or reserved). Quoting does not exempt platform names.
- Associations: choose reference (many-to-one) vs reference set (many-to-many), owner side, and delete behavior deliberately (`mxcli syntax domain-model.association.delete-behavior`).

```mdl
mdl 1;
CREATE ENUMERATION IF NOT EXISTS Shop.OrderStatus ( Open 'Open', Shipped 'Shipped', Cancelled 'Cancelled' );
CREATE PERSISTENT ENTITY IF NOT EXISTS Shop.Customer (
  Name: String(200) NOT NULL ERROR MESSAGE 'Name is required',
  Email: String(254) UNIQUE
) INDEX (Name);
CREATE PERSISTENT ENTITY IF NOT EXISTS Shop.Order (
  OrderNumber: String(20) NOT NULL UNIQUE,
  Status: Enumeration(Shop.OrderStatus) DEFAULT Shop.OrderStatus.Open,
  Total: Decimal DEFAULT 0
);
```
Add the association with `mxcli syntax domain-model.association.create` (owner, type, delete behavior), then the access rules (`mendix-security`).

## Changing something that exists
- Use `ALTER ENTITY / ASSOCIATION / ENUMERATION` (add attribute, rename, set delete behavior, add value). Examples: `ALTER ENTITY Shop.Order ADD ATTRIBUTE IF NOT EXISTS Note: String(200);`
- **Never DROP and re-create to change an entity**: the new entity has a new identity and the runtime drops the table and its rows.
- Do not re-run `describe` output with `CREATE OR MODIFY` on something authored in Studio Pro (it has flipped association storage, a schema change). Run `mxcli diff` first; it lists every unit the script would write.
- Removing or renaming: run `mxcli impact <Module.Element>` first and use `mxcli rename` so references update.
- Adding an attribute to a member-listed security rule leaves it unreadable; `ALTER ... ADD ATTRIBUTE` prints the GRANT to widen it.
- `INDEX (...)` goes after the closing parenthesis. A derived view-entity string column must be `String(200)`.

## View entities (OQL)
Read-only aggregates: every select column needs `AS <attribute>`, no `ORDER BY` without `LIMIT`, associations walk with slashes. Rules and syntax: `mxcli syntax domain-model.view-entity.oql`; OQL specifics in `mendix-xpath-oql`.