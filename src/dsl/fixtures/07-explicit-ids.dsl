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
