%% ofk 1
erd
ghost ||--o{ a : missing entity
a {
  id int pk
  broken
  weird int
}
a -> b : target missing
b { id int pk }
a unknown_rel b
row outside a block
