-- DSK 005 — let a case be saved as a draft from the first wizard step.
-- The prototype asks for the industry first (step 1), location (step 2), her name (step 3) and
-- existing-vs-new (step 4). With full_name and stage NOT NULL, nothing could be autosaved until step 4.
-- Both become optional at the database level; the app's validation (Phase 7) blocks plan generation
-- until they are filled, so no plan can be produced without them.
alter table entrepreneurs alter column full_name drop not null;
alter table businesses    alter column stage     drop not null;
