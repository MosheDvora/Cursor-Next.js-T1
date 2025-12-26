import React, { useState, useCallback } from 'react';

// ==================== CONSTANTS ====================

const VALID_POS = new Set([
  'noun', 'verb', 'adjective', 'pronoun', 'preposition',
  'adverb', 'conjunction', 'proper_noun', 'particle', 'numeral',
  'quantifier', 'interrogative'
]);

const VALID_TYPES = new Set(['prefix', 'stem', 'suffix']);

const VALID_ROLES = new Set([
  'conjunction', 'definite_article', 'preposition', 'relativizer', 'question',
  'stem', 'plural', 'dual', 'possessive', 'tense_person', 'object_pronoun',
  'directional', 'construct'
]);

const VALID_BINYANIM = new Set([
  'paal', 'nifal', 'piel', 'pual', 'hifil', 'hufal', 'hitpael'
]);

const VALID_GIZROT = new Set([
  'shlemim', 'ayin_vav', 'ayin_yod', 'peh_nun', 'peh_yod',
  'lamed_heh', 'lamed_alef', 'kfulim', 'peh_alef'
]);

const COLORS = {
  prefix: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', label: 'תחילית' },
  stem: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', label: 'גזע' },
  suffix: { bg: '#fce7f3', border: '#ec4899', text: '#9d174d', label: 'סופית' }
};

const ROLE_LABELS = {
  conjunction: 'ו\' החיבור', definite_article: 'ה\' הידיעה',
  preposition: 'מילת יחס', relativizer: 'ש\' השיעבוד',
  question: 'ה\' השאלה', stem: 'גזע', plural: 'רבים',
  dual: 'זוגי', possessive: 'כינוי שייכות',
  tense_person: 'זמן/גוף', object_pronoun: 'כינוי מושא',
  directional: 'ה\' הכיוונית', construct: 'סמיכות'
};

const POS_LABELS = {
  noun: 'שם עצם', verb: 'פועל', adjective: 'שם תואר',
  pronoun: 'כינוי', preposition: 'מילת יחס', adverb: 'תואר הפועל',
  conjunction: 'מילת חיבור', proper_noun: 'שם פרטי',
  particle: 'מילית', numeral: 'מספר', quantifier: 'כמת',
  interrogative: 'מילת שאלה'
};

const BINYAN_LABELS = {
  paal: 'פָּעַל', nifal: 'נִפְעַל', piel: 'פִּעֵל',
  pual: 'פֻּעַל', hifil: 'הִפְעִיל', hufal: 'הֻפְעַל', hitpael: 'הִתְפַּעֵל'
};

const GIZRA_LABELS = {
  shlemim: 'שְׁלֵמִים', ayin_vav: 'ע"ו', ayin_yod: 'ע"י',
  peh_nun: 'פ"נ', peh_yod: 'פ"י', lamed_heh: 'ל"ה',
  lamed_alef: 'ל"א', kfulim: 'כְּפוּלִים', peh_alef: 'פ"א'
};

const TENSE_LABELS = {
  past: 'עָבָר', present: 'הוֹוֶה', future: 'עָתִיד',
  imperative: 'צִיווּי', infinitive: 'מָקוֹר'
};

const PERSON_LABELS = { first: 'ראשון', second: 'שני', third: 'שלישי' };
const GENDER_LABELS = { masculine: 'זכר', feminine: 'נקבה', common: 'משותף' };
const NUMBER_LABELS = { singular: 'יחיד', plural: 'רבים', dual: 'זוגי' };

const NIQQUD_COLORS = {
  patach: '#ef4444', kamatz: '#f97316', chirik: '#22c55e',
  tzere: '#14b8a6', segol: '#06b6d4', cholam: '#3b82f6',
  kubutz: '#8b5cf6', shuruk: '#a855f7', shva: '#6b7280',
  dagesh: '#ec4899', chataf_patach: '#fbbf24',
  chataf_segol: '#34d399', chataf_kamatz: '#fb923c'
};

const SAMPLE_TEXTS = [
  'הַיְלָדִים הוֹלְכִים לְבֵית הַסֵּפֶר',
  'הִתְלַבַּשְׁתִּי בִּבְגָדִים יָפִים',
  'הִגְדַּלְתִּי אֶת הַתְּמוּנָה',
  'בָּנִיתִי בַּיִת גָּדוֹל',
  'יָדַיִם יָפוֹת'
];

const SAMPLE_UNVOCALIZED = [
  'הילדים הולכים לבית הספר',
  'אני אוהב לקרוא ספרים',
  'היום הלכתי לים',
  'הכלב רץ בגינה',
  'אמא בישלה ארוחת ערב טעימה'
];

// Hebrew niqqud Unicode range: 0x05B0 - 0x05BD, 0x05BF, 0x05C1, 0x05C2, 0x05C4, 0x05C5, 0x05C7
const NIQQUD_REGEX = /[\u05B0-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/;

function analyzeNiqqudStatus(text) {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return { status: 'empty', ratio: 0, total: 0, vocalized: 0 };
  
  let vocalizedCount = 0;
  for (const word of words) {
    if (NIQQUD_REGEX.test(word)) {
      vocalizedCount++;
    }
  }
  
  const ratio = vocalizedCount / words.length;
  
  let status;
  if (ratio === 0) {
    status = 'none';  // No niqqud at all
  } else if (ratio < 0.5) {
    status = 'partial_low';  // Less than half vocalized
  } else if (ratio < 1) {
    status = 'partial_high';  // More than half but not all
  } else {
    status = 'full';  // All words vocalized
  }
  
  return {
    status,
    ratio,
    total: words.length,
    vocalized: vocalizedCount,
    needsVocalization: status !== 'full'
  };
}

function buildVocalizationPrompt(text) {
  return `You are an expert Hebrew linguist. Add full niqqud (vocalization marks) to the following Hebrew text.

## Rules:
1. Add complete and accurate niqqud to every word
2. Use standard Israeli Hebrew pronunciation
3. Return ONLY the vocalized text, nothing else
4. Preserve the original word order and punctuation
5. Do not add explanations or markdown

## Examples:
"הילדים הולכים לבית הספר" → "הַיְלָדִים הוֹלְכִים לְבֵית הַסֵּפֶר"
"אני אוהב לקרוא" → "אֲנִי אוֹהֵב לִקְרוֹא"
"הכלב רץ בגינה" → "הַכֶּלֶב רָץ בַּגִּנָּה"

## Text to vocalize:
${text}`;
}

// ==================== VALIDATION ====================

function validateResponse(item) {
  const errors = [];
  const required = ['word', 'pos', 'morphology_parts', 'syllables', 'confidence'];
  
  for (const field of required) {
    if (!(field in item)) errors.push(`שדה חסר: ${field}`);
  }
  if (errors.length > 0) return { valid: false, errors };
  
  const word = item.word;
  
  if (!VALID_POS.has(item.pos)) errors.push(`POS לא תקין: '${item.pos}'`);
  
  const conf = item.confidence;
  if (typeof conf !== 'number' || conf < 0 || conf > 1) {
    errors.push(`confidence חייב להיות 0.0-1.0, קיבלנו: ${conf}`);
  }
  
  for (let i = 0; i < item.morphology_parts.length; i++) {
    const part = item.morphology_parts[i];
    if (!('text' in part)) errors.push(`חלק ${i} חסר 'text'`);
    if (!('type' in part)) errors.push(`חלק ${i} חסר 'type'`);
    else if (!VALID_TYPES.has(part.type)) errors.push(`חלק ${i} type לא תקין`);
    if (!('role' in part)) errors.push(`חלק ${i} חסר 'role'`);
    else if (!VALID_ROLES.has(part.role)) errors.push(`חלק ${i} role לא תקין`);
  }
  
  const partsJoined = item.morphology_parts.map(p => p.text || '').join('');
  if (partsJoined !== word) {
    errors.push(`שלמות morphology: '${partsJoined}' ≠ '${word}'`);
  }
  
  const syllablesJoined = item.syllables.join('');
  if (syllablesJoined !== word) {
    errors.push(`שלמות syllables: '${syllablesJoined}' ≠ '${word}'`);
  }
  
  if (item.binyan && !VALID_BINYANIM.has(item.binyan)) {
    errors.push(`בניין לא תקין: '${item.binyan}'`);
  }
  
  if (item.gizra && !VALID_GIZROT.has(item.gizra)) {
    errors.push(`גזרה לא תקינה: '${item.gizra}'`);
  }
  
  return { valid: errors.length === 0, errors };
}

// ==================== PROMPT ====================

function buildPrompt(text) {
  return `You are an expert Hebrew Morphological and Linguistic Analyzer.
Analyze vocalized Hebrew words with comprehensive linguistic information.

**Output:** Strict JSON array only. No markdown, no explanations.

## JSON Structure:
{
  "word": "exact input",
  "pos": "noun|verb|adjective|pronoun|preposition|adverb|conjunction|proper_noun|particle|numeral",
  "morphology_parts": [{"text":"...", "type":"prefix|stem|suffix", "role":"conjunction|definite_article|preposition|relativizer|stem|plural|possessive|tense_person|..."}],
  "syllables": ["..."],
  "root": "ה.ל.כ" or null,
  "binyan": "paal|nifal|piel|pual|hifil|hufal|hitpael" or null,
  "gizra": "shlemim|ayin_vav|peh_nun|lamed_heh|..." or null,
  "tense": "past|present|future|imperative|infinitive" or null,
  "person": "first|second|third" or null,
  "gender": "masculine|feminine|common" or null,
  "number": "singular|plural|dual" or null,
  "construct_state": "absolute|construct",
  "definiteness": "definite|indefinite",
  "frequency": 1-5,
  "level": "A1|A2|B1|B2|C1|C2",
  "related_words": ["..."] or null,
  "niqqud": [{"mark":"ַ", "name":"patach"}],
  "confidence": 0.0-1.0
}

## CRITICAL: 
- join(morphology_parts[*].text) == word EXACTLY
- join(syllables) == word EXACTLY
- Preserve ALL niqqud characters

## Examples:
"הָלַכְתִּי" → [{"word":"הָלַכְתִּי","pos":"verb","morphology_parts":[{"text":"הָלַכְ","type":"stem","role":"stem"},{"text":"תִּי","type":"suffix","role":"tense_person"}],"syllables":["הָ","לַכְ","תִּי"],"root":"ה.ל.כ","binyan":"paal","gizra":"shlemim","tense":"past","person":"first","gender":"common","number":"singular","construct_state":"absolute","definiteness":"indefinite","frequency":5,"level":"A1","related_words":["הֲלִיכָה","מַהֲלָךְ"],"niqqud":[{"mark":"ָ","name":"kamatz"},{"mark":"ַ","name":"patach"},{"mark":"ְ","name":"shva"},{"mark":"ִ","name":"chirik"}],"confidence":0.95}]

"הַיְלָדִים" → [{"word":"הַיְלָדִים","pos":"noun","morphology_parts":[{"text":"הַ","type":"prefix","role":"definite_article"},{"text":"יְלָד","type":"stem","role":"stem"},{"text":"ִים","type":"suffix","role":"plural"}],"syllables":["הַיְ","לָ","דִים"],"root":"י.ל.ד","binyan":null,"gizra":null,"tense":null,"person":null,"gender":"masculine","number":"plural","construct_state":"absolute","definiteness":"definite","frequency":5,"level":"A1","related_words":["יֶלֶד","יַלְדָּה"],"niqqud":[{"mark":"ַ","name":"patach"},{"mark":"ְ","name":"shva"},{"mark":"ָ","name":"kamatz"},{"mark":"ִ","name":"chirik"}],"confidence":0.95}]

Text: ${text}`;
}

// ==================== COMPONENTS ====================

function Badge({ children, color = '#6366f1', bg = '#eef2ff' }) {
  return (
    <span style={{
      background: bg,
      color: color,
      padding: '2px 8px',
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: '600',
      whiteSpace: 'nowrap'
    }}>
      {children}
    </span>
  );
}

function InfoRow({ label, value, color }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ color: color || '#1e40af', fontWeight: '600', fontSize: '13px' }}>{value}</span>
      <span style={{ color: '#64748b', fontSize: '12px' }}>{label}</span>
    </div>
  );
}

function FrequencyStars({ freq }) {
  return (
    <span style={{ color: '#f59e0b' }}>
      {'★'.repeat(freq)}{'☆'.repeat(5 - freq)}
    </span>
  );
}

function NiqqudDisplay({ niqqud }) {
  if (!niqqud || niqqud.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
      {niqqud.map((n, i) => (
        <span key={i} style={{
          background: NIQQUD_COLORS[n.name] + '20',
          border: `1px solid ${NIQQUD_COLORS[n.name] || '#cbd5e1'}`,
          borderRadius: '4px',
          padding: '2px 6px',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span style={{ fontSize: '18px' }}>{n.mark}</span>
          <span style={{ fontSize: '10px', color: '#64748b' }}>{n.name}</span>
        </span>
      ))}
    </div>
  );
}

function WordDisplay({ data, validation }) {
  const [expanded, setExpanded] = useState(false);
  const { word, pos, morphology_parts, syllables, confidence,
    root, binyan, gizra, tense, person, gender, number,
    construct_state, definiteness, frequency, level, related_words, niqqud } = data;
  
  const confPercent = Math.round(confidence * 100);
  const confColor = confidence >= 0.9 ? '#22c55e' : confidence >= 0.7 ? '#eab308' : '#ef4444';
  
  return (
    <div style={{
      background: validation.valid ? '#fff' : '#fef2f2',
      border: `2px solid ${validation.valid ? '#e2e8f0' : '#fecaca'}`,
      borderRadius: '16px',
      marginBottom: '16px',
      overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        padding: '16px 20px',
        borderBottom: '1px solid #e2e8f0',
        direction: 'rtl'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '28px', fontWeight: 'bold', fontFamily: 'David, serif' }}>{word}</span>
            <Badge>{POS_LABELS[pos] || pos}</Badge>
            {level && <Badge color="#059669" bg="#d1fae5">{level}</Badge>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {frequency && <FrequencyStars freq={frequency} />}
            <span style={{
              background: confColor + '20',
              color: confColor,
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              {confPercent}%
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: '16px 20px', direction: 'rtl' }}>
        {/* Morphology Parts */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', fontWeight: '600' }}>ניתוח מורפולוגי:</div>
          <div style={{ display: 'flex', gap: '6px', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {morphology_parts.map((part, i) => (
              <div key={i} style={{
                background: COLORS[part.type].bg,
                border: `2px solid ${COLORS[part.type].border}`,
                borderRadius: '10px',
                padding: '10px 14px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: '60px'
              }}>
                <span style={{
                  fontSize: '22px',
                  fontWeight: 'bold',
                  color: COLORS[part.type].text,
                  fontFamily: 'David, serif'
                }}>
                  {part.text}
                </span>
                <span style={{ fontSize: '10px', color: COLORS[part.type].text, marginTop: '4px', fontWeight: '600' }}>
                  {COLORS[part.type].label}
                </span>
                <span style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>
                  {ROLE_LABELS[part.role] || part.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Syllables */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', fontWeight: '600' }}>הברות:</div>
          <div style={{ display: 'flex', gap: '8px', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
            {syllables.map((syl, i) => (
              <React.Fragment key={i}>
                <span style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '18px',
                  fontFamily: 'David, serif'
                }}>
                  {syl}
                </span>
                {i < syllables.length - 1 && <span style={{ color: '#94a3b8', fontSize: '18px' }}>-</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Quick Info Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '8px',
          background: '#f8fafc',
          borderRadius: '12px',
          padding: '12px',
          marginBottom: '12px'
        }}>
          {root && (
            <div style={{ textAlign: 'center', padding: '8px' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e40af', fontFamily: 'David, serif' }}>{root}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>שורש</div>
            </div>
          )}
          {binyan && (
            <div style={{ textAlign: 'center', padding: '8px' }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#7c3aed' }}>{BINYAN_LABELS[binyan]}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>בניין</div>
            </div>
          )}
          {gizra && (
            <div style={{ textAlign: 'center', padding: '8px' }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0891b2' }}>{GIZRA_LABELS[gizra]}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>גזרה</div>
            </div>
          )}
          {tense && (
            <div style={{ textAlign: 'center', padding: '8px' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#059669' }}>{TENSE_LABELS[tense]}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>זמן</div>
            </div>
          )}
          {gender && (
            <div style={{ textAlign: 'center', padding: '8px' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#db2777' }}>{GENDER_LABELS[gender]}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>מין</div>
            </div>
          )}
          {number && (
            <div style={{ textAlign: 'center', padding: '8px' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ea580c' }}>{NUMBER_LABELS[number]}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>מספר</div>
            </div>
          )}
        </div>

        {/* Expand Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            width: '100%',
            padding: '8px',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '12px',
            color: '#64748b'
          }}
        >
          {expanded ? '▲ פחות פרטים' : '▼ עוד פרטים'}
        </button>

        {/* Expanded Details */}
        {expanded && (
          <div style={{ marginTop: '12px', padding: '12px', background: '#f8fafc', borderRadius: '12px' }}>
            <InfoRow label="מצב סמיכות" value={construct_state === 'construct' ? 'נסמך' : 'מוחלט'} />
            <InfoRow label="יידוע" value={definiteness === 'definite' ? 'מיודע' : 'לא מיודע'} />
            {person && <InfoRow label="גוף" value={PERSON_LABELS[person]} />}
            
            {related_words && related_words.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>מילים קשורות:</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {related_words.map((w, i) => (
                    <Badge key={i} color="#0f766e" bg="#ccfbf1">{w}</Badge>
                  ))}
                </div>
              </div>
            )}

            {niqqud && niqqud.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>סימני ניקוד:</div>
                <NiqqudDisplay niqqud={niqqud} />
              </div>
            )}
          </div>
        )}

        {/* Validation Errors */}
        {!validation.valid && (
          <div style={{
            marginTop: '12px',
            padding: '12px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px'
          }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#dc2626', marginBottom: '4px' }}>
              ⚠️ שגיאות ולידציה:
            </div>
            {validation.errors.map((err, i) => (
              <div key={i} style={{ fontSize: '11px', color: '#991b1b' }}>• {err}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== MAIN APP ====================

export default function HebrewMorphologyAnalyzer() {
  const [inputText, setInputText] = useState('');
  const [vocalizedText, setVocalizedText] = useState('');
  const [results, setResults] = useState(null);
  const [rawJson, setRawJson] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showRaw, setShowRaw] = useState(true);
  const [phase, setPhase] = useState(null); // 'checking' | 'vocalizing' | 'analyzing' | 'done'
  const [niqqudStatus, setNiqqudStatus] = useState(null);

  const generateSample = useCallback((vocalized = true) => {
    const samples = vocalized ? SAMPLE_TEXTS : SAMPLE_UNVOCALIZED;
    setInputText(samples[Math.floor(Math.random() * samples.length)]);
    setVocalizedText('');
    setResults(null);
    setNiqqudStatus(null);
    setPhase(null);
  }, []);

  const callAPI = async (prompt) => {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.content?.[0]?.text || '';
  };

  const analyzeText = useCallback(async () => {
    if (!inputText.trim()) {
      setError('נא להזין טקסט לניתוח');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);
    setRawJson('');
    setVocalizedText('');

    try {
      // Phase 1: Check niqqud status
      setPhase('checking');
      const status = analyzeNiqqudStatus(inputText);
      setNiqqudStatus(status);

      let textToAnalyze = inputText;

      // Phase 2: Vocalize if needed
      if (status.needsVocalization) {
        setPhase('vocalizing');
        const vocalized = await callAPI(buildVocalizationPrompt(inputText));
        textToAnalyze = vocalized.trim();
        setVocalizedText(textToAnalyze);
      }

      // Phase 3: Morphological analysis
      setPhase('analyzing');
      const content = await callAPI(buildPrompt(textToAnalyze));
      setRawJson(content);

      let jsonStr = content.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
      }

      const parsed = JSON.parse(jsonStr);
      const resultsArray = Array.isArray(parsed) ? parsed : [parsed];
      
      setResults(resultsArray.map(item => ({
        data: item,
        validation: validateResponse(item)
      })));
      
      setPhase('done');
    } catch (err) {
      setError(`שגיאה: ${err.message}`);
      setPhase(null);
    } finally {
      setLoading(false);
    }
  }, [inputText]);

  const validCount = results?.filter(r => r.validation.valid).length || 0;
  const totalCount = results?.length || 0;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      padding: '24px',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '40px',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #a78bfa, #38bdf8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '8px'
          }}>
            🔬 מנתח מורפולוגי מורחב
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '16px' }}>
            v2.0 — ניקוד אוטומטי + ניתוח מורפולוגי מלא
          </p>
        </div>

        {/* Input */}
        <div style={{
          background: 'rgba(255,255,255,0.98)',
          borderRadius: '20px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.4)'
        }}>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="הזן טקסט עברי מנוקד כאן..."
            dir="rtl"
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '16px',
              fontSize: '22px',
              fontFamily: 'David, serif',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
              marginBottom: '16px'
            }}
            onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
          />
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => generateSample(false)} style={{
              padding: '12px 20px', fontSize: '14px', fontWeight: '600',
              color: '#dc2626', background: '#fef2f2', border: '2px solid #fecaca',
              borderRadius: '12px', cursor: 'pointer'
            }}>
              📝 טקסט ללא ניקוד
            </button>
            <button onClick={() => generateSample(true)} style={{
              padding: '12px 20px', fontSize: '14px', fontWeight: '600',
              color: '#6366f1', background: '#eef2ff', border: '2px solid #c7d2fe',
              borderRadius: '12px', cursor: 'pointer'
            }}>
              ✨ טקסט מנוקד
            </button>
            <button onClick={analyzeText} disabled={loading} style={{
              padding: '12px 32px', fontSize: '15px', fontWeight: '600',
              color: '#fff', background: loading ? '#a5b4fc' : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              border: 'none', borderRadius: '12px', cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)'
            }}>
              {loading ? '⏳ מעבד...' : '🔍 נתח טקסט'}
            </button>
          </div>

          {/* Phase Progress */}
          {loading && phase && (
            <div style={{
              marginTop: '16px',
              padding: '12px 16px',
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '12px',
              direction: 'rtl'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
                <div style={{
                  width: '24px', height: '24px',
                  border: '3px solid #0ea5e9',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                <span style={{ color: '#0369a1', fontWeight: '600' }}>
                  {phase === 'checking' && '🔍 בודק מצב ניקוד...'}
                  {phase === 'vocalizing' && '✍️ מנקד את הטקסט...'}
                  {phase === 'analyzing' && '🔬 מנתח מורפולוגיה...'}
                </span>
              </div>
            </div>
          )}

          {/* Niqqud Status Display */}
          {niqqudStatus && !loading && (
            <div style={{
              marginTop: '16px',
              padding: '12px 16px',
              background: niqqudStatus.status === 'full' ? '#f0fdf4' : '#fffbeb',
              border: `1px solid ${niqqudStatus.status === 'full' ? '#86efac' : '#fcd34d'}`,
              borderRadius: '12px',
              direction: 'rtl'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>
                    {niqqudStatus.status === 'full' ? '✅' : 
                     niqqudStatus.status === 'none' ? '⚠️' : '🔶'}
                  </span>
                  <span style={{ color: '#374151', fontWeight: '500' }}>
                    {niqqudStatus.status === 'full' && 'הטקסט מנוקד במלואו'}
                    {niqqudStatus.status === 'none' && 'הטקסט ללא ניקוד - נוקד אוטומטית'}
                    {niqqudStatus.status === 'partial_low' && 'הטקסט מנוקד חלקית - נוקד אוטומטית'}
                    {niqqudStatus.status === 'partial_high' && 'הטקסט מנוקד חלקית - נוקד אוטומטית'}
                  </span>
                </div>
                <span style={{ 
                  fontSize: '13px', 
                  color: '#6b7280',
                  background: '#f3f4f6',
                  padding: '4px 8px',
                  borderRadius: '6px'
                }}>
                  {niqqudStatus.vocalized}/{niqqudStatus.total} מילים מנוקדות
                </span>
              </div>
            </div>
          )}

          {/* Vocalized Text Display */}
          {vocalizedText && (
            <div style={{
              marginTop: '16px',
              padding: '16px',
              background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
              border: '2px solid #34d399',
              borderRadius: '12px',
              direction: 'rtl'
            }}>
              <div style={{ 
                fontSize: '12px', 
                color: '#065f46', 
                marginBottom: '8px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>✨</span>
                <span>טקסט מנוקד אוטומטית:</span>
              </div>
              <div style={{
                fontSize: '22px',
                fontFamily: 'David, serif',
                color: '#064e3b',
                lineHeight: '1.8'
              }}>
                {vocalizedText}
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: '#fef2f2', border: '2px solid #fecaca', borderRadius: '12px',
            padding: '16px', marginBottom: '24px', color: '#dc2626', direction: 'rtl'
          }}>
            {error}
          </div>
        )}

        {/* Results */}
        {results && (
          <div style={{
            background: 'rgba(255,255,255,0.98)',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.4)'
          }}>
            {/* Summary */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid #e5e7eb'
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {Object.entries(COLORS).map(([type, c]) => (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '16px', height: '16px', background: c.bg, border: `2px solid ${c.border}`, borderRadius: '4px' }} />
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{c.label}</span>
                  </div>
                ))}
              </div>
              <span style={{
                fontSize: '18px', fontWeight: '700',
                color: validCount === totalCount ? '#22c55e' : '#eab308'
              }}>
                {validCount === totalCount ? '✓' : '⚠️'} {validCount}/{totalCount}
              </span>
            </div>

            {/* Word Cards */}
            {results.map((r, i) => (
              <WordDisplay key={i} data={r.data} validation={r.validation} />
            ))}

            {/* Raw Response */}
            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '2px solid #e5e7eb' }}>
              <button onClick={() => setShowRaw(!showRaw)} style={{
                padding: '8px 16px', fontSize: '13px', color: '#64748b',
                background: '#f1f5f9', border: '1px solid #e2e8f0',
                borderRadius: '8px', cursor: 'pointer', marginBottom: '12px'
              }}>
                📡 {showRaw ? 'הסתר' : 'הצג'} תגובה גולמית
              </button>
              
              {showRaw && rawJson && (
                <div style={{
                  background: '#0f172a', borderRadius: '12px', padding: '16px',
                  maxHeight: '400px', overflow: 'auto'
                }}>
                  <pre style={{
                    color: '#a5f3fc', fontSize: '12px', fontFamily: 'Monaco, Consolas, monospace',
                    margin: 0, direction: 'ltr', textAlign: 'left', whiteSpace: 'pre-wrap'
                  }}>
                    {rawJson}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
