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
