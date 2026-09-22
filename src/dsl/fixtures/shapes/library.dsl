%% ofk 1
flowchart

Decision [diamond]
Store [cylinder, blue]
Launch [star, orange, bold]
Reply [speech, green]
Done [check-circle]
Goal [target]
Grouping [brace]
Decision -> Store
Store -> Launch : ship
Launch -> Reply
Reply -> Done
Done -> Goal
