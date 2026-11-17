---
name: mendix-write-mdl
description: Create or change Mendix domain model, microflows, pages, security and navigation by writing and running an MDL script with mxcli. Use for any request that adds or modifies something inside the Mendix model.
---
# Change the model with MDL

## Loop
1. Explore only what you must touch (see `mendix-explore`).
2. Fetch syntax for the construct, not the whole language: `mxcli syntax <path>`.
3. Write `changes/<short-name>.mdl`: line 1 `mdl 1;`, statements end with `;`, small and re-runnable.
4. `mxcli check changes/<name>.mdl` then `mxcli diff changes/<name>.mdl`, fix, repeat.
5. `mxcli exec changes/<name>.mdl`, then `mxcli describe` the result, then `mxcli lint`.

## Syntax paths (run one, not all)
- `domain-model.entity.create`, `domain-model.entity.alter`, `domain-model.association.create`, `domain-model.enumeration.create`
- `microflow.create`, `microflow.retrieve`, `microflow.object-operations`, `microflow.control-flow`, `microflow.validation`, `microflow.error-handling`
- `page.create`, `page.widgets`, `page.datasource`, `page.action`, `page.alter`
- `security.module-role`, `security.entity-access`, `security.page-access`, `security.microflow-access`
- `navigation.create`, `workflow.create`, `rest.consumed`, `rest.call`; errors: `errors`

## Minimal examples (verified with `mxcli check`)
```
mdl 1;
CREATE PERSISTENT ENTITY IF NOT EXISTS Shop.Product (
  Name: String(200) NOT NULL,
  Price: Decimal DEFAULT 0,
  Active: Boolean DEFAULT true
);
CREATE MICROFLOW Shop.ACT_Deactivate ($Product: Shop.Product)
BEGIN
  CHANGE $Product (Active = false);
  COMMIT $Product;
END;
GRANT READ *, WRITE * ON ENTITY Shop.Product TO Shop.Admin;
```

## Pitfalls
- Re-runnable = `IF NOT EXISTS`. `OR MODIFY` drops attributes the statement leaves out; use `ALTER` instead.
- Every new persistent entity needs a `GRANT` and every new page needs page access, or lint (SEC001, MPR007) fails.
- `AutoNumber` needs `DEFAULT 1`. `INDEX (...)` goes after the closing parenthesis.
- A bare `commit $X;` runs event handlers; write `commit $X without events;` only when intended.
- Validation error codes: `mxcli syntax errors`, or `mxcli help <code>`.
