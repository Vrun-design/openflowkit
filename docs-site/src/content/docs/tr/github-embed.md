---
draft: false
title: Embed Diagrams in GitHub
description: OpenFlowKit diyagramları için izleyici bağlantıları üretin ve bunları GitHub odaklı dokümantasyon akışlarında kullanın.
---

OpenFlowKit diyagramlarını GitHub README veya başka Markdown tabanlı belgelerde etkileşimli, salt okunur görünüm bağlantılarıyla paylaşabilirsiniz.

## Ne zaman faydalıdır?

- ekip dokümantasyonu Markdown içinde yaşıyorsa
- statik PNG yerine daha zengin bir deneyim istiyorsanız
- okuyucunun diyagramı editörde açabilmesini istiyorsanız

## Temel fikir

OpenFlow DSL içeriği URL güvenli biçimde kodlanır ve `/view` rotasına aktarılır. Böylece harici servis veya GitHub uygulaması gerekmeden izleyici bağlantısı elde edilir.
