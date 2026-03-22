---
draft: false
title: Mermaid Integration
description: OpenFlowKit’i görsel düzenleme yüzeyi olarak kullanırken Mermaid içe aktarın, düzenleyin, doğrulayın ve dışa aktarın.
---

OpenFlowKit, Mermaid için içe aktarma, düzenleme ve dışa aktarma yolları sunar. Ancak Mermaid’i editörün tek doğruluk kaynağı değil, bir uyumluluk katmanı olarak düşünmek gerekir.

## Mermaid ne zaman doğru seçimdir?

Mermaid’i şu durumlarda kullanın:

- diyagramlarınız zaten dokümanlarda veya repo içinde Mermaid olarak yaşıyorsa
- Markdown dostu metinsel format gerekiyorsa
- başka bir araç Mermaid bekliyorsa

## Studio içinde Mermaid

Studio’nun Code alanında Mermaid modu vardır. Burada:

- mevcut tuvalden üretilen Mermaid’i görebilir
- doğrudan Mermaid düzenleyebilir
- parse edilen grafiği tekrar editöre uygulayabilir
- parse hatalarında tanılama görebilirsiniz

## Sadakat beklentisi

Mermaid round-trip faydalıdır, ancak OpenFlowKit’in tüm kavramları birebir eşlenmez. Özellikle şu konularda dikkatli olun:

- elle ince ayarlanmış yerleşimler
- sağlayıcı ikonlarıyla çalışan mimari sunumlar
- editörde daha zengin olan aileye özgü semantik alanlar

Tam geri kazanım gerekiyorsa Mermaid ile birlikte JSON da saklayın.

## Önerilen desen

Mermaid’i çoğu zaman yayınlama veya uyumluluk katmanı olarak kullanın. Asıl düzenleme kaynağı olarak JSON veya OpenFlow DSL tutmak genellikle daha güvenlidir.
