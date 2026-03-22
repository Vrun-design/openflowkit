---
draft: false
title: Import from Structured Data
description: SQL, OpenAPI, Terraform ve Kubernetes kaynak metnini Studio içinden düzenlenebilir diyagramlara dönüştürün.
---

Studio içindeki yapılandırılmış içe aktarma akışları, mevcut kaynak metinleri düzenlenebilir diyagramlara dönüştürür.

## Ne zaman kullanılmalı?

- elinizde zaten SQL DDL varsa
- OpenAPI spesifikasyonundan servis görünümü üretmek istiyorsanız
- Terraform veya K8s metninden ilk taslağı almak istiyorsanız

## Nasıl çalışır?

Kaynak metni yapıştırın, uygun modu seçin ve diyagramı üretin. Girdi türüne göre OpenFlowKit ya uzmanlaşmış AI destekli akış ya da daha deterministik parse akışı kullanır.

Tamamen deterministik altyapı parse’ı gerektiğinde [Infrastructure Sync](/tr/infra-sync/) kullanın.
