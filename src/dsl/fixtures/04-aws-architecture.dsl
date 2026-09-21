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
