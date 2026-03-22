---
draft: false
title: Collaboration & Sharing
description: Oda bağlantıları paylaşın, local-only fallback davranışını anlayın ve OpenFlowKit ortak çalışma akışlarını doğru kullanın.
---

OpenFlowKit, varsayılan local-first davranışı korurken paylaşım bağlantıları ve ortak çalışma odası akışlarını destekler.

## Paylaşım akışında neler bulunur?

- oda kimliği
- davet URL’si
- izleyici sayısı
- katılımcı rozetleri
- bağlantı durumu: realtime, connecting veya local-only fallback

## Ne zaman paylaşım, ne zaman dışa aktarma?

Paylaşımı şu durumlarda kullanın:

- diyagram etkileşimli kalacaksa
- başkaları aynı çalışma oturumuna katılacaksa
- oda temelli ortak çalışma gerekiyorsa

Dışa aktarmayı şu durumlarda kullanın:

- dosya/artifact gerekiyorsa
- hedef sunum, doküman veya tasarım aracıysa
- kalıcı bir teslim dosyası gerekiyorsa
