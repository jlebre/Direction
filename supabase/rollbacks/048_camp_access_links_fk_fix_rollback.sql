-- ROLLBACK de 048 — restaura o FK sem ON DELETE (comportamento original de 045).
ALTER TABLE camp_access_links DROP CONSTRAINT IF EXISTS camp_access_links_created_by_user_id_fkey;
ALTER TABLE camp_access_links
  ADD CONSTRAINT camp_access_links_created_by_user_id_fkey
  FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id);

ALTER TABLE camp_access_events DROP CONSTRAINT IF EXISTS camp_access_events_actor_user_id_fkey;
ALTER TABLE camp_access_events
  ADD CONSTRAINT camp_access_events_actor_user_id_fkey
  FOREIGN KEY (actor_user_id) REFERENCES auth.users(id);
