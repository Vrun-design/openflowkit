%% ofk 1
erd
title: Key flags

membership {
  user_id uuid pk fk
  group_id uuid pk fk
  joined_at timestamp not-null
  note text nullable
  tag text unique
}
