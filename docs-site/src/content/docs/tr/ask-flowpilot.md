---
draft: false
title: Ask Flowpilot
description: FlowPilot’i Studio içindeki sohbet tabanlı yardımcı olarak kullanın; diyagram taslağı üretin, revize edin ve yön değiştirin.
---

FlowPilot, Studio içindeki sohbet tabanlı asistandır. Bir diyagramı doğal dille tarif etmek, mevcut bir taslağı yeniden kurmak veya farklı bir yapısal yaklaşım istemek için en hızlı yoldur.

## İyi kullanım senaryoları

FlowPilot’i şu durumlarda kullanın:

- metin isteminden ilk taslağı üretmek için
- mevcut sistemi daha temiz bir yapıya çevirmek için
- eksik hata yollarını ve dalları eklemek için
- kod veya yapılandırılmış girdiden ilk diyagram taslağını almak için

## İsteminizde ne olmalı?

İyi istemler genelde şunları içerir:

- hedef kitle
- sistemler veya aktörler
- önemli dallar veya kısıtlar
- tercih edilen yön (`LR`, `TB` gibi)
- yüksek seviye mi, detaylı operasyon akışı mı istendiği

## Örnek istem

```text
Şu bileşenleri içeren soldan sağa bir SaaS mimarisi oluştur:
web istemcisi, API gateway, auth servisi, billing servisi,
Postgres, Redis cache, background workers ve S3 tabanlı dosya saklama.
Public ingress, async işler ve hata işleme yollarını göster.
```

## Üretimden sonra ne yapılmalı?

FlowPilot en güçlü halini taslak üreticisi olarak gösterir, son editör olarak değil. Üretimden sonra:

- yapıyı tuvalde inceleyin
- [Properties Panel](/tr/properties-panel/) ile etiket ve görsel ayarları düzeltin
- gerekirse [Smart Layout](/tr/smart-layout/) ile yerleşimi toplayın
- yeni büyük revizyonlardan önce snapshot alın

## İlgili sayfalar

- [AI Generation](/tr/ai-generation/)
- [Prompting AI Agents](/tr/prompting-agents/)
- [Choose an Input Mode](/tr/choose-input-mode/)
