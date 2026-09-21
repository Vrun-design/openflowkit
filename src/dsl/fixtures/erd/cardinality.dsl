%% ofk 1
erd right
title: Cardinality forms

a { id int pk }
b { id int pk }
c { id int pk }

a ||--|| b : one to one
b ||..o{ c : optional many
a -- c
