---
name: mendix-pages
description: Create and change Mendix pages, snippets and CRUD screens (overview grid, NewEdit form, data sources, widgets, conditional visibility) in MDL. Use for any request to add or modify a page, form, list or button.
---
# Pages in MDL

Syntax: `mxcli syntax page.create`, `page.widgets`, `page.datasource`, `page.action`, `page.alter`, `page.styling`. One exact widget's properties: `mxcli syntax page.widget-describe`. Existing page: `ALTER PAGE` (insert/replace/drop widgets in place), never re-create it. Same change on many pages: `mxcli syntax page.update-widgets`.

## Before writing
1. Find the layout and existing pages to copy conventions: `mxcli -c "list layouts"`, `mxcli describe <Module.ExistingPage>`.
2. The page needs an existing entity; the roles that open it need `GRANT VIEW ON PAGE` and read access to the entity (lint SEC010/MPR007 otherwise).
3. Create things before you reference them in the same script: entity, then microflows, then pages, then navigation. A forward reference is an error (MDL-PAGE01, MDL-ORDER01).

## CRUD set (per entity)
| Piece | Name | Notes |
|---|---|---|
| Overview page | `<Entity>_Overview` | DATAGRID on `DATABASE Module.Entity`, New and Edit buttons, optional search/filters |
| Form page | `<Entity>_NewEdit` | DATAVIEW with the entity as page parameter; Save and Cancel |
| Save | `ACT_<Entity>_Save` | validate (`VAL_`) -> commit -> close page |
| New | `ACT_<Entity>_New` | create object, set defaults, show page |
| Delete | `ACT_<Entity>_Delete` | confirm in the button, then delete |
| Menu | sidebar snippet or navigation item | see `mendix-navigation` |

```mdl
mdl 1;
CREATE PAGE Shop.Product_NewEdit (Params: ( $Product: Shop.Product ), Title: 'Product', Layout: Atlas_Core.PopupLayout)
{
  LAYOUTGRID mainGrid { ROW { COLUMN (DesktopWidth: AutoFill) {
    DATAVIEW dvProduct (DataSource: $Product) {
      TEXTBOX txtName (Label: 'Name', Attribute: Name)
      CHECKBOX cbActive (Label: 'Active', Attribute: Active)
      FOOTER {
        ACTIONBUTTON btnSave (Caption: 'Save', Action: SAVE CHANGES, ButtonStyle: Success)
        ACTIONBUTTON btnCancel (Caption: 'Cancel', Action: CANCEL CHANGES)
      }
    }
  } } }
};

CREATE PAGE Shop.Product_Overview (Title: 'Products', Layout: Atlas_Core.Atlas_Default)
{
  DATAGRID dgProduct (DataSource: DATABASE Shop.Product) {
    COLUMN (Attribute: Name, Caption: 'Name') { TEXTFILTER tfName }
    COLUMN (Caption: 'Actions') {
      ACTIONBUTTON btnEdit (Caption: 'Edit', Action: SHOW PAGE Shop.Product_NewEdit(Product = $currentObject))
      ACTIONBUTTON btnDelete (Caption: 'Delete', Action: DELETE, ButtonStyle: Danger)
    }
  }
};
```
The edit page is created first because the overview links to it (a forward reference is MDL-PAGE01). Layout names are the Atlas defaults; confirm with `list layouts`. Use `Action: CALL MICROFLOW Shop.ACT_Product_Save(Product = $currentObject)` when the save needs validation.

## Rules and pitfalls
- Every widget needs a unique camelCase name (`dgProduct`, `dvProduct`, `btnSave`). Children go in `{ }`, properties in `( Key: value )`.
- Input by type: String `TEXTBOX` (long text `TEXTAREA`), numbers `TEXTBOX`, Boolean `CHECKBOX`, DateTime `DATEPICKER`, Enum `COMBOBOX` or `RADIOBUTTONS`, association `COMBOBOX` with `DataSource: DATABASE ...` and a `CaptionAttribute`. `DROPDOWN` is deprecated.
- Grid filters must match the column type: String `TEXTFILTER`, numbers `NUMBERFILTER`, date `DATEFILTER`, enum and Boolean `DROPDOWNFILTER`. Filters go inside the column braces.
- `DYNAMICTEXT (Content: '')` fails the build ("place holder index"); use a single space.
- A button inside a data container passes `$currentObject`, not the container's widget name (CE0117). In a grid control bar there is no row; pass the grid selection or put the button in a column (CE1571).
- A microflow data source needs one named argument per parameter; nothing is auto-mapped (CE1571).
- Button styles: `success` Save, `default` Cancel, `primary` main action, `danger` Delete.
- Enum comparison differs by context: expression (`visible:`) uses `Module.Enum.Value`; XPath `where [...]` accepts `'Value'` too.
- Conditional visibility/editability expressions are written with `$currentObject/Attr`; a bare attribute name is CE0117. An unparseable expression is an error, not silently visible.
- Menu items and microflow-opened pages cannot target a page with a required parameter without supplying it.
- For widgets not in the standard list use the generic form (`mxcli syntax page.widget-any`) or `PLUGGABLEWIDGET`.

## Verify
`mxcli check page.mdl -p <app>.mpr` (resolves entity and attribute names, XPath, widget properties), `mxcli diff`, then `mxcli describe page <Module.Page>`; lint rules MPR005 (image source), MPR006 (empty container), SEC010 (unreadable data) catch most runtime blanks.