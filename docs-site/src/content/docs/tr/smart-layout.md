---
draft: false
title: Smart Layout
description: ELK tabanlı düzen ile kaba grafikleri daha okunabilir diyagramlara dönüştürün.
---

OpenFlowKit, kaba grafikleri hızlı biçimde daha okunabilir diyagramlara dönüştürmek için ELK tabanlı düzen stratejileri kullanır.

## Otomatik düzen ne zaman kullanılmalı?

- şablonun yapısı doğru ama görünümü dağınıksa
- yapay zeka doğru düğümleri üretip kötü konumlandırdıysa
- kod veya içe aktarma sonrası normalizasyon gerekiyorsa
- elle eklenen dallar yüzünden boşluklar bozulduysa

## Nasıl çalıştırılır?

Komut Merkezi’ni açın ve **Auto Layout** seçin. Editör yön, algoritma ve boşluk tercihlerini düzen motoruna geçirir.

Yaygın yönler:

- `TB`
- `LR`
- `RL`
- `BT`

## Düzenin güçlü olduğu alanlar

- akış şemaları
- mimari grafikler
- dallanan durum diyagramları
- yapay zeka ile üretilmiş ilk taslaklar

Elle kurgulanmış sunum tarzı diyagramlarda ise her zaman sihirli sonuç vermez.

## Pratik strateji

1. önce doğru düğüm ve kenarları kurun
2. ardından düzeni çalıştırın
3. gerekirse bölümlerle gruplayın
4. son görsel ayarları elle yapın

Yerleşimi düzen çalıştırmadan önce elle mükemmelleştirmeye çalışmak çoğu zaman boşa emektir.
