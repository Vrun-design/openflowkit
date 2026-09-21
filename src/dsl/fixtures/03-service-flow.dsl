%% ofk 1
flowchart right
title: Order processing

Browser [blue]
API [rounded, violet, shadow]
Queue [queue, orange]
Worker [rounded, green]
Orders [cylinder, teal]

Browser -> API : POST /orders
API -> Orders : save
API --> Queue : publish
Queue -> Worker : consume
Worker -> Orders : update status
