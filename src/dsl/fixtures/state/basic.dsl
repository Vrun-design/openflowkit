%% ofk 1
state
title: Order lifecycle

[*] -> Idle
Idle -> Running : start
Running -> Done : finish
Running -> Failed : error
Failed --> Retry : retry
Retry -> Running : resumed
Done -> [*]
