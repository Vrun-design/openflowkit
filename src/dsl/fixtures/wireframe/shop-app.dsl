%% ofk 1
wireframe
title: Shop app

screen Browse [phone] {
  statusbar
  search: Search products
  segmented: All | Popular | New [active: 0]
  card: "Sneakers · $89"
  tabbar: Shop | Cart | Account [active: 0]
  fab
}
screen Settings [window] {
  breadcrumbs: Home | Account | Settings [active: 2]
  avatar [third]
  input: Display name [two-thirds]
  toggle: Marketing emails [off]
  checkbox: Email me updates [checked]
  button: Save [half, primary]
  button: Discard [half]
}
