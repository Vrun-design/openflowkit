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
