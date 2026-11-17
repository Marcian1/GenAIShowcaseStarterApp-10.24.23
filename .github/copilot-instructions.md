# Mendix project (edited with mxcli)

The Mendix model lives in a binary `.mpr`. Never open or edit `.mpr`, `mprcontents/`, `deployment/`,
`.mendix-cache/` or `.ai-context/`. Read and change the model only with `mxcli` (on PATH) using MDL,
a SQL-like text language. `mxcli` auto-detects the single `.mpr` in the working folder; otherwise pass `-p <file>.mpr`.

## Spend few tokens
- Look before you read: `mxcli structure -d 1`, then `mxcli -c "list entities in <Module>"`, then ONE `mxcli describe <Module.Element>`.
- Relationships: `mxcli context <Module.Element>`, `mxcli impact`, `mxcli refs`, `mxcli search "<text>"`. Do not describe things one by one to find them.
- Syntax: run `mxcli syntax <topic>` (domain-model, microflow, page, security, navigation, workflow, integration, errors) and drill down with more words. Do not guess syntax and do not read big reference files.
- Summarise command output; do not paste it back.

## Changing the model (always this order)
1. Write a small `.mdl` script. First line `mdl 1;`, every statement ends with `;`.
2. `mxcli check script.mdl -p <app>.mpr` and fix every error.
3. `mxcli diff script.mdl -p <app>.mpr` and read what would change.
4. `mxcli exec script.mdl -p <app>.mpr`, then `mxcli describe` the result. Running it again must change nothing.
5. `mxcli lint` for conventions and security.

mxcli is alpha quality: stay on a git branch, keep scripts small (one concern each), never batch unrelated changes.

## Conventions
- Names: entities PascalCase singular; microflows `ACT_` (button), `SUB_` (helper), `DS_` (data source), `VAL_` (validation); pages `Entity_Overview` / `Entity_NewEdit`.
- Every persistent entity needs access rules and every page needs allowed roles.
- Microflow variables start with `$`. Escape a single quote by doubling it.
- Say which module you will touch before changing anything outside it.
- Custom code (widgets, Java, JS) has its own rules in `.github/instructions/`; use the matching skill in `.github/skills/`.

## Skill map (read ONE skill, then only the line range you need)
Each skill opens with a "Find it fast" table of line ranges: read just that range. Syntax questions: `mxcli syntax <path>` first.
- **Domain model:** mdl-entities, generate-domain-model, system-module, organize-project, project-settings
- **Logic:** write-microflows, write-nanoflows, validation-microflows, patterns-crud, patterns-data-processing, write-rules, cheatsheet-variables, cheatsheet-errors, regular-expressions, scheduled-events-and-queues, write-workflows
- **Queries:** xpath-constraints, write-oql-queries, verify-with-oql, json-structures-and-mappings
- **Pages and UI:** create-page, overview-pages, master-detail-pages, alter-page, fragments, widgets, custom-widgets, create-custom-widget, bulk-widget-updates, write-layouts, theme-styling, atlas-design, manage-navigation, translations
- **Security:** manage-security (read its System-module ceiling first)
- **Integration:** rest-client, rest-call-from-json, mock-rest-apis, odata-data-sharing, business-events, database-connections, browse-integrations, catalog-search, java-actions, java-dependencies, javascript-actions, download-marketplace-content, agents
- **Run, test, debug:** run-local, run-app, docker-workflow, test-microflows, test-app, debug-microflows, debug-bson, analyze-runtime, runtime-admin-api, demo-data
- **Editing safely:** choose-edit-mode (alter vs create-or-modify), resolve-forward-references, check-syntax, live-edit-with-studio-pro
- **Project and quality:** project-brain (read `docs/brain/project.md` first if it exists), assess-quality, graph-analysis, teamserver-git, upgrade-mendix-version, write-lint-rules
- **Migration and demos:** assess-migration, migrate-design-prototype, migrate-k2-nintex, migrate-oracle-forms, bootstrap-app, record-narrated-demo, connect-rapidminer-graph
