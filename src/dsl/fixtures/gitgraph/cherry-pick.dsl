%% ofk 1
gitgraph
title: Cherry picks

commit Base
branch hotfix
commit "Hot fix" [tag: v1.0.1]
checkout main
commit "Main work"
cherry-pick "Hot fix"
