%% ofk 1
state
title: Controls

[*] -> Start
Start -> Split [fork]
Split -> A : left
Split -> B : right
A -> Merge [join]
B -> Merge [join]
Merge -> Pick [choice]
Pick -> One : a
Pick -> Two : b
One -> [*]
Two -> [*]
