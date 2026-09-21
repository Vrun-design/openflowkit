%% ofk 1
state right
title: Wide state machine

Idle [ellipse] -> Loading
Loading --> Ready : ok
Loading --> Failed : error
Ready [blue] -> Idle
Failed [red] -> Idle
