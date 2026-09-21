%% ofk 1
flowchart right
title: Connector syntax

Source -> Alpha, Beta, Gamma : distribute
Alpha, Beta, Gamma -> Join : collect
Archive <- Join
Join <-> Coordinator : synchronize
Coordinator <--> Replica : delayed sync
