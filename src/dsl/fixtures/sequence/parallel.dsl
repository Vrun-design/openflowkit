%% ofk 1
sequence
title: Fan out

Service -> A : start
par {
  Service -> A : task 1
} and {
  Service -> B : task 2
}
Service -> A : done
