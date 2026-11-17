---
name: mendix-microflows
description: Write and fix Mendix microflows and nanoflows in MDL - variables, retrieve, loops, validation (VAL_/ACT_ pattern), error handling, expressions, and the build errors (CE0xxx) they cause. Use before any CREATE MICROFLOW or when a microflow fails check or build.
---
# Microflows in MDL

Syntax: `mxcli syntax microflow.create` (and `.retrieve`, `.control-flow`, `.object-operations`, `.error-handling`, `.validation`, `.call`). Edit an existing flow with `ALTER MICROFLOW` (`mxcli syntax microflow.alter`), not by re-creating it.

## Microflow or nanoflow
Server work (database, REST, Java, commits, email, files, schedules) = microflow. Client work (form checks before save, navigation, device features, offline, JS actions) = nanoflow. `RAISE ERROR` is only allowed inside an error handler; nanoflows accept almost no `ON ERROR` clause.

## Rules that fail the build if broken
1. **Objects and lists are never declared.** They come from a parameter, `RETRIEVE`, `CREATE`, or a loop iterator (MDL043/MDL040, CE0053). `DECLARE` is for primitives only, and needs a value.
2. **`SET` changes a variable; `$x = ...` creates one.** Variable names are unique flow-wide, branches and loops do not open a scope (CE0111). Writing `DECLARE $s String = ''; $s = CALL ...` is a duplicate.
3. **Every path ends in `RETURN`** (CE0105), nothing after `RETURN`/`BREAK` (CE0104/CE0709). `RETURN` is not allowed inside a loop (CE0068): set a flag, `BREAK`, return once after the loop.
4. **Division is `div`** (`$a div $b`); `/` is the member separator. Integer division yields Decimal; wrap in `round()`/`trunc()`.
5. **Enum comparison in expressions** uses the qualified value `Module.Enum.Value`; XPath accepts `'Value'` or the qualified form (see `mendix-xpath-oql`).
6. `dateTime(...)` takes literal numbers only. Build dates from variables with `addDays(addMonths(dateTime(2026,1,1), $m - 1), $d - 1)`.
7. `retrieve ... FIRST` returns one object (use `$x = empty` check); without it a list. Do not call `head()` on a `FIRST` result (CE0097).
8. Call arguments are named and must match the target's parameter names exactly (`describe microflow` shows them). Qualify everything `Module.Name`.
9. `ON ERROR CONTINUE` is refused on `create/change/commit/log/show page/close page/show message/validation feedback` (CE6035/MDL076). Use a `BEGIN ... END ERROR` handler there.
10. A bare `COMMIT` runs event handlers; add `WITHOUT EVENTS` only when you mean to skip them.
11. Aggregates and list operations (`FILTER`, `COUNT`, ...) are one statement each and never nest.

## The VAL_ / ACT_ pattern (save with validation)
```mdl
mdl 1;
CREATE MICROFLOW Shop.VAL_Product_Save ($Product: Shop.Product)
RETURNS Boolean AS $IsValid
BEGIN
  DECLARE $IsValid Boolean = true;
  IF $Product/Name = empty THEN
    VALIDATION FEEDBACK $Product/Name MESSAGE 'Name is required';
    SET $IsValid = false;
  END IF;
  RETURN $IsValid;
END;

CREATE MICROFLOW Shop.ACT_Product_Save ($Product: Shop.Product)
RETURNS Boolean AS $Ok
BEGIN
  $Ok = CALL MICROFLOW Shop.VAL_Product_Save(Product = $Product);
  IF $Ok THEN
    COMMIT $Product;
    CLOSE PAGE;
  END IF;
  RETURN $Ok;
END;
```
Validation order: required fields first, then ranges, enums, dates, associations. Check `= empty` before touching nullable values. Cancel button: `ROLLBACK $Product; CLOSE PAGE;`.

## Loop with early exit
```mdl
mdl 1;
CREATE MICROFLOW Shop.SUB_Product_HasActive ($Code: String)
RETURNS Boolean AS $Found
BEGIN
  DECLARE $Found Boolean = false;
  RETRIEVE $Products FROM Shop.Product WHERE [Active = true() and Code = $Code];
  LOOP $P IN $Products
  BEGIN
    SET $Found = true;
    BREAK;
  END LOOP;
  RETURN $Found;
END;
```
Adding, removing or reordering inside a loop body: `ALTER ... REPLACE` the whole loop.

## Naming
`ACT_<Entity>_<Verb>` page buttons, `VAL_` validation, `DS_` data sources, `SUB_` internal helpers. Keep flows short and split into `SUB_` flows; lint flags long and complex ones (see `mxcli lint`).

## Build error quick map
CE0053 declared an object/list. CE0105 missing RETURN. CE0104/0709 unreachable after RETURN/BREAK. CE0111 duplicate variable. CE0117 expression error (unqualified association path, `/` for division, bare attribute name where `$currentObject/Attr` is needed). CE0068 RETURN in loop. CE1571 call parameter not filled. CW0094 unused variable. More: `mxcli syntax errors`, `mxcli help <code>`.