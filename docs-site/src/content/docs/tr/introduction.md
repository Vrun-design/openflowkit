---
draft: false
title: Introduction
description: OpenFlowKit; teknik akışlar, mimari diyagramlar, kod tabanlı temsil ve yapay zeka destekli düzenleme için local-first bir diyagram çalışma alanıdır.
---

OpenFlowKit, teknik ekipler için tasarlanmış local-first bir diyagram çalışma alanıdır. Görsel tuvali, kod dostu temsilleri, deterministik içe aktarma yollarını, yapay zeka destekli üretimi ve paylaşım/dışa aktarma akışlarını tek bir tarayıcı tabanlı üründe birleştirir.

## OpenFlowKit nerede güçlüdür?

OpenFlowKit özellikle diyagramın zaman içinde evrilmesi gereken durumlarda güçlüdür:

- boş tuval, şablon, yapay zeka istemi, kod temsili veya mevcut kaynak girdiden başlayabilirsiniz
- sonucu tek seferlik bir çıktı gibi değil, düzenlenebilir bir çalışma yüzeyi gibi geliştirebilirsiniz
- gerektiğinde metinsel temsili editör modeline yakın tutabilirsiniz
- aynı diyagramı dokümantasyon, tasarım ve paylaşım iş akışlarına taşıyabilirsiniz

## Ürünün temel yüzeyleri

Mevcut ürün dört ana yüzey etrafında şekillenir:

- doğrudan düzenleme için görsel tuval
- arama, şablon, varlık, düzen ve tasarım sistemleri için komut merkezi
- yapay zeka, kod, içe aktarma, infra senkronizasyonu ve lint akışları için Studio alanı
- editör dışına taşımak için dışa aktarma, gömme ve paylaşım akışları

## Uygulamadaki diyagram aileleri

Editör şu diyagram türlerini birinci sınıf olarak destekler:

- `flowchart`
- `stateDiagram`
- `classDiagram`
- `erDiagram`
- `gitGraph`
- `mindmap`
- `journey`
- `architecture`

Buna ek olarak genel amaçlı akış düğümleri, mimari ikon düğümleri, açıklamalar, bölümler, görseller ve wireframe yüzeyleri de bulunur.

## Temel kavramlar

### Varsayılan olarak local-first

Diyagram durumu varsayılan olarak tarayıcıda kalır. Ne zaman dışa aktaracağınızı, paylaşacağınızı veya bir ortak çalışma odasına gireceğinizi siz belirlersiniz.

### Birden fazla giriş modu

OpenFlowKit tek bir kaynak doğruluğu modeline sizi zorlamaz. Görsel düzenleme, yapay zeka, OpenFlow DSL, Mermaid veya yapılandırılmış içe aktarma arasında ihtiyaç bazlı geçiş yapabilirsiniz.

### Düzenlenebilir çıktılar

Üretilen veya içe aktarılan diyagramlar ölü ekran görüntülerine dönüşmez; aynı düzenlenebilir tuval modeline geri gelir.

## Buradan başlayın

- En hızlı ilk kullanım akışı için [Quick Start](/tr/quick-start/) sayfasını okuyun.
- Yapay zeka, kod ve içe aktarma yüzeyleri için [Studio Overview](/tr/studio-overview/) sayfasını açın.
- Nereden başlamanız gerektiğinden emin değilseniz [Choose an Input Mode](/tr/choose-input-mode/) sayfasına gidin.
