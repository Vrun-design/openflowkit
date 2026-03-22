---
draft: false
title: Node Types
description: OpenFlowKit’teki temel düğüm ailelerini ve bunların hangi diyagram iş akışlarına uyduğunu anlayın.
---

OpenFlowKit hem genel amaçlı hem de aileye özgü düğümleri destekler. Uygulamadaki düğüm modeli akış, mimari, zihin haritası, journey, sınıf, ER, açıklama, gruplama ve medya senaryolarını kapsar.

## Temel düğüm aileleri

### Flow düğümleri

En sık kullanılan temel yapı taşları:

- `start`
- `process`
- `decision`
- `end`
- `custom`

### Mind map düğümleri

Ek yapısal bilgiler taşırlar:

- derinlik
- ebeveyn
- sol/sağ taraf
- dal stili

### Architecture ve varlık tabanlı düğümler

Mimari diyagramlar sağlayıcı ikonları, sınırlar ve bölümler ile daha güçlü okunabilirlik kazanır.

### Journey ve deneyim odaklı düğümler

Aşama, aktör ve skor gibi bilgilerin önemli olduğu süreçler için daha uygundur.

### Medya ve wireframe düğümleri

OpenFlowKit ayrıca görsel düğümleri ile browser/mobile wireframe yüzeylerini destekler.

## Nasıl seçilmeli?

Sadece şekle göre değil, diyagramın semantiğine göre seçim yapın:

- genel süreçler için flow düğümleri
- sistem topolojisi için architecture düğümleri
- dallanan fikir yapıları için mind map düğümleri
- deneyim haritaları için journey düğümleri
