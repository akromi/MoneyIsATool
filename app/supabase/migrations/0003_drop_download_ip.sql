-- Stop keeping the IP address recorded against each download.
--
-- Knowing which account downloaded which file is enough to spot a licence
-- being shared, and the IP address is personal data the project would then
-- have to account for in a privacy notice and at handover. Dropping the
-- column also deletes the addresses already collected, which is the point.
--
-- Apply this only after the release that stops writing the column, or
-- downloads will fail against the older code.

alter table public.downloads drop column if exists ip;
