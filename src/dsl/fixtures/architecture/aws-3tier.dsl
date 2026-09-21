%% ofk 1
architecture down
title: AWS three-tier service

Users [person]
Gateway [aws/api-gateway]
Compute [aws/lambda]
Storage [aws/s3]

Users -> Gateway : HTTPS
Gateway -> Compute : invoke
Compute -> Storage : objects
