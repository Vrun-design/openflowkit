%% ofk 1
gitgraph
title: Three lanes

commit A
branch feature
commit B
branch spike
commit C
checkout feature
commit D
checkout main
merge spike [label: "Spike merged"]
merge feature [label: "Feature merged"]
