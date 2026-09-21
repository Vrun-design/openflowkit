%% ofk 1
gitgraph
title: Long history

commit A
commit B
commit C
branch release
checkout release
commit "RC1" [tag: rc1]
commit "RC2"
checkout main
commit D
commit E
merge release [label: "release merged", tag: v2.0]
