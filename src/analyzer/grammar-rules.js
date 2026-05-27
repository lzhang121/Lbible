// ── Particles ────────────────────────────────────────────────────────────────
const PARTICLE_RULES = new Map([
  ["は",   "主题助词 — 提示句子主题，相当于「说到…」"],
  ["が",   "主语助词 — 标记动作主语，或强调新信息"],
  ["を",   "宾语助词 — 标记动作对象（宾语）"],
  ["に",   "方向/时间助词 — 表示方向、时间点、着落点或间接对象"],
  ["で",   "场所/方式助词 — 表示动作地点或所用手段"],
  ["の",   "所属助词 — 表示所属或修饰关系（相当于中文「的」）"],
  ["と",   "并列/引用助词 — 并列事物、引用内容或共同动作"],
  ["も",   "同类助词 — 「也」，追加相同性质信息"],
  ["から", "起点助词 — 「从…」（起点）或「因为…」（原因）"],
  ["まで", "终点助词 — 「到…为止」"],
  ["へ",   "方向助词 — 「向…」（移动方向）"],
  ["より", "比较助词 — 「比…」（比较基准）或「从…」（起点）"],
  ["か",   "疑问助词 — 置于句尾表示疑问「…吗？」"],
  ["ね",   "确认助词 — 「…对吧？」（寻求共鸣）"],
  ["よ",   "强调助词 — 「…啊！」（传达信息或强调）"],
]);

// ── Verb conjugation patterns (matched against token surface) ────────────────
const VERB_FORMS = [
  { regex: /なさった$/,          form: "〜なさった",       explanation: "尊敬语·过去｜（对尊者）做了…" },
  { regex: /なさってい/,          form: "〜なさっている",   explanation: "尊敬语·进行｜（对尊者）正在做…" },
  { regex: /[^あ-お]られた$/,    form: "〜られた",         explanation: "被动/尊敬·过去｜被…了，或对尊者的敬语" },
  { regex: /[^あ-お]れた$/,      form: "〜れた",           explanation: "被动·过去｜被…了" },
  { regex: /ていた$|てい(まし)た$/, form: "〜ていた",      explanation: "进行/持续·过去｜一直在…/已经处于…状态" },
  { regex: /ている$/,            form: "〜ている",          explanation: "进行/持续·现在｜正在…/处于…状态" },
  { regex: /てください$/,        form: "〜てください",      explanation: "礼貌请求｜请…" },
  { regex: /てくる$|てきた$/,    form: "〜てくる",          explanation: "向说话人方向完成动作｜…来/…过来" },
  { regex: /ない$/,              form: "〜ない",            explanation: "否定形｜不…" },
  { regex: /ません$/,            form: "〜ません",          explanation: "礼貌否定｜不…（礼貌体）" },
  { regex: /ましょう$/,          form: "〜ましょう",        explanation: "邀请/建议｜（我们一起）…吧" },
  { regex: /よう$/,              form: "〜よう",            explanation: "意志形｜打算…/（我们）…吧" },
  { regex: /ば$/,                form: "〜ば条件形",        explanation: "假定条件｜如果…（成立则…）" },
  { regex: /たら$/,              form: "〜たら条件形",      explanation: "假定/完成条件｜如果…了（就…）" },
  { regex: /ながら$/,            form: "〜ながら",          explanation: "同时进行｜一边…一边…" },
  { regex: /て$/,                form: "〜て形（连用）",    explanation: "连用形｜表示动作先后或原因（…之后…）" },
  { regex: /た$/,                form: "〜た（过去）",      explanation: "过去时｜已经…了" },
];

// ── Phrase/compound patterns (matched against full sentence) ─────────────────
// Order: longest / most specific first to avoid partial shadowing
const PHRASE_RULES = [
  // ── Bible-specific fixed expressions ──
  { regex: /まことに[、,]?まことに/,  form: "まことに、まことに",  explanation: "「我实实在在地告诉你们」— 耶稣庄严发言的固定开场语" },
  { regex: /まことに/,               form: "まことに",             explanation: "真实地/确实 — 强调所说内容的真实性" },
  { regex: /すなわち/,               form: "すなわち",             explanation: "换言之/即… — 对前文作同义说明" },

  // ── Compound postpositions ──
  { regex: /にとって/,               form: "にとって",             explanation: "对…来说（立场）" },
  { regex: /によって/,               form: "によって",             explanation: "通过…/由于…（手段或原因）" },
  { regex: /において/,               form: "において",             explanation: "在…（文语场所助词）" },
  { regex: /について/,               form: "について",             explanation: "关于…" },
  { regex: /に対して/,               form: "に対して",             explanation: "对…/针对…" },
  { regex: /に従って/,               form: "に従って",             explanation: "按照…/随着…" },
  { regex: /に向かって/,             form: "に向かって",           explanation: "朝向…/面对…" },
  { regex: /一緒に/,                 form: "一緒に",               explanation: "一起/共同（与…同行）" },
  { regex: /として/,                 form: "として",               explanation: "作为…（身份或资格）" },
  { regex: /ために/,                 form: "ために",               explanation: "为了…（目的）或因为…（原因）" },
  { regex: /ように/,                 form: "ように",               explanation: "如同…（比较）或以便…（目的）" },
  { regex: /ことに/,                 form: "ことに",               explanation: "对于…这件事" },
  { regex: /ほかに/,                 form: "ほかに",               explanation: "除此之外" },

  // ── Limiting / restrictive ──
  { regex: /しかな[いく]/,           form: "しかない／しかなく",   explanation: "只有…/仅…（数量极少的强调）" },
  { regex: /だけで/,                 form: "だけで",               explanation: "仅凭…/只靠…" },
  { regex: /だけが/,                 form: "だけが",               explanation: "只有…（唯一主语）" },
  { regex: /だけ/,                   form: "だけ",                 explanation: "只/仅（限定范围）" },

  // ── Negative / concessive ──
  { regex: /[^な]ずに/,              form: "〜ずに",               explanation: "不…地/没有…就（否定连用）" },
  { regex: /なくて/,                 form: "〜なくて",             explanation: "不…（原因/并列否定）" },
  { regex: /ないで/,                 form: "〜ないで",             explanation: "不做…（否定て形）" },
  { regex: /けれど[もも]?/,          form: "けれど",               explanation: "虽然…但是…（逆接）" },
  { regex: /のに/,                   form: "のに",                 explanation: "尽管…却…（逆预期）" },
  { regex: /ながら/,                 form: "ながら",               explanation: "一边…一边…（同时进行）" },

  // ── Conditional / temporal ──
  { regex: /たとき/,                 form: "たとき",               explanation: "…的时候（过去/完成时间点）" },
  { regex: /とき/,                   form: "とき",                 explanation: "…的时候（时间从句）" },
  { regex: /たら/,                   form: "〜たら",               explanation: "如果…了（假定条件）" },
  { regex: /ならば?/,                form: "〜なら",               explanation: "如果…的话（假定/主题条件）" },

  // ── Compound particles ──
  { regex: /からも/,                 form: "からも",               explanation: "从…也/连…也" },
  { regex: /とも/,                   form: "とも",                 explanation: "两者都…/无论…" },
  { regex: /には/,                   form: "には",                 explanation: "对于…来说/在…方面（に＋は 强调）" },
  { regex: /から/,                   form: "から",                 explanation: "从…（起点）或因为…（原因）" },
  { regex: /まで/,                   form: "まで",                 explanation: "到…为止（终点或极限）" },
  { regex: /より/,                   form: "より",                 explanation: "比…（比较）" },
];

// ── Main export ──────────────────────────────────────────────────────────────
export function buildGrammarHits(tokens, normalizedText) {
  const hits = [];

  // All phrase / compound-particle patterns scanned against the full text
  // (more reliable than token-based detection with TinySegmenter)
  for (const rule of PHRASE_RULES) {
    rule.regex.lastIndex = 0;
    if (rule.regex.test(normalizedText)) {
      hits.push({
        type: "phrase",
        pattern: rule.form,
        explanationZh: rule.explanation
      });
    }
  }

  return dedupeHits(hits);
}

function dedupeHits(hits) {
  const seen = new Set();
  return hits.filter((hit) => {
    const key = `${hit.type}:${hit.pattern}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
