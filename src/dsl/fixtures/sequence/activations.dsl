%% ofk 1
sequence
title: Activation and self call

Alice
Bob

Alice -> Bob : request
activate Bob
Bob -> Bob : validate
Bob -->> Alice : accepted
deactivate Bob
Alice -> Alice : show result
