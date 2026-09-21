%% ofk 1
state down
title: Composite states

[*] -> Idle
state Processing {
  [*] -> Queued
  Queued -> Working : pick
  Working -> Queued : requeue
}
Idle -> Processing : begin
Processing -> Done : complete
Done -> [*]
