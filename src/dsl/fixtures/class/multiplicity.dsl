%% ofk 1
class right
title: Multiplicity

Order { +id: int }
Item { +sku: string }
Tag { +name: string }

Order "1" --> "*" Item : has
Item "0..*" -- "1" Tag : tagged
