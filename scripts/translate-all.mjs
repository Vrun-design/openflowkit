import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const LOCALES = path.join(ROOT, 'src', 'i18n', 'locales');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
}
function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function flatten(obj, prefix = '', out = {}) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return out;
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? prefix + '.' + k : k;
    if (typeof v === 'string') out[key] = v;
    else if (typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
  }
  return out;
}

function getByPath(obj, dotted) {
  return dotted
    .split('.')
    .reduce((acc, k) => (acc && typeof acc === 'object' && k in acc ? acc[k] : undefined), obj);
}
function setByPath(obj, dotted, value) {
  const parts = dotted.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object' || Array.isArray(cur[parts[i]]))
      cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}
function deleteByPath(obj, dotted) {
  const parts = dotted.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur || typeof cur !== 'object' || !(parts[i] in cur)) return;
    cur = cur[parts[i]];
  }
  if (cur && typeof cur === 'object') delete cur[parts[parts.length - 1]];
}

// ─── Turkish translations ───
const tr = {
  'common.rename': 'Yeniden Adlandır',
  'nav.beta': 'BETA',
  'nav.privacyMessage': 'Diyagramlarınız sizinle kalır ve sunucularımıza ulaşmaz.',
  'export.headingFormat': 'Dışa Aktarma Biçimi',
  'export.svg': 'SVG Olarak Dışa Aktar',
  'export.video': 'Oynatma Videosu',
  'export.gif': 'Oynatma GIF',
  'export.revealVideo': 'Videoyu Göster',
  'export.revealGif': 'GIF Göster',
  'export.cinematicVideo': 'Sinematik Yapım Videosu',
  'export.cinematicGif': 'Sinematik Yapım GIF',
  'export.share': 'Canlı tuvali paylaş',
  'export.actionDownload': 'İndir',
  'export.exportOrShare': 'Bu tuvali dışa aktar veya paylaş',
  'export.shareSection': 'Tuvali paylaş',
  'export.openflowdslLabel': '{{appName}} DSL',
  'export.hintSvgScalable': 'Ölçeklenebilir vektör dosyası',
  'export.hintPlaybackWebM': 'Oynatma zaman çizelgesi (WebM/MP4)',
  'export.hintPlaybackGif': 'Belgeler/sosyal medya için kısa döngü',
  'export.hintRevealVideo': 'Düğümler sırayla belirir (WebM/MP4)',
  'export.hintRevealGif': 'Belgeler/sosyal medya için animasyonlu gösterim',
  'export.hintCinematicVideo': 'Karanlık lansman tarzı yapım',
  'export.hintCinematicGif': 'Karanlık sosyal medya döngüsü',
  'export.hintShareViewer': 'Bu oda için davet bağlantısı',
  'export.readmeEmbed': 'README Yerleşimi',
  'export.hintReadmeEmbed': 'Markdown snippet kopyala',
  'export.sectionImage': 'Görsel',
  'export.sectionVideo': 'Video ve Animasyon',
  'export.sectionCode': 'Kod ve Veri',
  'nodes.mindmap': 'Konu',
  'nodes.text': 'Metin',
  'nodes.image': 'Görsel',
  'nodes.group': 'Grup',
  'nodes.items': 'öğe',
  'landing.nav.figma': 'Figma',
  'landing.hero.publicBeta': 'v1.0 Genel Beta',
  'landing.pricing.openSource': 'Açık Kaynak',
  'home.autosaved': 'Otomatik kaydedildi',
  'home.currentFlow': 'Mevcut akış',
  'home.localStorageHint':
    'Bu cihazda otomatik kaydedildi. Diyagram verilerinizi sunucularımıza yüklemiyoruz.',
  'home.renameFlow.title': 'Akışı yeniden adlandır',
  'home.renameFlow.description': 'Gösterge panelinizde ve editörde görünen adı güncelleyin.',
  'home.renameFlow.label': 'Akış adı',
  'home.renameFlow.placeholder': 'Bir akış adı girin',
  'home.renameFlow.hint':
    'Adlar, dışa aktarmadığınız veya başka bir yerde senkronize etmediğiniz sürece bu tarayıcı profilinde yereldir.',
  'home.renameFlow.closeDialog': 'Akış yeniden adlandırma iletişim kutusunu kapat',
  'home.deleteFlow.title': 'Akışı sil',
  'home.deleteFlow.description': 'Bu, yerel otomatik kaydedilen akışı bu cihazdan kaldırır.',
  'home.deleteFlow.confirmation': '"{{name}}" silinsin mi?',
  'home.deleteFlow.hint':
    'Dışa aktarılmış bir yedeklemeniz veya başka bir kopyanız yoksa bu işlem geri alınamaz.',
  'home.deleteFlow.closeDialog': 'Akış silme iletişim kutusunu kapat',
  'settings.themeLight': 'Açık',
  'settings.themeDark': 'Koyu',
  'settings.themeSystem': 'Sistem',
  'properties.title': 'Özellikler',
  'properties.shape': 'Şekil',
  'properties.color': 'Renk',
  'properties.icon': 'İkon',
  'properties.rotation': 'Döndürme',
  'properties.transparency': 'Saydamlık',
  'properties.imageSettings': 'Görsel Ayarları',
  'properties.bulkShape': 'Toplu Şekil',
  'properties.bulkColor': 'Toplu Renk',
  'properties.bulkIcon': 'Toplu İkon',
  'properties.labelTransform': 'Etiket Dönüşümü',
  'properties.findReplace': 'Bul ve Değiştir',
  'properties.findLabel': 'Bul',
  'properties.findPlaceholder': 'Bulunacak metin',
  'properties.replaceLabel': 'Değiştir',
  'properties.replacePlaceholder': 'Değiştirilecek metin',
  'properties.prefixOptional': 'Önek (isteğe bağlı)',
  'properties.suffixOptional': 'Sonek (isteğe bağlı)',
  'properties.useRegex': 'Düzenli ifade kullan',
  'properties.applyToSelectedNodes': 'Seçili öğelere uygula',
  'properties.selectFieldToApply': 'Uygulamak için bir alan seçin',
  'properties.previewSummary': 'Önizleme özeti',
  'ai.generateWithFlowpilot': 'Flowpilot ile oluştur',
  'ai.model': 'Model',
  'ai.settingsSubtitle':
    'Tercih ettiğiniz yapay zeka sağlayıcısını, modeli ve API anahtarını aşağıdan yapılandırın.',
  'welcome.title': 'OpenFlowKit',
  'welcome.feature1Title': 'Harika diyagramlar oluşturun',
  'welcome.feature1Desc': 'Güzel, kurumsal düzeyde mimariyi görsel olarak tasarlayın.',
  'welcome.feature2Title': 'Yapay zeka kullanın',
  'welcome.feature2Desc': 'Tek bir akıllı komutla tam mimariler oluşturun.',
  'welcome.feature3Title': 'Koddan diyagrama',
  'welcome.feature3Desc': 'Metinden anında muhteşem görsel altyapı oluşturun.',
  'welcome.feature4Title': 'Birçok formatta dışa aktarın',
  'welcome.feature4Desc': 'Tamamen animasyonlu sunum diyagramlarına dışa aktarın.',
  'welcome.analyticsTitle': 'Anonim Analitik',
  'welcome.analyticsDesc':
    'Tanı verileri topluyoruz. Diyagramlarınızı veya komutlarınızı asla okumuyoruz.',
  'welcome.getStarted': 'Hemen Başla',
  'cta.github': 'GitHub',
  'share.betaBadge': 'Beta',
  'share.roomId': 'Oda Kimliği',
  'share.link': 'Bağlantı paylaş',
  'share.copied': 'Bağlantı Kopyalandı!',
  'share.close': 'Kapat',
  'share.openDialog': 'Paylaşım diyaloğu',
  'share.toast.copyManual':
    'Pano erişimi engellendi. Bağlantıyı paylaşım diyaloğundan manuel olarak kopyalayın.',
  'share.toast.fallbackMode':
    'Gerçek zamanlı senkronizasyon kullanılamıyor. Yalnızca yerel modda devam ediliyor.',
  'share.toast.reconnected': 'Gerçek zamanlı iş birliği geri yüklendi.',
  'share.status.cache.syncing': ' yerel önbellek senkronize ediliyor',
  'share.status.cache.ready': ' yerel önbellek hazır',
  'share.status.cache.hydrated': ' yerel önbellekten geri yüklendi',
  'share.roomLink': 'İş Birliği Bağlantısı',
  'share.permissionsNote': 'Bağlantıya sahip olan herkes katılabilir.',
  'share.permissionsNoteSecondary':
    'İzin kontrolleri ve kalıcı arka uç senkronizasyonu henüz yapılandırılmadı.',
  'share.viewerCount.one': 'Bu oturumda 1 izleyici.',
  'share.viewerCount.many': 'Bu oturumda {{count}} izleyici.',
  'share.mode.realtime.title': 'Gerçek zamanlı senkronizasyon aktif',
  'share.mode.realtime.body':
    'Bu bağlantıyı açan akranlar, mevcut aktarım üzerinden canlı güncellemeleri görebilir.',
  'share.mode.waiting.title': 'Gerçek zamanlı senkronizasyona bağlanılıyor',
  'share.mode.waiting.body':
    'Bu tuval hâlâ canlı eş senkronizasyonu kurmaya çalışıyor. Başarısız olursa oturum bu tarayıcıda yalnızca yerel kalır.',
  'share.mode.fallback.title': 'Yalnızca yerel iş birliği',
  'share.mode.fallback.body':
    'Arka uç aktarıcı veya desteklenen eş aktarımı olmadan bu oturum, mevcut tarayıcı çalışma zamanı dışında kalıcı çok kullanıcılı canlı senkronizasyon sağlamaz.',
  'share.cache.syncing.title': 'Yerel oda önbelleği senkronize ediliyor',
  'share.cache.syncing.body':
    'Bu tarayıcı, eş senkronizasyon tamamen oturana kadar IndexedDB önbellekli oda durumunu geri yüklemeye devam ediyor.',
  'share.cache.hydrated.title': 'Yerel önbellekten kurtarıldı',
  'share.cache.hydrated.body':
    'Bu odada zaten bu tarayıcıda yerel olarak önbelleklenmiş durum vardı, bu yüzden tuval eşler yeniden bağlanmadan önce geri yüklenebildi.',
  'share.cache.ready.title': 'Yerel önbellek hazır',
  'share.cache.ready.body':
    'Bu tarayıcı, yeniden yükleme ve çevrimdışı kurtarma için odanın yerel bir IndexedDB kopyasını tutabilir.',
  'share.cache.unavailable.title': 'Yerel oda önbelleği yok',
  'share.cache.unavailable.body':
    'Bu iş birliği oturumu şu anda tarayıcı IndexedDB oda kalıcılığını kullanmıyor.',
  'chatbot.aiSuffix': 'Yapay Zeka...',
  'commandBar.ai.examples.cicdPipeline': 'CI/CD Hattı',
  'commandBar.search.showingCount': 'Gösterilen: {{count}}',
  'commandBar.search.totalCount': 'Tuvaldeki toplam: {{count}}',
  'commandBar.figmaImport.fileUrlPlaceholder': 'https://www.figma.com/design/...',
  'commandBar.figmaImport.tokenPlaceholder': 'figd_...',
  'commandBar.import.parseNativeProject': 'Yerel Diyagram Oluştur',
  'commandBar.import.categories.sql': 'SQL',
  'commandBar.import.categories.infra': 'Altyapı',
  'commandBar.import.categories.openapi': 'OpenAPI',
  'commandBar.import.categories.code': 'Kod',
  'commandBar.import.infraFormats.terraformState': 'Terraform State (.tfstate)',
  'commandBar.import.infraFormats.kubernetes': 'Kubernetes YAML',
  'commandBar.import.infraFormats.dockerCompose': 'Docker Compose',
  'commandBar.import.infraFormats.terraformHcl': 'Terraform HCL (YZ)',
  'commandBar.layout.layoutStyle': 'Düzen Stili',
  'commandBar.layout.normal': 'Normal',
  'commandBar.visuals.bezier': 'Bezier',
  'commandBar.visuals.largeGraphSafety': 'Büyük Graf Güvenliği',
  'commandBar.visuals.largeGraphSafetyAuto': 'Otomatik',
  'commandBar.visuals.largeGraphSafetyOff': 'Kapalı',
  'commandBar.visuals.exportMode': 'Dışa Aktarma Modu',
  'commandBar.visuals.exportModeDeterministic': 'Kesin',
  'commandBar.visuals.exportModeLegacy': 'Eski',
  'commandBar.code.jumpToLine': '{{line}} satırına git',
  'commandBar.code.diagnosticsGroup.syntax': 'Sözdizimi sorunları',
  'commandBar.code.diagnosticsGroup.identity': 'Tanımlayıcı sorunları',
  'commandBar.code.diagnosticsGroup.recovery': 'Kurtarma uyarıları',
  'commandBar.code.diagnosticsGroup.general': 'Tanılar',
  'settingsModal.settings': 'Ayarlar',
  'settingsModal.description': 'Tuval tercihlerini ve klavye kısayollarını yapılandırın.',
  'settingsModal.close': 'Ayarları kapat',
  'settingsModal.closeDialog': 'Ayarlar iletişim kutusunu kapat',
  'settingsModal.canvasSettings': 'Tuval Ayarları',
  'settingsModal.ai.model': 'Model',
  'settingsModal.ai.optional': 'İsteğe bağlı',
  'settingsModal.ai.privacyTitle': 'Gizlilik ve Şifreleme',
  'settingsModal.ai.advancedEndpointOverride': 'Gelişmiş Taban URL Geçersiz Kılma',
  'settingsModal.ai.baseUrlHint':
    "Sağlayıcı varsayılan uç noktasını kullanmak için boş bırakın. Kendi proxy/worker URL'niz için bunu kullanın.",
  'settingsModal.ai.resetEndpoint': 'Varsayılana sıfırla',
  'settingsModal.ai.customHeadersTitle': 'Özel Başlıklar',
  'settingsModal.ai.customHeadersSubtitle':
    'Cloudflare Access gibi kimlik doğrulama vekilleri için ekstra başlıklar gönderin.',
  'settingsModal.ai.customHeadersEmpty': 'Yapılandırılmış özel başlık yok.',
  'settingsModal.ai.customHeadersSecurity':
    'Başlık değerleri tarayıcı profilinizde yerel olarak saklanır.',
  'settingsModal.ai.addHeader': 'Başlık Ekle',
  'settingsModal.ai.cloudflarePreset': 'Cloudflare Ön Ayarını Kullan',
  'settingsModal.ai.customEndpoints.ollama.name': 'Ollama',
  'settingsModal.ai.customEndpoints.lmStudio.name': 'LM Studio',
  'settingsModal.ai.customEndpoints.together.name': 'Together.ai',
  'settingsModal.ai.risk.browserFriendly': 'Tarayıcı uyumlu',
  'settingsModal.ai.risk.proxyLikely': 'Muhtemelen vekil sunucu gerekli',
  'settingsModal.ai.risk.mixed': 'Uç noktasına bağlı',
  'settingsModal.ai.models.gemini.gemini-2.5-flash-lite.label': '2.5 Flash Lite',
  'settingsModal.ai.models.gemini.gemini-2.5-flash-lite.hint':
    'En hızlı · Ücretsiz katman varsayılanı',
  'settingsModal.ai.models.gemini.gemini-2.5-flash-lite.category': 'Hız',
  'settingsModal.ai.models.gemini.gemini-2.5-flash-lite.badge': 'Varsayılan',
  'settingsModal.ai.models.gemini.gemini-2.5-flash.label': '2.5 Flash',
  'settingsModal.ai.models.gemini.gemini-2.5-flash.hint': 'En iyi fiyat/performans dengesi',
  'settingsModal.ai.models.gemini.gemini-2.5-flash.category': 'Hız',
  'settingsModal.ai.models.gemini.gemini-2.5-pro.label': '2.5 Pro',
  'settingsModal.ai.models.gemini.gemini-2.5-pro.hint':
    'En iyi akıl yürütme · Karmaşık diyagramlar',
  'settingsModal.ai.models.gemini.gemini-2.5-pro.category': 'Akıl Yürütme',
  'settingsModal.ai.models.gemini.gemini-3-flash.label': '3 Flash',
  'settingsModal.ai.models.gemini.gemini-3-flash.hint': 'Sınır hızı + zeka',
  'settingsModal.ai.models.gemini.gemini-3-flash.category': 'Eski',
  'settingsModal.ai.models.gemini.gemini-3-flash.badge': 'Yeni',
  'settingsModal.ai.models.gemini.gemini-3-pro.label': '3 Pro',
  'settingsModal.ai.models.gemini.gemini-3-pro.hint': 'En güçlü · Çok modlu',
  'settingsModal.ai.models.gemini.gemini-3-pro.category': 'Eski',
  'settingsModal.ai.models.gemini.gemini-3-pro.badge': 'Yeni',
  'settingsModal.ai.models.openai.gpt-5-mini.label': 'GPT-5 mini',
  'settingsModal.ai.models.openai.gpt-5-mini.hint': 'Hızlı · Maliyet verimli',
  'settingsModal.ai.models.openai.gpt-5-mini.category': 'Hız',
  'settingsModal.ai.models.openai.gpt-5-mini.badge': 'Varsayılan',
  'settingsModal.ai.models.openai.gpt-5.label': 'GPT-5',
  'settingsModal.ai.models.openai.gpt-5.hint': 'Amiral gemisi · En yetenekli',
  'settingsModal.ai.models.openai.gpt-5.category': 'Amiral Gemisi',
  'settingsModal.ai.models.openai.gpt-5.2.label': 'GPT-5.2',
  'settingsModal.ai.models.openai.gpt-5.2.hint': 'Son güncelleme · Geliştirilmiş akıl yürütme',
  'settingsModal.ai.models.openai.gpt-5.2.category': 'Akıl Yürütme',
  'settingsModal.ai.models.openai.gpt-5.2.badge': 'Yeni',
  'settingsModal.ai.models.openai.o4-mini.label': 'o4-mini',
  'settingsModal.ai.models.openai.o4-mini.hint': 'Gelişmiş akıl yürütme · Hızlı',
  'settingsModal.ai.models.openai.o4-mini.category': 'Akıl Yürütme',
  'settingsModal.ai.models.openai.o4-mini.badge': 'Akıl Yürütme',
  'settingsModal.ai.models.openai.o3.label': 'o3',
  'settingsModal.ai.models.openai.o3.hint': 'Derin akıl yürütme · Karmaşık görevler',
  'settingsModal.ai.models.openai.o3.category': 'Akıl Yürütme',
  'settingsModal.ai.models.openai.o3.badge': 'Akıl Yürütme',
  'settingsModal.ai.models.claude.claude-haiku-4-5.label': 'Claude Haiku 4.5',
  'settingsModal.ai.models.claude.claude-haiku-4-5.hint': 'En hızlı · En uygun fiyatlı',
  'settingsModal.ai.models.claude.claude-haiku-4-5.category': 'Hız',
  'settingsModal.ai.models.claude.claude-sonnet-4-5.label': 'Claude Sonnet 4.5',
  'settingsModal.ai.models.claude.claude-sonnet-4-5.hint': 'Dengeli zeka ve hız',
  'settingsModal.ai.models.claude.claude-sonnet-4-5.category': 'Amiral Gemisi',
  'settingsModal.ai.models.claude.claude-sonnet-4-6.label': 'Claude Sonnet 4.6',
  'settingsModal.ai.models.claude.claude-sonnet-4-6.hint': 'Son Sonnet · En iyi kodlama',
  'settingsModal.ai.models.claude.claude-sonnet-4-6.category': 'Amiral Gemisi',
  'settingsModal.ai.models.claude.claude-sonnet-4-6.badge': 'Varsayılan',
  'settingsModal.ai.models.claude.claude-opus-4-6.label': 'Claude Opus 4.6',
  'settingsModal.ai.models.claude.claude-opus-4-6.hint': 'En zeki · 1M jeton bağlamı',
  'settingsModal.ai.models.claude.claude-opus-4-6.category': 'Akıl Yürütme',
  'settingsModal.ai.models.claude.claude-opus-4-6.badge': 'Amiral Gemisi',
  'settingsModal.ai.models.groq.meta-llama/llama-4-scout-17b-16e-instruct.label': 'Llama 4 Scout',
  'settingsModal.ai.models.groq.meta-llama/llama-4-scout-17b-16e-instruct.hint':
    'Ücretsiz katman · Çok hızlı',
  'settingsModal.ai.models.groq.meta-llama/llama-4-scout-17b-16e-instruct.category': 'Hız',
  'settingsModal.ai.models.groq.meta-llama/llama-4-scout-17b-16e-instruct.badge': 'Ücretsiz',
  'settingsModal.ai.models.groq.meta-llama/llama-4-maverick-17b-128e-instruct.label':
    'Llama 4 Maverick',
  'settingsModal.ai.models.groq.meta-llama/llama-4-maverick-17b-128e-instruct.hint':
    'Daha yetenekli · Ücretsiz katman',
  'settingsModal.ai.models.groq.meta-llama/llama-4-maverick-17b-128e-instruct.category': 'Hız',
  'settingsModal.ai.models.groq.meta-llama/llama-4-maverick-17b-128e-instruct.badge': 'Ücretsiz',
  'settingsModal.ai.models.groq.qwen/qwen3-32b.label': 'Qwen3 32B',
  'settingsModal.ai.models.groq.qwen/qwen3-32b.hint': 'Gelişmiş akıl yürütme · Araç kullanımı',
  'settingsModal.ai.models.groq.qwen/qwen3-32b.category': 'Akıl Yürütme',
  'settingsModal.ai.models.groq.llama-3.3-70b-versatile.label': 'Llama 3.3 70B Versatile',
  'settingsModal.ai.models.groq.llama-3.3-70b-versatile.hint': 'Çok yönlü model',
  'settingsModal.ai.models.groq.llama-3.3-70b-versatile.category': 'Performans',
  'settingsModal.ai.models.groq.llama-3.3-70b-versatile.badge': 'Performans',
  'settingsModal.ai.models.nvidia.meta/llama-4-scout-17b-16e-instruct.label': 'Llama 4 Scout',
  'settingsModal.ai.models.nvidia.meta/llama-4-scout-17b-16e-instruct.hint': 'Verimli · Çok modlu',
  'settingsModal.ai.models.nvidia.meta/llama-4-scout-17b-16e-instruct.category': 'Hız',
  'settingsModal.ai.models.nvidia.nvidia/nemotron-nano-12b-v2-vl.label': 'Nemotron Nano 12B',
  'settingsModal.ai.models.nvidia.nvidia/nemotron-nano-12b-v2-vl.hint':
    'Hafif · Görsel-dil · Hızlı',
  'settingsModal.ai.models.nvidia.nvidia/nemotron-nano-12b-v2-vl.category': 'Hız',
  'settingsModal.ai.models.nvidia.deepseek/deepseek-v3-2.label': 'DeepSeek-V3.2 (685B)',
  'settingsModal.ai.models.nvidia.deepseek/deepseek-v3-2.hint': 'Son sürüm · GPT-5 seviyesinde',
  'settingsModal.ai.models.nvidia.deepseek/deepseek-v3-2.category': 'Amiral Gemisi',
  'settingsModal.ai.models.nvidia.deepseek/deepseek-v3-2.badge': 'Yeni',
  'settingsModal.ai.models.nvidia.qwen/qwq-32b.label': 'QwQ 32B',
  'settingsModal.ai.models.nvidia.qwen/qwq-32b.hint': 'Güçlü akıl yürütme modeli',
  'settingsModal.ai.models.nvidia.qwen/qwq-32b.category': 'Akıl Yürütme',
  'settingsModal.ai.models.nvidia.moonshotai/kimi-k2-thinking.label': 'Kimi K2 Thinking',
  'settingsModal.ai.models.nvidia.moonshotai/kimi-k2-thinking.hint':
    'Gelişmiş akıl yürütme · Araç kullanımı',
  'settingsModal.ai.models.nvidia.moonshotai/kimi-k2-thinking.category': 'Akıl Yürütme',
  'settingsModal.ai.models.cerebras.gpt-oss-120b.label': 'GPT-OSS 120B',
  'settingsModal.ai.models.cerebras.gpt-oss-120b.hint': "120B parametre · WSE-3'te hızlı",
  'settingsModal.ai.models.cerebras.gpt-oss-120b.category': 'Hız',
  'settingsModal.ai.models.cerebras.gpt-oss-120b.badge': 'Varsayılan',
  'settingsModal.ai.models.cerebras.qwen-3-32b.label': 'Qwen3 32B',
  'settingsModal.ai.models.cerebras.qwen-3-32b.hint': '2.403 jeton/sn · Endüstrinin en hızlısı',
  'settingsModal.ai.models.cerebras.qwen-3-32b.category': 'Hız',
  'settingsModal.ai.models.cerebras.qwen-3-32b.badge': 'En Hızlı',
  'settingsModal.ai.models.cerebras.qwen-3-235b-a22b.label': 'Qwen3 235B A22B',
  'settingsModal.ai.models.cerebras.qwen-3-235b-a22b.hint': 'Amiral gemisi · En iyi kalite',
  'settingsModal.ai.models.cerebras.qwen-3-235b-a22b.category': 'Amiral Gemisi',
  'settingsModal.ai.models.cerebras.qwen-3-235b-a22b.badge': 'Amiral Gemisi',
  'settingsModal.ai.models.cerebras.zai-glm-4.7.label': 'Zai-GLM 4.7',
  'settingsModal.ai.models.cerebras.zai-glm-4.7.hint': 'Gelişmiş akıl yürütme · Araç kullanımı',
  'settingsModal.ai.models.cerebras.zai-glm-4.7.category': 'Akıl Yürütme',
  'settingsModal.ai.models.mistral.mistral-small-latest.label': 'Mistral Small',
  'settingsModal.ai.models.mistral.mistral-small-latest.hint':
    'Hızlı · Maliyet verimli · 32k bağlam',
  'settingsModal.ai.models.mistral.mistral-small-latest.category': 'Hız',
  'settingsModal.ai.models.mistral.mistral-small-latest.badge': 'Ücretsiz',
  'settingsModal.ai.models.mistral.mistral-medium-latest.label': 'Mistral Medium',
  'settingsModal.ai.models.mistral.mistral-medium-latest.hint':
    'Dengeli kalite-maliyet · En iyi varsayılan',
  'settingsModal.ai.models.mistral.mistral-medium-latest.category': 'Amiral Gemisi',
  'settingsModal.ai.models.mistral.mistral-medium-latest.badge': 'Varsayılan',
  'settingsModal.ai.models.mistral.mistral-large-latest.label': 'Mistral Large',
  'settingsModal.ai.models.mistral.mistral-large-latest.hint':
    'En yetenekli · 128k bağlam · Amiral gemisi',
  'settingsModal.ai.models.mistral.mistral-large-latest.category': 'Amiral Gemisi',
  'settingsModal.ai.models.mistral.mistral-large-latest.badge': 'Amiral Gemisi',
  'settingsModal.ai.models.mistral.codestral-latest.label': 'Codestral',
  'settingsModal.ai.models.mistral.codestral-latest.hint':
    'Kod için optimize edilmiş · 256k bağlam',
  'settingsModal.ai.models.mistral.codestral-latest.category': 'Kodlama',
  'settingsModal.ai.models.mistral.codestral-latest.badge': 'Kod',
  'settingsModal.ai.models.mistral.pixtral-large-latest.label': 'Pixtral Large',
  'settingsModal.ai.models.mistral.pixtral-large-latest.hint': 'Görsel + akıl yürütme · Çok modlu',
  'settingsModal.ai.models.mistral.pixtral-large-latest.category': 'Çok Modlu',
  'settingsModal.ai.models.mistral.pixtral-large-latest.badge': 'Görsel',
  'settingsModal.ai.models.custom.custom.label': 'Özel Model',
  'settingsModal.ai.models.custom.custom.hint': 'Model kimliğinizi aşağıya girin',
  'settingsModal.ai.models.custom.custom.category': 'Özel',
  'settingsModal.ai.byok.dataPrivacy': 'Verileriniz asla sunucularımızdan geçmez',
  'settingsModal.ai.byok.control': 'Maliyet ve hız sınırları üzerinde tam kontrol',
  'settingsModal.ai.byok.flexibility':
    'Yeniden bağlamadan istediğiniz zaman sağlayıcıları değiştirin',
  'settingsModal.ai.byok.cuttingEdge': 'Son teknoloji modellere çıktıkları an erişin',
  'settingsModal.ai.customEndpoints.ollama.hint': 'Yerel · Ücretsiz',
  'settingsModal.ai.customEndpoints.lmStudio.hint': 'Yerel · Ücretsiz',
  'settingsModal.ai.customEndpoints.together.hint': 'Bulut · Hızlı',
  'settingsModal.brand.logo': 'Logo',
  'settingsModal.brand.favicon': 'Favicon',
  'settingsModal.brand.googleFontsHint': "Google Fonts'tan dinamik olarak yüklenir",
  'settingsModal.brand.cornerRadius': 'Köşe Yarıçapı',
  'settingsModal.brand.glassmorphism': 'Cam Efekti',
  'settingsModal.brand.beveledButtons': 'Kabartmalı Düğmeler',
  'settingsModal.brand.beveledButtonsHint': 'Düğmelere derinlik ve kenarlık ekler',
  'settingsModal.brand.showBetaBadge': 'Beta Rozetini Göster',
  'settingsModal.brand.showBetaBadgeHint': 'Logo yanında BETA çipini göster',
  'settingsModal.canvas.routingProfile': 'Yönlendirme Profili',
  'settingsModal.canvas.routingProfileStandard': 'Standart',
  'settingsModal.canvas.routingProfileInfrastructure': 'Altyapı',
  'settingsModal.canvas.routingProfileHint':
    'Altyapı modu servis haritaları için dikgen rotaları tercih eder.',
  'settingsModal.canvas.edgeBundling': 'Paralel Kenarları Birleştir',
  'settingsModal.canvas.edgeBundlingDesc': 'Paralel bağlantıları paylaşılan şeritlerde tut',
  'toolbar.flowpilot': 'Flowpilot',
  'toolbar.commandCenter': 'Komut Merkezini Aç',
  'flowEditor.dslExportSkippedEdges': 'DSL dışa aktarmada {{count}} geçersiz kenar atlandı.',
  'connectMenu.close': 'Bağlantı menüsünü kapat',
  'snapshotsPanel.close': 'Anlık görüntü panelini kapat',
  'connectionPanel.label': 'Etiket',
  'connectionPanel.route': 'Yol',
  'connectionPanel.appearance': 'Görünüm',
  'connectionPanel.style': 'Stil',
  'connectionPanel.actions': 'İşlemler',
};

// The script continues with de, fr, es, zh, ja translations...
// For now, let's apply translations for each language file

const allTranslations = { tr };

const EXTRA_KEYS = {
  tr: ['common.previous', 'common.settings', 'common.docs', 'common.publicBeta'],
};

for (const [lang, overrides] of Object.entries(allTranslations)) {
  const filePath = path.join(LOCALES, lang, 'translation.json');
  const doc = readJson(filePath);

  // Delete extra keys
  if (EXTRA_KEYS[lang]) {
    for (const key of EXTRA_KEYS[lang]) {
      deleteByPath(doc, key);
    }
  }

  // Apply translations
  let count = 0;
  for (const [key, value] of Object.entries(overrides)) {
    const current = getByPath(doc, key);
    if (typeof current === 'string') {
      setByPath(doc, key, value);
      count++;
    }
  }

  writeJson(filePath, doc);
  console.log(`${lang}: applied ${count} translations`);
}
