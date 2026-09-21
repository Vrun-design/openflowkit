%% ofk 1
erd
title: Shop schema

users [blue] {
  id uuid pk
  email text unique
  "full name" text
}

orders {
  id uuid pk
  user_id uuid fk
  total int not-null
  placed_at timestamp
}

order_items {
  order_id uuid pk
  sku text pk
  quantity int
}

users ||--o{ orders : places
orders ||--|{ order_items : contains
order_items }o--|| products : references
products {
  sku text pk
  price int
}
