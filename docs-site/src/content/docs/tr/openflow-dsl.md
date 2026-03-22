---
draft: false
title: OpenFlow DSL
description: OpenFlowKit diyagramları için editör-doğal metin temsili olan OpenFlow DSL’i kullanın.
---

OpenFlow DSL, OpenFlowKit Studio’da kullanılan yerel metinsel temsildir. Kod tabanlı bir çalışma istiyor ama editör modeline yakın kalmak istiyorsanız en iyi seçenektir.

## Nerede doğru seçimdir?

OpenFlow DSL’i şu durumlarda tercih edin:

- okunabilir ve editör-doğal bir sözdizimi istediğinizde
- düzen öncesi deterministik yapısal değişiklikler yapmak istediğinizde
- Mermaid’e göre OpenFlowKit’e daha yakın bir temsil gerektiğinde
- yapay zekanın ham JSON yerine daha iyi hedefleyebileceği bir format istediğinizde

Studio içindeki Code alanı, mevcut tuvalden DSL üretebilir ve DSL’i tekrar grafiğe uygulayabilir.

Ekosistem uyumluluğu daha önemliyse Mermaid kullanın. Bkz. [Mermaid vs OpenFlow](/tr/mermaid-vs-openflow/).

## Temel belge yapısı

```yaml
flow: "Kullanıcı Kaydı"
direction: TB
```

Yaygın yön değerleri:

- `TB`
- `LR`
- `RL`
- `BT`

## Düğümler

Kararlı kimliklere sahip açık düğüm tanımları kullanın:

```text
node signup [label: "Kayıt Formu"]
node verify [label: "E-postayı Doğrula"]
node success [label: "Çalışma Alanı Hazır", shape: capsule]
```

İyi kimlikler:

- kısa
- küçük harfli
- anlamlı
- düzenlemeler arasında mümkün olduğunca kararlı

## Kenarlar

```text
signup -> verify
verify -> success
```

Gerekirse etiket ve ek meta veri de ekleyebilirsiniz.

## Neden ekipler bunu kullanır?

- OpenFlowKit ana düzenleme ortamıysa
- graf kod olarak incelenecekse
- editör içi sadakat uyumluluktan daha önemliyse
- yapay zekaya editör-doğal bir hedef sağlamak istiyorsanız
