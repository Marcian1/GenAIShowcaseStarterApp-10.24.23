---
name: mendix-xpath-oql
description: Write correct XPath constraints (retrieve, page data sources, entity access) and OQL (view entities, runtime queries) for Mendix, including enum, date, association and empty-result traps. Use whenever a where-clause or query is needed or returns unexpected results.
---
# XPath and OQL

## XPath in `[ ... ]` (retrieve, `DATABASE ... WHERE`, `GRANT ... WHERE`)
```mdl
mdl 1;
CREATE MICROFLOW Shop.DS_OpenOrders ($Min: Decimal, $Customer: Shop.Customer)
RETURNS List of Shop.Order AS $Orders
BEGIN
  RETRIEVE $Orders FROM Shop.Order
    WHERE [Status = Shop.OrderStatus.Open and Total >= $Min and Shop.Order_Customer = $Customer];
  RETURN $Orders;
END;
```
- Not an expression: negation is `not(...)`, booleans lowercase `and`/`or`, empty is `= empty` / `!= empty`, tokens are quoted `'[%CurrentUser%]'`.
- **No arithmetic or expression functions inside the constraint** (CE0161, parse error): compute into a variable first (`DECLARE $Next Integer = $G/Seq + 1;` then `[Seq = $Next]`). `addDays()` and friends are expression functions; for dates use `[%CurrentDateTime%]`, `[%BeginOfCurrentDay%]` or a variable. A negative literal is fine.
- **Association paths are qualified:** `Shop.Order_Customer/Shop.Customer/Name`, never `Order_Customer/Name` (CE0111). Name the target entity after each hop.
- **Enums:** the database stores the value key, case-sensitive. `[Status = 'Open']` and `[Status = Shop.OrderStatus.Open]` both work. Empty result on an enum filter = wrong key; run `mxcli describe enumeration`.
- System attributes (`createdDate`, `changedDate`, `owner`, `changedBy`) are tokens, not plain members; check with `mxcli check -p`.
- Optional filter ("empty = skip"): make it a variable test in the microflow (IF + two retrieves) rather than embedding logic in the constraint.
- Owner-based security: `[System.owner = '[%CurrentUser%]']`.
- `mxcli check script.mdl -p app.mpr` resolves every step of a constraint against the model; use it, a wrong path otherwise surfaces only at build.

## OQL (view entities, `mxcli oql`)
- **Aggregates lowercase** (`sum`, `avg`, `min`, `max`, `count`); `count(*)` is not supported: use `count(x.ID)`, or `count(x)`. A view entity has no ID, so count a column that is never empty (`count(v.Name)`). `count(1)` and `sum(1)` fail on HSQLDB.
- **Division is `:`**, not `/`. `<>` is rejected; use `!=`.
- **Enum comparison uses string literals** (`'INCOME'`), the value key, not the qualified name or caption.
- `ORDER BY` must reference a select alias, and needs `LIMIT` in a view entity; prefer sorting in the consumer.
- `DESC` on a nullable column puts nulls first.
- Associations: `join o/Shop.Order_Customer/Shop.Customer as c` (slashes). Selecting an id creates an association, not an attribute.
- Every select column needs an `AS` alias that equals the view entity attribute; derived strings are `String(200)`.
- `datepart(YEAR, d)` uses commas. Comments inside a view query need Mendix 11.7+.
- Full rules: `mxcli syntax domain-model.view-entity.oql`, `mxcli syntax integration`. Run a query against the running app: `mxcli oql` (needs a running runtime).