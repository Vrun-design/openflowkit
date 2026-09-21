# OpenFlow DSL test examples

Open **Diagram as code** from workspace rail or press `⌥D`. Paste an example, then
press `⌘↵` (`Ctrl+Enter` on Windows/Linux). Generated diagram is one undo step.

## 1. Tiny connection

Expected: three nodes and two automatic orthogonal connectors.

```ofk
%% ofk 1
flowchart

Idea -> Build -> Ship
```

## 2. Decision flow

Expected: ellipse start/end nodes, diamond decision, labelled branches.

```ofk
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
```

## 3. Horizontal service flow

Expected: left-to-right layout, styled storage nodes, dashed async edge.

```ofk
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
```

## 4. AWS architecture icons

Expected: bundled AWS icons above labels. Unknown icons should fall back to plain nodes
with diagnostic `W132`.

```ofk
%% ofk 1
architecture down
title: Serverless upload pipeline

Client [person]
Gateway [aws/api-gateway]
Resize [aws/lambda, green]
Bucket [aws/simple-storage-service, orange]
Events [aws/eventbridge, violet]

Client -> Gateway : upload
Gateway -> Resize : invoke
Resize -> Bucket : write image
Resize --> Events : publish result
```

Unknown-icon check:

```ofk
%% ofk 1
architecture

Known [aws/lambda]
Fallback [icon: aws/not-a-real-service]
Known -> Fallback
```

## 5. Groups and boundaries

Expected: two framed tiers, children assigned to their first group, cross-boundary edges.

```ofk
%% ofk 1
architecture right
title: Web application boundaries

group Edge [blue] {
  CDN [aws/cloudfront]
  Gateway [aws/api-gateway]
  CDN -> Gateway : HTTPS
}

group Services [violet] {
  API [aws/lambda]
  Jobs [aws/lambda]
  Queue [aws/simple-queue-service]
  API --> Queue : enqueue
  Queue -> Jobs : consume
}

Database [aws/rds, orange]
Objects [aws/simple-storage-service, green]

Gateway -> API : invoke
API -> Database : read/write
Jobs -> Objects : store
```

## 6. Nested architecture

Expected: nested frames remain nested after generate, serialize, and regenerate.

```ofk
%% ofk 1
architecture down
title: Platform control plane

group Cloud [blue] {
  group Public edge [violet] {
    Load balancer [aws/elastic-load-balancing]
    Web application [aws/lambda]
    Load balancer -> Web application : route
  }

  group Private services [green] {
    Application API [rounded]
    Background worker [rounded]
    Work queue [queue, orange]
    Application API --> Work queue : schedule
    Work queue -> Background worker : deliver
  }
}

Users [person]
Primary database [cylinder, blue]

Users -> Load balancer : HTTPS
Web application -> Application API : JSON
Application API -> Primary database : SQL
Background worker -> Primary database : update
```

## 7. Explicit IDs and duplicate-looking labels

Expected: stable IDs survive regeneration; long labels remain readable.

```ofk
%% ofk 1
architecture right
title: Stable identity test

public_api = Public API [rounded, blue]
internal_api = Internal API [rounded, violet]
primary_db = Customer records [cylinder, green]
audit_db = Customer records archive [cylinder, gray]

public_api -> internal_api : authorize
internal_api -> primary_db : query
internal_api --> audit_db : audit
```

## 8. Fan-out, fan-in, reverse, and bidirectional edges

Expected: fans expand into separate connectors; reverse edge normalizes to forward form
when serialized.

```ofk
%% ofk 1
flowchart right
title: Connector syntax

Source -> Alpha, Beta, Gamma : distribute
Alpha, Beta, Gamma -> Join : collect
Archive <- Join
Join <-> Coordinator : synchronize
Coordinator <--> Replica : delayed sync
```

## 9. Forgiving diagnostics

Expected: valid lines render despite bad input. Panel shows unknown-attribute,
unclosed-attribute, and unknown-icon diagnostics.

```ofk
%% ofk 1
flowchart

Good [green]
Unknown style [octahedron, chartreuse]
Broken [blue
Known icon [aws/lambda]
Missing icon [icon: aws/definitely-missing]

Good -> Unknown style : still renders
Known icon --> Missing icon : warning path
```

## 10. Heavy architecture

Expected: worker layout keeps editor responsive; frames, icons, parallel edges, and
cross-boundary connections render as one generated frame.

```ofk
%% ofk 1
architecture right
title: Multi-region commerce platform

group Clients [blue] {
  Web [browser]
  Mobile [mobile]
  Partner API [rounded]
}

group Global edge [violet] {
  CDN [aws/cloudfront]
  WAF [aws/waf]
  Gateway [aws/api-gateway]
  CDN -> WAF : filtered traffic
  WAF -> Gateway : route
}

group Region primary [green] {
  Auth [aws/cognito]
  Catalog [aws/lambda]
  Cart [aws/lambda]
  Checkout [aws/lambda]
  Orders [aws/lambda]
  Payments [rounded, orange]
  Search [rounded, blue]
  Jobs [aws/lambda]
  Events [aws/eventbridge]
  Work queue [aws/simple-queue-service]
  Cache [cylinder, orange]
  Primary DB [aws/rds, blue]
  Objects [aws/simple-storage-service, green]

  Gateway -> Auth : authenticate
  Gateway -> Catalog : browse
  Gateway -> Cart : basket
  Gateway -> Checkout : purchase
  Catalog -> Cache : hot reads
  Catalog -> Search : query
  Cart -> Cache : session
  Checkout -> Payments : authorize
  Checkout -> Orders : create
  Orders -> Primary DB : persist
  Orders --> Events : order.created
  Events --> Work queue : fan out
  Work queue -> Jobs : consume
  Jobs -> Objects : write artifacts
  Jobs -> Primary DB : update status
}

group Region recovery [gray] {
  Recovery API [aws/lambda]
  Recovery DB [aws/rds]
  Recovery objects [aws/simple-storage-service]
  Recovery API -> Recovery DB : read replica
  Recovery API -> Recovery objects : restore
}

Web -> CDN : HTTPS
Mobile -> CDN : HTTPS
Partner API -> Gateway : signed requests
Primary DB --> Recovery DB : replicate
Objects --> Recovery objects : replicate
Events --> Recovery API : recovery events
```

## 11. Regeneration and undo test

1. Generate example 2.
2. Add `Ready -> Done : skip` to source and generate again.
3. Confirm frame ID and position stay unchanged.
4. Press Undo once. Added connector must disappear and previous frame return completely.
5. Redo once. Regenerated frame must return completely.

## 12. Canvas-to-code test

1. Generate example 3.
2. Close code panel.
3. Move or rename one generated node.
4. Right-click generated outer frame → **Edit as code**.
5. Confirm panel says canvas was edited and shows serialized current canvas state.
6. Generate again. Confirm warning disappears and code becomes authoritative.

## 13. Layout cancellation stress test

Create 500 chained nodes in browser console, paste result into panel, then generate twice
quickly. First layout must cancel; only second result may commit.

```js
const nodes = Array.from({ length: 500 }, (_, index) => `Node ${index + 1}`);
copy(`%% ofk 1\nflowchart right\n\n${nodes.join(' -> ')}`);
```

Expected: 500 nodes, 499 connectors, responsive panel/canvas during worker layout, and one
final history entry for successful generation.
