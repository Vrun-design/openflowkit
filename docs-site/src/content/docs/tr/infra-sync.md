---
draft: false
title: Infrastructure Sync (Living Diagrams)
description: Terraform state, Kubernetes manifestleri ve Docker Compose dosyalarını AI sağlayıcısına ihtiyaç duymadan doğrudan diyagrama dönüştürün.
---

Infrastructure Sync, gerçek altyapı dosyalarını deterministik şekilde OpenFlowKit diyagramlarına dönüştürür.

## Desteklenen formatlar

- Terraform State (`.tfstate` JSON)
- Kubernetes YAML
- Docker Compose YAML
- gerektiğinde AI destekli yol üzerinden Terraform HCL

## Ne zaman kullanılmalı?

- elinizde gerçek altyapı dosyaları varsa
- deterministik parse gerekiyorsa
- çevrimdışı dostu içe aktarma istiyorsanız
- mimari inceleme için düzenlenebilir başlangıç noktası istiyorsanız

## Sonrasında ne olur?

Oluşturulan sonuç yine normal bir OpenFlowKit diyagramıdır. Uyguladıktan sonra düzen, açıklama, dışa aktarma ve karşılaştırma akışlarına devam edebilirsiniz.
