---
name: mendix-workflows
description: Create and change Mendix workflows in MDL - user tasks, decisions, parallel splits, timers, boundary events, context entity, task assignment and outcomes, with the platform rules that fail the build. Use for approvals and multi-step business processes.
---
# Workflows in MDL

Syntax: `mxcli syntax workflow` index, then `workflow.create`, `workflow.multi-user-task`, `workflow.decision`, `workflow.parallel-split`, `workflow.boundary-event`, `workflow.set-task-outcome`, `workflow.alter`. Existing workflow: `mxcli describe workflow <Module.Name>` (round-trippable) and `ALTER WORKFLOW`. Never rebuild one that holds Studio Pro-only state (event sub-processes, handlers); `create or modify` refuses and tells you.

## Model
A workflow is driven by a **context entity** (the persistent object each instance is about, e.g. `Expense`). User tasks open a page bound to `System.WorkflowUserTask`. Reads and writes of workflow data from microflows: `mxcli syntax microflow.workflow-actions`.

## Rules that fail the build
- A user task needs a `page` (CE1834, MDL-WF01) and, if single-outcome, no nested activities (CE1876).
- Decisions and call-microflow outcomes must cover every enumeration value **and** the empty outcome `'' -> { }` (CE6686, MDL-WF06).
- `end workflow` ends the whole workflow from a branch; `return;` is refused in a workflow (MDL-WF11). `end workflow` is illegal under a parallel split or a non-interrupting boundary path (CE1844), and nothing may follow it in its block (CE6671). If every path ends, nothing may follow the activity (CE6689). Let one path continue.
- Multi-user task: set participants, `decide by` rule, and a fallback outcome where required (consensus, majority, threshold need a fallback CE1866; a veto needs its outcome CE1867). The decision microflow must return String (CE5012). Thresholds are not range-checked by the build; check them yourself.
- `auto assign single user` is off by default: without it a user cannot complete the task from a microflow until it is assigned ("not assigned to you").
- AI agent task = `call agent microflow` (Mendix 11.9+); its microflow must take a parameter (CE1590).
- A rewrite that omits a stored clause (participants, rule, await all) is refused rather than silently resetting it; restate it.
- Activity names matter for `jump to`; keep them stable and unique.
- System enumerations used in workflows are synthesised, not stored; do not try to create them.

## Workflow
Explore context entity and pages (`mendix-explore`), write the script in small pieces, `mxcli check -p`, `mxcli diff`, exec, `list workflows`, then `mxcli docker build`/`check` if available for the full Studio Pro rules. Security: grant workflow-related pages and microflows to the right roles, and mind the System-module ceiling for task inboxes (`mendix-security`).