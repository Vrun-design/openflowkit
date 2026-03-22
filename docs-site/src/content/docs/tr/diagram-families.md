---
draft: false
title: Diagram Families
description: Akışlar, mimari haritalar, zihin haritaları, journey diyagramları, sınıf diyagramları ve ER diyagramları için doğru OpenFlowKit ailesini seçin.
---

OpenFlowKit birden fazla diyagram ailesini destekler; çünkü her problem aynı düğüm ve kenar modeline zorlanmamalıdır.

## Mevcut aileler

| Aile | En uygun kullanım |
| --- | --- |
| `flowchart` | Genel süreç ve sistem akışları |
| `architecture` | Bulut, servis ve platform diyagramları |
| `mindmap` | Dallanarak düşünme ve hiyerarşik fikirler |
| `journey` | Kullanıcı veya süreç yolculukları |
| `stateDiagram` | Durum geçişleri |
| `classDiagram` | Nesne modelleme ve ilişkiler |
| `erDiagram` | Tablolar ve ilişkisel yapı |
| `gitGraph` | Git geçmişi ve branch akışları |

## Nasıl seçilir?

Şekle değil, diyagramın anlamsal ihtiyacına göre seçim yapın.

- süreç odaklıysa `flowchart`
- sistem topolojisi önemliyse `architecture`
- hiyerarşi önemliyse `mindmap`
- aşama ve aktör önemliyse `journey`
