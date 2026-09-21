%% ofk 1
flowchart down
title: Release decision

Start [ellipse]
Ready [diamond, blue]
Ship [rounded, green]
Fix [rounded, orange]
Done [ellipse]

Start -> Ready : review
Ready -> Ship : yes
Ready -> Fix : no
Fix --> Ready : retry
Ship -> Done
