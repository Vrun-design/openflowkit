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
