// Unicode emoji, grouped the way the OS pickers group them. A static const on
// purpose: no dependency, no data fetch, and the search is a substring match.

export interface EmojiGroup {
  readonly id: string;
  readonly label: string;
  readonly glyphs: readonly string[];
}

// One glyph per group: the lists are hand-written and a repeat would give the
// grid two children with the same key (and two identical cells).
const RAW_GROUPS: readonly EmojiGroup[] = [
  {
    id: 'smileys', label: 'Smileys', glyphs: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰',
      '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗',
      '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮', '😯',
      '😴', '🤤', '😪', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '😮‍💨',
      '😢', '😭', '😤', '😠', '😡', '🤬', '😱', '😨', '😰', '😥', '😓',
    ],
  },
  {
    id: 'people', label: 'People', glyphs: [
      '👋', '🤚', '✋', '🖖', '👌', '🤌', '✌️', '🤞', '🫰', '🤟', '🤘', '👈', '👉', '👆',
      '👇', '☝️', '👍', '👎', '✊', '👊', '🙌', '👐', '🤲', '🙏', '💪', '🦾', '🖐️',
      '👀', '👁️', '🧠', '👤', '👥', '🧑', '👩', '👨', '🧑‍💻', '👩‍💻', '👨‍💻', '🧑‍🎨',
      '👷', '🧑‍🔬', '🧑‍🏫', '🕵️', '💁', '🙋', '🙅', '🙆', '🤷', '🤦', '🚶', '🏃', '🧘',
    ],
  },
  {
    id: 'nature', label: 'Nature', glyphs: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸',
      '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝',
      '🐛', '🦋', '🐌', '🐞', '🐜', '🕷️', '🐢', '🐍', '🦎', '🐙', '🦑', '🦐', '🦀', '🐟',
      '🐬', '🐳', '🐋', '🦈', '🌵', '🎄', '🌲', '🌳', '🌴', '🌱', '🌿', '☘️', '🍀', '🍁',
      '🍄', '🌾', '💐', '🌷', '🌹', '🌺', '🌸', '🌼', '🌻', '🌞', '🌝', '⭐', '🌟', '✨',
      '⚡', '🔥', '🌈', '☁️', '⛅', '🌧️', '⛈️', '❄️', '☃️', '🌊', '💧',
    ],
  },
  {
    id: 'food', label: 'Food', glyphs: [
      '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭',
      '🍍', '🥥', '🥝', '🍅', '🥑', '🥦', '🥕', '🌽', '🌶️', '🥒', '🥬', '🧄', '🧅', '🥔',
      '🍠', '🥐', '🥯', '🍞', '🥖', '🧀', '🥚', '🍳', '🧇', '🥞', '🥓', '🍔', '🍟', '🍕',
      '🌭', '🥪', '🌮', '🌯', '🥙', '🍜', '🍝', '🍣', '🍱', '🍤', '🍚', '🍛', '🍲', '🥗',
      '🍿', '🧂', '🍦', '🍩', '🍪', '🎂', '🍰', '🧁', '🍫', '🍬', '🍭', '☕', '🍵', '🥤',
      '🍺', '🍻', '🥂', '🍷', '🍸', '🧉',
    ],
  },
  {
    id: 'activity', label: 'Activity', glyphs: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓', '🏸', '🥊', '🥋',
      '⛳', '⛸️', '🎿', '🛷', '🏂', '🏋️', '🤼', '🤸', '⛹️', '🤺', '🤾', '🏌️', '🏇', '🧗',
      '🚴', '🚵', '🎯', '🎮', '🕹️', '🎲', '🧩', '♟️', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼',
      '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🎗️', '🎟️',
    ],
  },
  {
    id: 'travel', label: 'Travel', glyphs: [
      '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜', '🛵',
      '🏍️', '🚲', '🛴', '🚨', '🚔', '🚍', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊',
      '✈️', '🛫', '🛬', '🚀', '🛰️', '🚁', '🛸', '⛵', '🚤', '🛥️', '🚢', '⚓', '🗺️', '🗽',
      '🏰', '🏯', '🏟️', '🎡', '🎢', '🎠', '⛲', '🏖️', '🏝️', '🏜️', '🌋', '⛰️', '🏔️', '🗻',
      '🏕️', '🏠', '🏡', '🏢', '🏥', '🏦', '🏨', '🏫', '🏭', '🏛️', '⛪', '🕌', '🛕',
    ],
  },
  {
    id: 'objects', label: 'Objects', glyphs: [
      '⌚', '📱', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '💽', '💾', '💿', '📀', '📷', '📸', '📹',
      '🎥', '📞', '☎️', '📟', '📠', '📺', '📻', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳',
      '📡', '🔋', '🔌', '💡', '🔍', '🔎', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶',
      '💷', '💰', '💳', '💎', '⚖️', '🧰', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🔩', '⚙️', '🧱',
      '⛓️', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '🏺', '🔮',
      '📿', '🧿', '💈', '⚗️', '🧪', '🧫', '🧬', '🔭', '🔬', '🕳️', '💊', '💉', '🩸', '🩹',
      '🩺', '🚪', '🛏️', '🛋️', '🪑', '🚽', '🚿', '🛁', '🧴', '🧷', '🧹', '🧺', '🧻', '🧼',
      '🪥', '🧽', '🛒', '🚭', '📦', '📫', '📪', '📬', '📭', '📮', '📯', '📜', '📃', '📄',
      '📑', '📊', '📈', '📉', '🗒️', '🗓️', '📆', '📅', '📇', '🗃️', '🗳️', '🗄️', '📋', '📁',
      '📂', '🗂️', '🗞️', '📰', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚', '📖', '🔖',
      '🧷', '🔗', '📎', '🖇️', '📐', '📏', '🧮', '📌', '📍', '✂️', '🖊️', '🖋️', '✒️', '🖌️',
      '🖍️', '📝', '✏️', '🔏', '🔐', '🔒', '🔓',
    ],
  },
  {
    id: 'symbols', label: 'Symbols', glyphs: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓',
      '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔱', '⚛️', '🕉️',
      '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '⛎', '🔀', '🔁',
      '🔂', '▶️', '⏩', '⏭️', '⏯️', '◀️', '⏪', '⏮️', '🔼', '⏫', '🔽', '⏬', '⏸️', '⏹️',
      '⏺️', '⏏️', '🎦', '🔅', '🔆', '📶', '📳', '📴', '♀️', '♂️', '⚕️', '♾️', '⚜️', '🔱',
      '✅', '☑️', '✔️', '❌', '❎', '➕', '➖', '➗', '✖️', '🟰', '♠️', '♥️', '♦️', '♣️',
      '🃏', '🀄', '🎴', '🔇', '🔈', '🔉', '🔊', '📢', '📣', '📯', '🔔', '🔕', '💬', '💭',
      '🗯️', '♨️', '💢', '💥', '💫', '💦', '💨', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕',
      '⚠️', '🚸', '⛔', '🚫', '🚳', '🚭', '🚯', '🚱', '🚷', '📵', '🔞', '☢️', '☣️', '⬆️',
      '⬇️', '⬅️', '➡️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↩️', '↪️', '⤴️', '⤵️', '🔃',
      '🔄', '🔙', '🔚', '🔛', '🔜', '🔝', '🔤', '🔡', '🔠', '🔣', '🔟', '🔢', '#️⃣', '*️⃣',
    ],
  },
  {
    id: 'flags', label: 'Flags', glyphs: [
      '🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏴‍☠️', '🇺🇸', '🇬🇧', '🇨🇦', '🇫🇷', '🇩🇪',
      '🇪🇸', '🇮🇹', '🇳🇱', '🇸🇪', '🇳🇴', '🇩🇰', '🇫🇮', '🇵🇱', '🇵🇹', '🇮🇪', '🇨🇭', '🇦🇹',
      '🇧🇪', '🇬🇷', '🇹🇷', '🇺🇦', '🇮🇳', '🇨🇳', '🇯🇵', '🇰🇷', '🇸🇬', '🇦🇺', '🇳🇿', '🇧🇷',
      '🇦🇷', '🇲🇽', '🇿🇦', '🇪🇬', '🇳🇬', '🇰🇪', '🇦🇪', '🇸🇦', '🇮🇱', '🇹🇭', '🇻🇳', '🇮🇩',
      '🇲🇾', '🇵🇭',
    ],
  },
];

// ponytail: names cover the searches people actually type; the grid group is
// the fallback ("nature", "flags"). Upgrade path is a CLDR name table.
export const EMOJI_GROUPS: readonly EmojiGroup[] = RAW_GROUPS.map((group) => ({
  ...group,
  glyphs: group.glyphs.filter((glyph, index) => group.glyphs.indexOf(glyph) === index),
}));

const EMOJI_NAMES: Readonly<Record<string, string>> = {
  '🚀': 'rocket launch ship', '✈️': 'airplane flight travel', '🚁': 'helicopter',
  '🛸': 'ufo alien', '⚡': 'lightning bolt zap', '🔥': 'fire hot flame',
  '✨': 'sparkles magic', '⭐': 'star', '🌟': 'star glow', '💡': 'bulb idea light',
  '🧠': 'brain ai', '🤖': 'robot bot', '⚙️': 'gear settings cog', '🔧': 'wrench fix',
  '🔨': 'hammer build', '🛠️': 'tools build', '🧰': 'toolbox', '🔩': 'bolt nut',
  '📦': 'package box', '📁': 'folder', '📂': 'folder open', '🗂️': 'folders index cards',
  '📄': 'document page', '📃': 'page', '📝': 'memo note write', '📋': 'clipboard',
  '📊': 'chart bar analytics', '📈': 'chart up growth', '📉': 'chart down loss',
  '🗓️': 'calendar', '📅': 'calendar date', '⏰': 'alarm clock', '⏱️': 'stopwatch timer',
  '⌛': 'hourglass', '⏳': 'hourglass waiting', '🔒': 'lock secure', '🔓': 'unlock open',
  '🔑': 'key access', '🛡️': 'shield security', '🔍': 'search zoom', '🔎': 'search',
  '📌': 'pin', '📍': 'pin location', '🎯': 'target goal', '🏁': 'flag checkered finish',
  '🚩': 'flag', '🏳️': 'flag white', '✅': 'check done ok', '☑️': 'checkbox checked',
  '✔️': 'check', '❌': 'cross error no', '❎': 'cross button', '⚠️': 'warning alert',
  '⛔': 'no entry stop', '🚫': 'prohibited banned', '♻️': 'recycle',
  '💻': 'laptop code', '🖥️': 'desktop monitor', '⌨️': 'keyboard', '🖱️': 'mouse',
  '📱': 'phone mobile', '📞': 'phone call', '📷': 'camera photo', '📸': 'camera flash',
  '🎥': 'video camera film', '🔋': 'battery', '🔌': 'plug power', '💾': 'floppy save',
  '💿': 'disc cd', '📡': 'satellite antenna', '🧲': 'magnet', '🧪': 'test tube experiment',
  '🔬': 'microscope', '🔭': 'telescope', '💊': 'pill medicine', '💉': 'syringe vaccine',
  '🚑': 'ambulance', '🚒': 'fire truck', '🚓': 'police car', '🚗': 'car',
  '🚌': 'bus', '🚲': 'bike bicycle', '🛵': 'scooter', '🚂': 'train steam',
  '🚄': 'train fast', '🚇': 'metro subway', '🚢': 'ship', '⛵': 'sailboat',
  '🗺️': 'map', '🧭': 'compass direction', '🏠': 'home house', '🏢': 'office building',
  '🏦': 'bank', '🏥': 'hospital', '🏫': 'school', '🏭': 'factory',
  '🌐': 'globe world', '🌍': 'globe earth', '☁️': 'cloud', '🌧️': 'rain',
  '⛈️': 'storm thunder', '❄️': 'snow cold', '🌈': 'rainbow',
  '☀️': 'sun', '🌙': 'moon', '🌊': 'wave water', '💧': 'drop water',
  '🌱': 'seedling grow', '🌿': 'herb leaf', '🍀': 'clover luck', '🌳': 'tree',
  '🌵': 'cactus', '🌷': 'tulip flower', '🌸': 'blossom flower', '🌻': 'sunflower',
  '🐶': 'dog puppy', '🐱': 'cat kitten', '🦊': 'fox', '🐻': 'bear', '🐼': 'panda',
  '🦁': 'lion', '🐯': 'tiger', '🐵': 'monkey', '🐧': 'penguin', '🦅': 'eagle bird',
  '🐝': 'bee', '🦋': 'butterfly', '🐞': 'ladybug bug', '🐛': 'bug', '🕷️': 'spider',
  '🐢': 'turtle', '🐍': 'snake', '🐙': 'octopus', '🐬': 'dolphin', '🐳': 'whale',
  '👋': 'wave hello', '👍': 'thumbs up like', '👎': 'thumbs down dislike',
  '👏': 'clap applause', '🙌': 'raise hands celebrate', '🙏': 'pray thanks',
  '💪': 'muscle strong', '🤝': 'handshake deal', '✌️': 'peace victory',
  '👀': 'eyes look', '🧑‍💻': 'developer programmer coder', '👩‍💻': 'developer woman',
  '👨‍💻': 'developer man', '🕵️': 'detective spy', '🤔': 'thinking',
  '😀': 'grin smile happy', '😂': 'laugh tears lol', '😊': 'smile blush',
  '😍': 'love heart eyes', '😎': 'cool sunglasses', '🤯': 'mind blown',
  '😴': 'sleep tired', '🤒': 'sick', '🥳': 'party celebrate', '😭': 'cry sad',
  '😱': 'scream shock', '🙃': 'upside down', '🤷': 'shrug maybe', '🤦': 'facepalm',
  '❤️': 'heart love red', '🧡': 'heart orange', '💛': 'heart yellow', '💚': 'heart green',
  '💙': 'heart blue', '💜': 'heart purple', '🖤': 'heart black', '💔': 'heart broken',
  '🎉': 'party tada confetti', '🎊': 'confetti', '🎁': 'gift present',
  '🏆': 'trophy win', '🥇': 'medal gold first', '🥈': 'medal silver', '🥉': 'medal bronze',
  '🎨': 'art palette design', '🎬': 'clapper movie', '🎤': 'microphone sing',
  '🎧': 'headphones listen', '🎵': 'music note', '🎸': 'guitar', '🎮': 'game controller',
  '🧩': 'puzzle plugin', '♟️': 'chess pawn strategy', '🎲': 'dice random',
  '💰': 'money bag', '💵': 'dollar money', '💳': 'card credit', '💎': 'gem diamond',
  '🛒': 'cart shopping', '🏷️': 'label tag', '📢': 'megaphone announce',
  '💬': 'speech bubble chat', '💭': 'thought bubble', '🗯️': 'anger bubble',
  '📧': 'email mail', '✉️': 'envelope mail', '📮': 'postbox', '📚': 'books library',
  '🔗': 'link chain', '📎': 'paperclip attach', '✂️': 'scissors cut', '🖊️': 'pen',
  '✏️': 'pencil edit', '🖍️': 'crayon', '📐': 'ruler triangle', '📏': 'ruler straight',
  '⚖️': 'scale balance law', '🔮': 'crystal ball future', '🧿': 'nazar amulet',
  '🚪': 'door exit', '🛏️': 'bed', '🪑': 'chair seat', '🧹': 'broom clean',
  '🧺': 'basket', '🧻': 'paper roll', '🧼': 'soap', '🛁': 'bath',
  '🔁': 'repeat loop', '🔄': 'refresh sync', '🔀': 'shuffle',
  '➕': 'plus add', '➖': 'minus remove', '✖️': 'multiply times', '➗': 'divide',
  '♾️': 'infinity', '🔔': 'bell notify', '🔕': 'bell mute', '⏸️': 'pause',
  '▶️': 'play', '⏹️': 'stop', '⏺️': 'record', '⬆️': 'up arrow', '⬇️': 'down arrow',
  '⬅️': 'left arrow', '➡️': 'right arrow', '🔃': 'refresh', '🔙': 'back',
};

const INDEX = EMOJI_GROUPS.flatMap((group) =>
  group.glyphs.map((glyph) => ({
    glyph, group: group.id,
    haystack: `${EMOJI_NAMES[glyph] ?? ''} ${EMOJI_NAMES[glyph] ? '' : group.label}`.trim(),
  })));

export function searchEmoji(query: string, limit = 96): readonly string[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];
  const words = trimmed.split(/\s+/);
  const seen = new Set<string>();
  return INDEX
    .filter((entry) => words.every((word) => entry.haystack.includes(word) || entry.glyph === word))
    .map((entry) => entry.glyph)
    .filter((glyph) => (seen.has(glyph) ? false : (seen.add(glyph), true)))
    .slice(0, limit);
}

export function emojiGroup(id: string): EmojiGroup | undefined {
  return EMOJI_GROUPS.find((group) => group.id === id);
}
