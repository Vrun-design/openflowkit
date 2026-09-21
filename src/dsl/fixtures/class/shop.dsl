%% ofk 1
class down
title: Shop domain

Order [interface] {
  +id: UUID
  -items: Item[]
  ---
  +total(): Money
  +save()$
}

Customer [blue] {
  +name: string
  +email: string
  ---
  +orders(): Order[]
}

Item {
  +sku: string
  +price: int
}

Order --|> Entity : extends
Order *-- Item : contains
Customer o-- Order : places
Order ..> Money : depends
