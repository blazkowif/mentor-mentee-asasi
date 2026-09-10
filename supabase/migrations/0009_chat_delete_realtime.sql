-- Include the old group and participant fields in realtime DELETE payloads.
alter table public.messages replica identity full;