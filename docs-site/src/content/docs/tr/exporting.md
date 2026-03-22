---
draft: false
title: Exporting
description: Diyagramları OpenFlowKit’ten görsel, oynatma medyası, JSON, kod formatları, tasarım aracı aktarımı veya paylaşım/gömme akışları olarak dışa aktarın.
---

Dışa aktarma menüsü editörün sağ üstünde yer alır ve hem indirilen dosyaları hem de panoya kopyalanan formatları kapsar.

## İndirilen formatlar

### PNG ve JPG

Şunlar için kullanın:

- dokümanlar
- slaytlar
- ticket sistemleri
- hızlı görsel paylaşım

PNG genellikle şeffaflık ve netlik açısından daha iyi varsayılandır. JPG ise beyaz arka planlı hafif paylaşım için uygundur.

### SVG

Web, dokümantasyon ve ölçeklenebilir tasarım kullanımları için en iyi seçenektir.

### JSON

OpenFlowKit’e en yüksek sadakatle geri içe aktarılabilen ana arşiv formatıdır. Şunlar için kullanın:

- yedekleme
- düzenlenebilir ana kopya saklama
- tarayıcılar arası aktarım
- ileri tarihte tekrar düzenlenecek diyagramlar

### Oynatma videosu ve GIF

Değişimin zaman içinde anlatılması gereken akışlar için kullanın.

## Panoya kopyalanan formatlar

- OpenFlow DSL
- Mermaid
- PlantUML
- Figma editable export

Bu formatlar bir sonraki araç metin veya tasarım düzeyinde girdi beklediğinde daha uygundur.

## Paylaşım

Menüdeki **Share / Embed** seçeneği izleyici bağlantısı ve iş birliği odası akışları içindir.

## Önerilen yaklaşım

Çoğu ciddi kullanım için iyi bir desen şudur:

1. JSON’u düzenlenebilir ana kopya olarak saklayın
2. sunum için görsel format dışa aktarın
3. metin iş akışı gerekiyorsa Mermaid veya DSL üretin
4. etkileşim gerekiyorsa paylaşım/gömme akışını kullanın
