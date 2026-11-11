import { FormattedParagraph } from './docxExporter';

// Korean Bible books name list (all 66 books and common abbreviations)
const BIBLE_BOOKS_NAMES = [
  '창세기', '출애굽기', '레위기', '민수기', '신명기',
  '여호수아', '사사기', '룻기', '사무엘상', '사무엘하',
  '열왕기상', '열왕기하', '역대상', '역대하', '에스라',
  '느헤미야', '에스더', '욥기', '시편', '잠언',
  '전도서', '아가', '이사야', '예레미야', '예레미야애가',
  '에스겔', '다니엘', '호세아', '요엘', '아모스',
  '오바댜', '요나', '미가', '나훔', '하박국',
  '스바냐', '학개', '스가랴', '말라기',
  '마태복음', '마가복음', '누가복음', '요한복음', '사도행전',
  '로마서', '고린도전서', '고린도후서', '갈라디아서', '에베소서',
  '빌립보서', '골로새서', '데살로니가전서', '데살로니가후서', '디모데전서',
  '디모데후서', '디도서', '빌레몬서', '히브리서', '야고보서',
  '베드로전서', '베드로후서', '요한일서', '요한이서', '요한삼서',
  '유다서', '요한계시록',
  // Abbreviations
  '창', '출', '레', '민', '신', '수', '삿', '룻', '삼상', '삼하',
  '왕상', '왕하', '대상', '대하', '스', '느', '더', '욥', '시', '잠',
  '전', '아', '사', '렘', '애', '겔', '단', '호', '욜', '암', '옵',
  '욘', '미', '나', '합', '습', '학', '슥', '말',
  '마', '막', '눅', '요', '행', '롬', '고전', '고후', '갈', '엡',
  '빌', '골', '살전', '살후', '딤전', '딤후', '딛', '몬', '히', '약',
  '벧전', '벧후', '요일', '요이', '요삼', '유', '계'
];

const BIBLE_BOOKS_PATTERN = BIBLE_BOOKS_NAMES.join('|');

// Matches a standalone Scripture Heading like "요한복음 1장", "요한복음 1:1-5", "[요 1:1~14]", "본문: 로마서 8:28"
const SCRIPTURE_HEADER_REGEX = new RegExp(
  `^(\\[|<|【|■|◆|●|▶)?\\s*(본문|성경\\s*본문|말씀|성경\\s*인용)?\\s*[:\\-\\s]?\\s*(${BIBLE_BOOKS_PATTERN})\\s*([0-9]+)\\s*(장|편)?(\\s*[:장\\s]\\s*([0-9]+)(\\s*[-~,]\\s*[0-9]+)?\\s*절?)?\\s*(\\]|>|】)?$`,
  'i'
);

// Matches a line that starts with Scripture reference like "요한복음 1:1 태초에 말씀이..." or "[요 1:1] 태초에..."
const INLINE_SCRIPTURE_START_REGEX = new RegExp(
  `^(\\[|<|【)?\\s*(${BIBLE_BOOKS_PATTERN})\\s*([0-9]+)\\s*[:장]\\s*([0-9]+)(\\s*[-~,]\\s*[0-9]+)?\\s*(\\]|>|】)?\\s+`,
  'i'
);

// Matches verse lines like "1 태초에 말씀이 계시니라...", "2 그가 태초에...", "1절 태초에..."
const VERSE_LINE_REGEX = /^([0-9]{1,3})[\s\.\)\]절:]\s*/;

// Indicators of explanatory commentary that should NOT be scripture
const COMMENTARY_START_WORDS = [
  '여기서', '특히', '따라서', '이처럼', '이는', '우리는', '이 구절은',
  '이 말씀은', '이 부분에서', '본문에서', '본 구절은', '즉', '결론적으로',
  '첫째로', '둘째로', '그러나', '반면에', '한편', '결국', '주목할 것은',
  '사도 바울은', '바울은', '저자는', '예수님은', '성경은', '사도는',
  '필자는', '이 단락은', '이 장은'
];

// Narrative explanatory endings (commentary verbs that never appear at end of Bible verse)
const COMMENTARY_ENDING_REGEX =
  /(설명한다|밝힌다|보여준다|의미한다|가리킨다|말한다|것이다|대조한다|주장한다|강조한다|선언한다|가르친다|권면한다|경고한다|나타낸다|증거한다)[\.\s]*$/;


function isOutlineHeader(line: string): boolean {
  const clean = line
    .replace(/^[*_#\s`~\[\]【】■●◆▶★·\-\d\.]+/g, '')
    .replace(/[*_#\s`~\[\]【】■●◆▶★·\-\:]+$/g, '')
    .trim();

  if (/^(개요|전체\s*개요|설교\s*개요|본문\s*개요|내용\s*개요|강해\s*개요|대지|설교\s*대지|요약|목차|outline)$/i.test(clean)) {
    return true;
  }

  const cleanWithPrefix = line
    .replace(/^[*_#\s`~\[\]【】■●◆▶★·\-]+/g, '')
    .replace(/[*_#\s`~\[\]【】■●◆▶★·\-]+$/g, '')
    .trim();

  return (
    /^[I|V|X\d]+[\.\)\s\-]+.*(개요|대지|outline)/i.test(cleanWithPrefix) ||
    /^(개요|전체\s*개요|설교\s*개요|본문\s*개요|내용\s*개요|대지)(\s*[:\-]|$)/i.test(cleanWithPrefix) ||
    /(개요|outline)\s*$/i.test(cleanWithPrefix)
  );
}

function isOutlineTerminator(line: string): boolean {
  const clean = line
    .replace(/^[*_#\s`~\[\]【】■●◆▶★·\-]+/g, '')
    .trim();
  return (
    /^[I|V|X]+\.\s+(?!.*(개요|대지))/i.test(clean) ||
    /^(III|IV|V|VI|VII)\./i.test(clean) ||
    /^(본론|본문\s*연구|결론|적용|설교\s*본론)\s*[:\.]?/i.test(clean) ||
    /^#\s+[^\n]+/.test(line)
  );
}

export function parseManuscriptToParagraphs(text: string): FormattedParagraph[] {
  if (!text || !text.trim()) return [];

  const rawLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => l.replace(/([0-9]+)\\\./g, '$1.').replace(/\\([.\-_)\]])/g, '$1'));

  let inOutlineSection = false;
  let outlineCounter = 1;
  let inScriptureBlock = false;
  let activeVerseParagraphId: string | null = null;

  const result: FormattedParagraph[] = [];

  // Identify the position of the first major heading (e.g. "I. 전체 내용", "## 전체 내용", "II. 개요" etc.)
  const firstMajorHeadingIndex = rawLines.findIndex(
    (l) => /^[I|V|X]+\.\s*/i.test(l) || /^#{1,3}\s+/.test(l) || isOutlineHeader(l)
  );

  rawLines.forEach((line, index) => {
    const id = `p-${Date.now()}-${index + 1}`;

    // 1. Check Document Title & Subtitle before the first major section
    if (firstMajorHeadingIndex > 0 && index < firstMajorHeadingIndex) {
      if (index === 0) {
        // First line at top of manuscript is Document Title (18pt)
        result.push({
          id,
          originalText: line.replace(/^#\s*/, '').trim(),
          type: 'doc_title',
        });
        inOutlineSection = false;
        inScriptureBlock = false;
        activeVerseParagraphId = null;
        return;
      }
      if (index === 1) {
        // Second line at top of manuscript before first section is Document Subtitle (14pt)
        result.push({
          id,
          originalText: line.replace(/^#{1,3}\s*/, '').trim(),
          type: 'doc_subtitle',
        });
        inOutlineSection = false;
        inScriptureBlock = false;
        activeVerseParagraphId = null;
        return;
      }
    }

    // Explicit Document Title with markdown '# '
    if (line.startsWith('# ') && !isOutlineHeader(line)) {
      result.push({
        id,
        originalText: line.replace(/^#\s*/, '').trim(),
        type: 'doc_title',
      });
      inOutlineSection = false;
      inScriptureBlock = false;
      activeVerseParagraphId = null;
      return;
    }

    // 2. Check if this line is an Outline Section Header (e.g. "II. 개요", "## II. 개요", "개요:", "전체 개요")
    if (isOutlineHeader(line)) {
      result.push({
        id,
        originalText: line.replace(/^#{1,3}\s*/, '').trim(),
        type: 'heading_1',
      });
      inOutlineSection = true;
      outlineCounter = 1;
      inScriptureBlock = false;
      activeVerseParagraphId = null;
      return;
    }

    // 3. Handle Outline Section
    // User Specification: Outline items are treated strictly as Normal Body (`body`) 10pt, NOT a separate heading type.
    if (inOutlineSection) {
      if (isOutlineTerminator(line)) {
        inOutlineSection = false;
        // Fall through to parse this line as next section/heading
      } else {
        const cleanedText = line.replace(/^([0-9]+|[①-⑳]|[I|V|X]+)[\.\)\-\s\:]*/, '').trim();
        result.push({
          id,
          originalText: cleanedText || line,
          type: 'body', // Strictly 'body' type - NEVER a heading!
          isOutline: true,
          outlineNumber: outlineCounter++,
        });
        return;
      }
    }

    // 4. Check Roman numeral Heading 1 (e.g. I. 서론, III. 본문 연구, IV. 결론)
    if (/^[I|V|X]+\.\s*/i.test(line)) {
      result.push({
        id,
        originalText: line,
        type: 'heading_1',
      });
      inOutlineSection = false;
      inScriptureBlock = false;
      activeVerseParagraphId = null;
      return;
    }

    // 4. Check Markdown headings
    if (line.startsWith('## ')) {
      result.push({
        id,
        originalText: line.replace(/^##\s*/, '').trim(),
        type: 'heading_2',
      });
      inScriptureBlock = false;
      activeVerseParagraphId = null;
      return;
    }

    if (line.startsWith('### ')) {
      result.push({
        id,
        originalText: line.replace(/^###\s*/, '').trim(),
        type: 'heading_3',
      });
      inScriptureBlock = false;
      activeVerseParagraphId = null;
      return;
    }

    if (line.startsWith('#### ')) {
      result.push({
        id,
        originalText: line.replace(/^####\s*/, '').trim(),
        type: 'heading_4',
      });
      inScriptureBlock = false;
      activeVerseParagraphId = null;
      return;
    }

    // 5. Scripture Citation Detection & Continuous Verse Merging
    // (A) Check if this line is a Scripture Header (e.g. "요한복음 1장", "요한복음 1:1-5", "[창 1:1]")
    if (SCRIPTURE_HEADER_REGEX.test(line)) {
      inScriptureBlock = true;
      activeVerseParagraphId = null; // Next verses will merge into their own single paragraph
      result.push({
        id,
        originalText: line,
        type: 'scripture_header',
      });
      return;
    }

    // (B) Check if line starts directly with Bible reference (e.g. "요한복음 1:1 태초에 말씀이 계시니라...")
    if (INLINE_SCRIPTURE_START_REGEX.test(line)) {
      inScriptureBlock = true;
      activeVerseParagraphId = id;
      result.push({
        id,
        originalText: line,
        type: 'scripture',
      });
      return;
    }

    // (C) If inside Scripture block and this line is part of the scripture passage:
    // Continuous verses must be merged into ONE single paragraph without line breaks!
    if (inScriptureBlock) {
      const startsWithVerseNumber = VERSE_LINE_REGEX.test(line);
      const startsWithQuote = /^[“"「]/.test(line);
      const hasCommentaryStart = COMMENTARY_START_WORDS.some((word) => line.startsWith(word));
      const hasCommentaryEnding = COMMENTARY_ENDING_REGEX.test(line);

      // It is commentary if:
      // 1) It starts with commentary indicator ("이 부분에서", "여기서", "사도 바울은" 등)
      // 2) OR it does NOT start with a verse number and ends with a commentary verb ("~설명한다.", "~밝힌다." 등)
      const isCommentary =
        hasCommentaryStart ||
        (!startsWithVerseNumber && hasCommentaryEnding);

      // Real scripture verse lines MUST either start with a verse number (e.g. "2 ", "5. ", "1절 ")
      // or start with a scripture quotation mark, and must NOT be commentary.
      const isVerse = (startsWithVerseNumber || startsWithQuote) && !isCommentary;

      if (isVerse) {
        // If an active verse paragraph already exists in this block, merge continuously!
        if (activeVerseParagraphId) {
          const activeP = result.find((p) => p.id === activeVerseParagraphId);
          if (activeP) {
            activeP.originalText += ' ' + line;
            return;
          }
        }

        // First verse line in this scripture block
        activeVerseParagraphId = id;
        result.push({
          id,
          originalText: line,
          type: 'scripture',
        });
        return;
      } else {
        // Exited scripture verse sequence into commentary or next section
        inScriptureBlock = false;
        activeVerseParagraphId = null;
      }
    }

    // (D) Direct stand-alone quoted scripture (e.g. "“태초에 말씀이 계시니라...” (요 1:1)")
    if (/^[“"「].+?[”"」]\s*\([가-힣\s0-9:~\-]+\)$/.test(line)) {
      result.push({
        id,
        originalText: line,
        type: 'scripture',
      });
      inScriptureBlock = false;
      activeVerseParagraphId = null;
      return;
    }

    // 6. Check Arabic Numbered Headings (e.g. "1. 태초의 신비", "5. 하나님의 어린양으로 오신 예수 그리스도 (29-34절)")
    // Matches titles starting with number followed by period, not ending in '다.', and not inside outline
    if (/^[0-9]+[\.\)]\s+[^\n]{2,70}$/.test(line) && !line.endsWith('다.') && !line.endsWith('요.') && !line.endsWith('다') && !line.endsWith('니다.')) {
      result.push({
        id,
        originalText: line,
        type: 'heading_2',
      });
      inScriptureBlock = false;
      activeVerseParagraphId = null;
      return;
    }

    // 7. Check Sub-numbered items 1) 2) 3)
    if (/^[0-9]+\)\s+[^\n]{2,35}$/.test(line) && !line.includes('다.')) {
      result.push({
        id,
        originalText: line,
        type: 'heading_3',
      });
      inScriptureBlock = false;
      activeVerseParagraphId = null;
      return;
    }

    // Default to general body (commentary, explanation, etc.)
    result.push({
      id,
      originalText: line,
      type: 'body',
    });
    inScriptureBlock = false;
    activeVerseParagraphId = null;
  });

  // 8. 문맥 사전분석을 통한 단락별 핵심 강조어구 및 정의 단어 자동 지정
  // 규칙:
  // - 성경 본문/제목 및 일반 제목에는 일절 미적용 (빈 배열)
  // - 일반 본문 단락마다 문맥 핵심 내용(어구/명제) 또는 정의 설명 단어 중심 추출
  // - 동일 단어가 모든 문단에서 지루하게 반복되지 않도록 최근 강조어 추적 및 문단별 고유 핵심 어구 우선
  const recentUsedWords: string[] = [];

  result.forEach((p) => {
    // 제목 및 성경 구절/장 이름은 일절 강조 적용 배제
    if (
      p.type === 'doc_title' ||
      p.type === 'doc_subtitle' ||
      p.type.startsWith('heading') ||
      p.type === 'scripture_header' ||
      p.type === 'scripture'
    ) {
      p.emphasisPhrases = [];
      return;
    }

    // 일반 본문(body, quote) 및 개요 항목에 대해 단락별 핵심 어구 분석
    const extracted = extractParagraphEmphasis(p.originalText, recentUsedWords);
    p.emphasisPhrases = extracted;

    // 최근 사용된 어구 목록 업데이트 (최근 6개 유지하여 과도한 중복 억제)
    extracted.forEach((phrase) => {
      recentUsedWords.push(phrase);
      if (recentUsedWords.length > 6) {
        recentUsedWords.shift();
      }
    });
  });

  return result;
}

/**
 * 추출된 어구가 어절(단어) 중간에서 잘리지 않도록 어절 경계로 안전하게 보정하는 함수
 * - "력에 달려 있지 않다는..." -> "능력에 달려 있지 않다는..." (완전한 단어로 시작)
 * - "에 내주하시며..." -> "안에 내주하시며..." 또는 "신자 안에 내주하시며..." (완전한 단어로 시작)
 */
export function alignToWordBoundary(fullText: string, phrase: string): string {
  if (!phrase || !fullText.includes(phrase)) return phrase;
  const idx = fullText.indexOf(phrase);
  if (idx < 0) return phrase;

  let start = idx;
  let end = idx + phrase.length;

  // 시작 위치가 단어 중간(앞에 공백/구두점 없이 한글/영문/숫자가 붙어있는 경우)이면 단어 시작점까지 확장
  while (start > 0 && !/[\s,.:;!?'"“‘”’()[\]\n]/.test(fullText[start - 1])) {
    start--;
  }

  // 끝 위치가 단어 중간(뒤에 공백/구두점 없이 한글/영문/숫자가 붙어있는 경우)이면 단어 끝점까지 확장
  while (end < fullText.length && !/[\s,.:;!?'"“‘”’()[\]\n]/.test(fullText[end])) {
    end++;
  }

  return fullText.slice(start, end).trim();
}

const FORBIDDEN_EMPHASIS_WORDS = new Set([
  '하', '않', '있', '없', '되', '보', '한', '된', '이', '가', '은', '는', '을', '를',
  '의', '에', '와', '과', '도', '로', '고', '며', '서', '라', '즉', '또', '이것', '저것',
  '그것', '사람', '인간', '경우', '때문', '사실', '대한', '위해'
]);

/**
 * 단일 문단 텍스트를 사전 분석하여 핵심 어구(어구/문장/명제) 및 정의 단어 추출
 * - 단일 글자(1글자: 하, 않, 있 등) 추출 절대 금지 (최소 2글자 이상 어구/단어만 허용)
 * - 어절(단어) 중간 절단 절대 금지: 항상 완전한 단어로 시작하고 끝남
 * - 사용자 지침: 단어의 뜻을 설명할 때만 정의 단어 지정, 문맥 속 핵심 내용인 명제/어구 볼드 처리
 */
export function extractParagraphEmphasis(text: string, recentUsedWords: string[] = []): string[] {
  const p = text.trim();
  if (!p) return [];

  const targets: string[] = [];
  const isRecent = (phrase: string) =>
    recentUsedWords.some(
      (r) => r === phrase || (r.length >= 3 && phrase.length >= 3 && (r.includes(phrase) || phrase.includes(r)))
    );

  const addTarget = (phrase: string) => {
    if (!phrase) return;
    const clean = alignToWordBoundary(p, phrase.trim());
    if (
      clean.length >= 2 &&
      !FORBIDDEN_EMPHASIS_WORDS.has(clean) &&
      !targets.includes(clean) &&
      !isRecent(clean)
    ) {
      targets.push(clean);
    }
  };

  // 1. 작성자가 원고에 명시적으로 지정한 볼드 마크다운 (**어구**)
  const mdMatches = p.match(/\*\*(.+?)\*\*/g);
  if (mdMatches) {
    for (const m of mdMatches) {
      const cleaned = m.replace(/\*\*/g, '').trim();
      addTarget(cleaned);
    }
  }

  // 2. [강조단어] 어떤 단어의 뜻이나 개념을 설명하거나 정의하는 경우의 단어 (사용자 지침: 단어 뜻 설명할 때만 적용)
  // 규칙: 반드시 2글자 이상의 명사/개념어만 허용 (하는, 있는, 않은 등 동사 어간 오인 추출 원천 차단)
  const definitionPatterns = [
    /['"“‘]([가-힣a-zA-Z0-9\s]{2,12})['"”’]\s*(?:라는|이란|란|의\s*의미|을\s*뜻|를\s*뜻|표현은)/,
    /(?:^|\s)([가-힣]{2,8})(?:이란|란)\s+[^\n]{2,30}?(?:뜻한다|의미한다|가리킨다|말한다)/,
    /(?:여기서\s+)([가-힣]{2,8})(?:은|는)\s+[^\n]{2,30}?(?:뜻한다|의미한다|가리킨다|말한다)/,
    /(?:^|\s)([가-힣\s]{2,12})(?:이라는|라는)\s*(?:표현|말|단어|개념)은/,
    /(?:^|\s)([가-힣\s]{2,12})(?:이|가)\s*없다는\s*것은/,
  ];

  for (const reg of definitionPatterns) {
    const match = p.match(reg);
    if (match && match[1]) {
      const term = match[1].trim();
      if (
        term.length >= 2 &&
        term.length <= 12 &&
        !FORBIDDEN_EMPHASIS_WORDS.has(term) &&
        !targets.includes(term) &&
        !isRecent(term)
      ) {
        targets.push(term);
        break;
      }
    }
  }

  // 3. [강조어구] 문맥과 내용 중 핵심 내용인 명제 및 결론 어구 (단락의 핵심 메시지)
  // (A) 대조/반전 핵심 명제 ("~가 아니라 [핵심 어구]이다/선언이다/사실이다/보여준다/하는 것이다")
  const contrastMatch = p.match(
    /(?:아니라|아닌),?\s*([가-힣\s]{4,60}?(?:하는\s*것이다|것이다|이다|선언이다|사실이다|진리이다|약속이다|표현이다|보여준다|말한다))/
  );
  if (contrastMatch && contrastMatch[1]) {
    addTarget(contrastMatch[1]);
  }

  // (B) 주어-핵심 서술 명제 ("성령은/바울은/사도는 [신자 안에 내주하시며 그가 하나님의 자녀라는 사실을 증언한다]")
  const subjMatch = p.match(
    /(?:^|[.?!]\s*|\n)\s*(?:성령은|바울은|사도\s*바울은|사도는|저자는|성경은|본문은)\s+([가-힣\s]{4,60}?(?:증언한다|밝힌다|선언한다|보여준다|가르친다|말한다|증명한다))/
  );
  if (subjMatch && subjMatch[1]) {
    addTarget(subjMatch[1]);
  }

  // (C) 핵심 진리 및 사실 강조 ("중요한 것은 [핵심 내용] 사실/점/것이다")
  const importantMatch = p.match(
    /(?:중요한\s*것은|주목할\s*점은|핵심은|기억할\s*것은)\s*([가-힣\s]{4,45}?(?:사실이다|점이다|진리이다|것이다))/
  );
  if (importantMatch && importantMatch[1]) {
    addTarget(importantMatch[1]);
  }

  // (D) 신학적 선언 및 성격 ("이 말씀은/선언은 [핵심 성격] 표현/선언/약속이다")
  const statementMatch = p.match(
    /(?:이\s*말씀은|이\s*선언은|본문은|성경은)\s*([가-힣\s]{4,40}?(?:표현이다|선언이다|고백이다|약속이다|계시이다))/
  );
  if (statementMatch && statementMatch[1]) {
    addTarget(statementMatch[1]);
  }

  // (E) 인과/구속 사역의 근거 ("~때문에/인하여 [핵심 결과/의미]다")
  const causalMatch = p.match(
    /([가-힣\s]{4,35}?(?:때문에|인하여)\s+[가-힣\s]{4,30}?(?:않는다는\s*의미다|의미다|뜻이다|구원이다|것이다))/
  );
  if (causalMatch && causalMatch[1]) {
    addTarget(causalMatch[1]);
  }

  // (F) 대속 및 연합의 핵심 어구 ("~대신하여 [율법의 요구와 죄의 형벌을 담당하셨기 때문에]")
  const substitutionMatch = p.match(
    /([가-힣\s]{3,20}?(?:대신하여)\s+[가-힣\s]{4,35}?(?:담당하셨기\s*때문에|완성하셨기\s*때문에|것이다))/
  );
  if (substitutionMatch && substitutionMatch[1]) {
    addTarget(substitutionMatch[1]);
  }

  // (G) 따옴표로 감싸진 핵심 인용구 (“...”, ‘...’)
  const quoteMatch = p.match(/[“"「]([가-힣\s]{3,25})[”"」]/);
  if (quoteMatch && quoteMatch[1]) {
    addTarget(quoteMatch[1]);
  }

  // 4. 단락에 아직 강조어구가 없는 경우: 문맥 핵심 신학 어구 및 주제구 보강 (단락마다 반드시 1개 강조 보장)
  if (targets.length === 0) {
    const THEMATIC_REGEXES = [
      /([가-힣\s]{2,15}?(?:구속\s*사역과\s*성령의\s*적용|구속\s*사역|대속의\s*은혜|그리스도와의\s*연합|하나님의\s*심판|율법의\s*요구와\s*죄의\s*형벌|율법의\s*요구|죄와\s*사망의\s*지배|사망의\s*몸에서\s*건져낼|성령의\s*적용|은혜와\s*진리|하나님의\s*어린양|영원한\s*생명|의롭다\s*하심|새\s*언약|창조의\s*선언|세례\s*요한의\s*증언)[가-힣\s]{0,10})/,
      /([가-힣\s]{4,30}?(?:질문한다|선언한다|밝힌다|보여준다|증언한다|고백한다|증명한다))/,
      /([가-힣\s]{3,25}?(?:죄의\s*형벌|그리스도와\s*연합|정죄함이\s*없나니|하나님의\s*의|절대적이고\s*영원한\s*선언))/,
    ];

    for (const reg of THEMATIC_REGEXES) {
      const match = p.match(reg);
      if (match && match[1]) {
        addTarget(match[1]);
        if (targets.length > 0) break;
      }
    }
  }

  // 단락당 최대 2개 선별 (보통 1~2개가 가장 가독성이 높고 핵심 전달이 잘 됨)
  return targets.slice(0, 2);
}

