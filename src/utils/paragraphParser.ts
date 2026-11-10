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
  '이 말씀은', '즉', '결론적으로', '첫째로', '둘째로', '그러나', '반면에',
  '한편', '결국', '주목할 것은', '사도 바울은', '저자는'
];

export function parseManuscriptToParagraphs(text: string): FormattedParagraph[] {
  if (!text || !text.trim()) return [];

  const rawLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let inOutlineSection = false;
  let outlineCounter = 1;
  let inScriptureBlock = false;
  let activeVerseParagraphId: string | null = null;

  const result: FormattedParagraph[] = [];

  rawLines.forEach((line, index) => {
    const id = `p-${Date.now()}-${index + 1}`;

    // 1. Check Document Title (e.g. line starts with # or prominent title)
    if (line.startsWith('# ')) {
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

    // 2. Check Roman numeral Heading 1 (e.g. I. 서론, II. 개요, III. 본문 연구)
    if (/^[I|V|X]+\.\s*/i.test(line)) {
      const isOutlineHeader = /(개요|outline)/i.test(line);
      result.push({
        id,
        originalText: line,
        type: 'heading_1',
      });

      if (isOutlineHeader) {
        inOutlineSection = true;
        outlineCounter = 1;
      } else {
        inOutlineSection = false;
      }
      inScriptureBlock = false;
      activeVerseParagraphId = null;
      return;
    }

    // 3. Handle Outline Section
    // User Specification: Outline items are treated as Normal Body (`body`), NOT a separate heading type.
    // Sequenced with Arabic numbers (1. 2. 3.), line breaks per item, without blank lines between items.
    if (inOutlineSection) {
      // Check if outline section ends: next Roman Numeral (e.g. III. 본론) or major Markdown heading (# or ##)
      if (/^[I|V|X]+\.\s*/i.test(line) || /^#{1,2}\s+/.test(line)) {
        inOutlineSection = false;
      } else {
        // Strip any existing leading number from the text to prevent "1. 1." duplication
        const cleanedText = line.replace(/^([0-9]+|[①-⑳]|[I|V|X]+)[\.\)\-\s\:]*/, '').trim();
        result.push({
          id,
          originalText: cleanedText || line,
          type: 'body', // Strictly 'body' type as per user prompt specification!
          isOutline: true,
          outlineNumber: outlineCounter++,
        });
        return;
      }
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
        type: 'scripture',
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
      const isVerse =
        VERSE_LINE_REGEX.test(line) ||
        (!activeVerseParagraphId &&
          !COMMENTARY_START_WORDS.some((word) => line.startsWith(word)) &&
          line.length < 300);
      const isCommentary = COMMENTARY_START_WORDS.some((word) => line.startsWith(word));

      if (isVerse && !isCommentary) {
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

    // 6. Check Arabic Numbered Headings (e.g. "1. 태초의 신비", "2. 창조의 사역")
    // Note: only matches short titles, not long sentences ending in '다.', and not inside outline
    if (/^[0-9]+\.\s+[^\n]{2,35}$/.test(line) && !line.includes('다.') && !line.includes('요.') && !line.includes('절')) {
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

  return result;
}
