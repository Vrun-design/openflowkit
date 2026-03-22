---
draft: false
title: Canvas Basics
description: OpenFlowKit tuvalinde gezinmeyi, seçim yapmayı, düzenlemeyi ve çalışmanızı geri kazanmayı öğrenin.
---

Tuval, OpenFlowKit’in ana düzenleme yüzeyidir. Doğrudan graf üzerinde çalışmayı ve kesin düzenlemeleri yan panellerle birleştirir.

## Tuvali ne zaman kullanmalısınız?

Tuvali şu durumlarda kullanın:

- diyagramı manuel olarak çizmek istediğinizde
- yapay zeka, içe aktarma veya koddan gelen bir sonucu iyileştirmek istediğinizde
- yapıyı metin yerine mekânsal olarak değerlendirmek istediğinizde
- doğrudan sürükle-bırak düzenleme yapmak istediğinizde

## Gezinme

### Kaydırma ve yakınlaştırma

- Fare tekerleği ile yakınlaşın veya uzaklaşın
- `Space + Drag` ile kaydırın
- `H` el moduna geçer
- `V` seçim moduna döner
- `Shift + 1` mevcut grafiği görünüşe sığdırır
- `Cmd/Ctrl + +/-` yakınlaştırma kontrolü sağlar

### Büyük diyagramlarda gezinme

- görünüşe sığdırmayı kullanın
- Komut Merkezi aramasıyla düğümlere atlayın
- yapı doğruysa otomatik düzeni kullanın

## Seçim

### Tekli seçim

Bir düğüme veya kenara tıklayarak inceleyip düzenleyin.

### Çoklu seçim

- `Shift + Click`
- `Shift + Drag` ile seçim kutusu

Birden fazla düğüm seçildiğinde sağ panel toplu düzenleme moduna geçer.

## Doğrudan düzenleme ve kesin düzenleme

Tuval, grafiği hareket ettirdiğiniz ve yapılandırdığınız yüzeydir. Kesin değerler ve aileye özgü ayarlar için [Properties Panel](/tr/properties-panel/) kullanın. Şablonlar, arama, düzen ve iş akışı geçişleri için [Command Center](/tr/command-center/) daha doğrudur.

## Geçmiş ve kurtarma

Kısa düzeltmeler için undo/redo, büyük geri dönüşler için snapshot kullanın. Bkz. [Playback & History](/tr/playback-history/).
