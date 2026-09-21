%% ofk 1
erd
title: Alias forms

customer [green] { id int pk }
invoice { id int pk }

customer 1:N invoice : owns
invoice -> customer : billed
