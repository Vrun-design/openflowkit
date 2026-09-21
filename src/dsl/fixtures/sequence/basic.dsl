%% ofk 1
sequence
title: Login flow

participant Browser [actor]
API = API Gateway
Database [db]

Browser -> API : POST /login
API -> Database : SELECT user
Database --> API : row
API -->> Browser : 200 token
