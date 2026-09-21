%% ofk 1
class
title: All relations

Base { +id: int }
Derived { +extra: string }
Owner { +name: string }
Part { +name: string }
Service { +go(): void }
Repo { +find(): Base }

Derived --|> Base
Base <|-- Other
Owner *-- Part
Owner --* Loose
Service ..> Repo
Repo -- Service : calls
