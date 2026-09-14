-- Roster names are unique case-insensitively, because sign-in matches them that way.
--
-- 0004 made (class_id, display_name) unique, which let a teacher add both
-- "Jordan" and "jordan". Sign-in then matched both, returned two rows where it
-- expected one, and neither student could get in even with the right passcode —
-- a failure nobody would diagnose from the message they saw.

drop index if exists sim_students_class_id_display_name_key;
alter table public.sim_students drop constraint if exists sim_students_class_id_display_name_key;

create unique index if not exists sim_students_class_name_idx
  on public.sim_students (class_id, lower(display_name));
