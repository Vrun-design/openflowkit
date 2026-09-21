%% ofk 1
sequence
title: Payment retries

Client -> Gateway : pay
alt authorized {
  Gateway -> Bank : charge
  Bank -->> Gateway : ok
} else declined {
  Gateway -->> Client : error
  opt retryable {
    Client -> Gateway : retry
  }
}
loop every 5s {
  Gateway -> Bank : poll
}
