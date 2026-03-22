---
draft: false
title: AI Generation
description: FlowPilot, BYOK sağlayıcılar, koddan mimari üretimi ve yapılandırılmış içe aktarma ile diyagram üretin ve geliştirin.
---

OpenFlowKit, Studio alanı üzerinden yapay zeka destekli diyagram üretimi sunar. FlowPilot özellikle ilk taslak, yapısal revizyon ve kod tabanlı mimari görünümü üretmek için güçlüdür.

## Üründe AI nerede yer alır?

AI akışları Studio içindeki **FlowPilot** alanında ve Komut Merkezi üzerinden açılan **Open FlowPilot** eyleminde bulunur.

| Mod | Ne yapar |
| --- | --- |
| **FlowPilot** | sohbet tabanlı üretim ve revizyon |
| **From Code** | kaynak koddan mimari diyagram taslağı |
| **Import** | SQL, Terraform, K8s veya OpenAPI girdilerinden taslak |

Tipik üretim akışı:

1. istem ve varsa görsel alınır
2. yapılandırılmış sağlayıcıya gönderilir
3. yapısal graf temsili geri alınır
4. düğüm ve kenarlar oluşturulur
5. düzen uygulanır
6. mevcut graf değiştirilir veya güncellenir

## Sağlayıcı modeli

Uygulama birden çok BYOK sağlayıcıyı destekler:

- Gemini
- OpenAI
- Claude
- Groq
- NVIDIA
- Cerebras
- Mistral
- OpenRouter
- özel OpenAI-uyumlu uç nokta

## AI ne zaman doğru araçtır?

Şu durumlarda kullanın:

- elinizde sadece doğal dil açıklaması varsa
- hızlı bir ilk taslak istiyorsanız
- mevcut diyagramı kavramsal olarak yeniden şekillendirmek istiyorsanız
- kaynak koddan yüksek seviyeli mimari çıkarımı almak istiyorsanız

Şu durumlarda başka akışlar daha iyidir:

- zaten kesin bir metinsel temsil varsa
- deterministik altyapı parse’ı istiyorsanız
- küçük diyagramı elle çizmek daha hızlıysa

## Daha iyi sonuç almak için

İyi istemler genellikle şunları içerir:

- hedef kitle
- sistemler veya aktörler
- önemli dallar ve hata yolları
- istenen yön
- istenen detay seviyesi

## Önerilen iş akışı

1. FlowPilot ile ilk taslağı üretin
2. tuval üzerinde yapıyı kontrol edin
3. [Properties Panel](/tr/properties-panel/) ile ayrıntıları düzeltin
4. gerekiyorsa [Smart Layout](/tr/smart-layout/) uygulayın
5. sonraki büyük revizyondan önce snapshot alın

## İlgili sayfalar

- [Ask Flowpilot](/tr/ask-flowpilot/)
- [Studio Overview](/tr/studio-overview/)
- [Choose an Input Mode](/tr/choose-input-mode/)
- [Prompting AI Agents](/tr/prompting-agents/)
