---
draft: false
title: Playback & History
description: Çalışmanızı geri kazanmak ve diyagram evrimini izlemek için undo, snapshot ve oynatma durumunu kullanın.
---

OpenFlowKit’te iki farklı ama ilişkili kurtarma sistemi vardır:

- standart undo/redo geçmişi
- belge veya sekme üzerinde saklanan snapshot tabanlı geçmiş ve playback durumu

## Undo ve redo

Kullanın:

- `Cmd/Ctrl + Z` undo
- `Cmd/Ctrl + Shift + Z` redo

Bu, aktif düzenleme sırasında en hızlı geri dönüş yoludur.

## Snapshot’lar

Şu durumlarda snapshot kullanın:

- büyük bir yapay zeka yeniden yazımı öncesinde
- diyagram ailesi yönünü değiştirirken
- Studio’dan geniş kapsamlı metin uygulamadan önce
- büyük bir mimari haritayı yeniden yapılandırırken

Snapshot’lar, özellikle büyük değişikliklerde gerçek güvenlik ağıdır.

## Playback modeli

Veri modeli playback sahneleri, adımlar ve zamanlı dizileri destekler. Bu nedenle video veya GIF gibi animasyonlu dışa aktarma akışlarıyla birlikte anlamlıdır.

## Pratik öneri

- küçük düzeltmeler için undo/redo kullanın
- önemli kilometre taşları için snapshot alın

Bir sonraki işlem grafiği ciddi biçimde değiştirecekse önce snapshot oluşturun.
