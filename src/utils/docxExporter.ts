import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  convertInchesToTwip,
  convertMillimetersToTwip,
} from 'docx';

export type ParagraphType =
  | 'doc_title'
  | 'doc_subtitle'
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'heading_4'
  | 'heading_5'
  | 'body'
  | 'scripture_header'
  | 'scripture'
  | 'quote'
  | 'numbered_list'
  | 'bullet_list';

export interface FormattedParagraph {
  id: string;
  originalText: string;
  type: ParagraphType;
  isOutline?: boolean;
  outlineNumber?: number; // 1, 2, 3...
  customNotes?: string;
  emphasisPhrases?: string[]; // 단락별 사전분석 강조 단어·어구
}

export interface DocxExportConfig {
  fontFamily: string; // e.g. '맑은 고딕'
  bodyFontSizePt: number; // 10
  lineHeightRatio: number; // 1.35
  alignment: 'both' | 'left' | 'center';
  scriptureColor: string; // 'EA580C'
  scriptureHeaderFontSizePt: number; // 10 (성경 장 이름: 10pt)
  scriptureFontSizePt: number; // 9 (성경 본문 구절: 9pt)
  outlineNumberFormat: '1.' | '1)' | '1-';
  outlineSpaceAfterPt: number; // 2
  headingSizes: {
    doc_title: number; // 18
    heading_1: number; // 16
    heading_2: number; // 14
    heading_3: number; // 13
    heading_4: number; // 12
    heading_5: number; // 11
  };
  emphasisWords: string[]; // 강조 단어/어구 목록
  autoBoldMarkdown: boolean; // **단어** 볼드 처리 여부
}

// Helper to parse text into bold/normal text runs
function parseInlineRuns(
  text: string,
  options: {
    font: string;
    sizeHalfPt: number;
    color?: string;
    baseBold?: boolean;
    emphasisWords: string[];
    autoBoldMarkdown: boolean;
  }
): TextRun[] {
  const { font, sizeHalfPt, color, baseBold = false, emphasisWords, autoBoldMarkdown } = options;

  // If text contains markdown bold like **word**
  if (autoBoldMarkdown && text.includes('**')) {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.flatMap((part) => {
      if (!part) return [];
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        const inner = part.slice(2, -2);
        return [
          new TextRun({
            text: inner,
            font,
            size: sizeHalfPt,
            bold: true,
            color,
          }),
        ];
      }
      return parseEmphasisWordsOnly(part, { font, sizeHalfPt, color, baseBold, emphasisWords });
    });
  }

  return parseEmphasisWordsOnly(text, { font, sizeHalfPt, color, baseBold, emphasisWords });
}

function parseEmphasisWordsOnly(
  text: string,
  options: {
    font: string;
    sizeHalfPt: number;
    color?: string;
    baseBold?: boolean;
    emphasisWords: string[];
  }
): TextRun[] {
  const { font, sizeHalfPt, color, baseBold = false, emphasisWords } = options;
  if (!text) return [];

  const validKeywords = emphasisWords.map((k) => k.trim()).filter((k) => k.length > 0);
  if (validKeywords.length === 0) {
    return [
      new TextRun({
        text,
        font,
        size: sizeHalfPt,
        bold: baseBold,
        color,
      }),
    ];
  }

  // Regex escape keywords, sorted longest first for optimal multi-word matching
  const sortedKeywords = [...validKeywords].sort((a, b) => b.length - a.length);
  const patternParts = sortedKeywords.map((k) => {
    const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (k.length <= 2) {
      return `(?:(?<=[\\s"'“‘(\\[{.,]|^)${escaped}(?=[\\s"'”’)\\]!?,.:;~]|$|[은는이가을를의에과와도란]))`;
    }
    return escaped;
  });
  const regexPattern = new RegExp(`(${patternParts.join('|')})`, 'g');

  const tokens = text.split(regexPattern);
  const seenInParagraph = new Set<string>();

  return tokens.flatMap((token) => {
    if (!token) return [];
    const isKeyword = validKeywords.includes(token);

    // 문단 내에서 동일 강조어가 너무 자주 반복되어 어지러워지지 않도록 문단당 1회만 일반 본문과 같은 색의 볼드체 적용
    if (isKeyword) {
      if (!seenInParagraph.has(token)) {
        seenInParagraph.add(token);
        return [
          new TextRun({
            text: token,
            font,
            size: sizeHalfPt,
            bold: true,
            color: color || '1E293B', // 일반 본문과 동일한 색상(#1E293B)으로 지정하고 볼드체 처리
          }),
        ];
      }
      // 동일 문단 내 2회차 이후 등장은 일반 텍스트로 자연스럽게 유지
      return [
        new TextRun({
          text: token,
          font,
          size: sizeHalfPt,
          bold: baseBold,
          color,
        }),
      ];
    }

    return [
      new TextRun({
        text: token,
        font,
        size: sizeHalfPt,
        bold: baseBold,
        color,
      }),
    ];
  });
}

export const DEFAULT_DOCX_CONFIG: DocxExportConfig = {
  fontFamily: '맑은 고딕',
  bodyFontSizePt: 10,
  lineHeightRatio: 1.35,
  alignment: 'both',
  scriptureColor: 'EA580C',
  scriptureHeaderFontSizePt: 10,
  scriptureFontSizePt: 9,
  outlineNumberFormat: '1.',
  outlineSpaceAfterPt: 2,
  headingSizes: {
    doc_title: 18,
    heading_1: 16,
    heading_2: 14,
    heading_3: 13,
    heading_4: 12,
    heading_5: 11,
  },
  emphasisWords: [],
  autoBoldMarkdown: true,
};

export async function generateDocxBlob(
  paragraphs: FormattedParagraph[],
  config: DocxExportConfig = DEFAULT_DOCX_CONFIG
): Promise<Blob> {
  const cfg: DocxExportConfig = { ...DEFAULT_DOCX_CONFIG, ...(config || {}) };
  const docxParagraphs: Paragraph[] = [];
  const font = cfg.fontFamily || '맑은 고딕';

  // Map alignment
  const alignMap = {
    both: AlignmentType.BOTH,
    left: AlignmentType.LEFT,
    center: AlignmentType.CENTER,
  };
  const bodyAlignment = alignMap[cfg.alignment] || AlignmentType.BOTH;

  // Line height: standard Word single is 240 dxa (lineRule: "auto", line: ratio * 240)
  const lineSpacingDxa = Math.round((cfg.lineHeightRatio || 1.35) * 240);

  paragraphs.forEach((p) => {
    let rawText = p.originalText
      .trim()
      .replace(/([0-9]+)\\\./g, '$1.')
      .replace(/\\([.\-_)\]])/g, '$1');
    if (!rawText) return;

    // Handle Outline item (isOutline: true)
    if (p.isOutline) {
      // Clean existing numbers if user already had "1." or "1)"
      const cleanedOutlineText = rawText.replace(/^([0-9]+|[①-⑳]|[I|V|X]+)[\.\)\-\s]*/, '').trim();
      const numFmt = config.outlineNumberFormat || '1.';
      const numPrefix = numFmt.replace('1', String(p.outlineNumber || 1)) + ' ';

      const runs = [
        new TextRun({
          text: numPrefix,
          font,
          size: config.bodyFontSizePt * 2,
          bold: true,
          color: '9A3412',
        }),
        ...parseInlineRuns(cleanedOutlineText, {
          font,
          sizeHalfPt: config.bodyFontSizePt * 2,
          emphasisWords: [], // 개요 및 제목에는 별도 강조어 미적용 (일반 본문 서식 유지)
          autoBoldMarkdown: config.autoBoldMarkdown,
        }),
      ];

      docxParagraphs.push(
        new Paragraph({
          children: runs,
          alignment: bodyAlignment,
          spacing: {
            line: lineSpacingDxa,
            after: (config.outlineSpaceAfterPt || 2) * 20, // 2pt after
            before: 0,
          },
          indent: {
            left: convertMillimetersToTwip(4),
            hanging: convertMillimetersToTwip(4),
          },
        })
      );
      return;
    }

    // Handle by paragraph type
    switch (p.type) {
      case 'doc_title': {
        const runs = parseInlineRuns(rawText, {
          font,
          sizeHalfPt: config.headingSizes.doc_title * 2,
          baseBold: true,
          color: 'C2410C',
          emphasisWords: [], // 제목에는 강조어구 미적용
          autoBoldMarkdown: config.autoBoldMarkdown,
        });
        docxParagraphs.push(
          new Paragraph({
            children: runs,
            alignment: bodyAlignment,
            spacing: { before: 240, after: 180, line: lineSpacingDxa },
          })
        );
        break;
      }

      case 'doc_subtitle': {
        const runs = parseInlineRuns(rawText, {
          font,
          sizeHalfPt: config.headingSizes.heading_2 * 2, // 부제목 14pt
          baseBold: true,
          color: '475569',
          emphasisWords: [], // 부제목에는 강조어구 미적용
          autoBoldMarkdown: config.autoBoldMarkdown,
        });
        docxParagraphs.push(
          new Paragraph({
            children: runs,
            alignment: bodyAlignment,
            spacing: { before: 60, after: 180, line: lineSpacingDxa },
          })
        );
        break;
      }

      case 'heading_1': {
        const runs = parseInlineRuns(rawText, {
          font,
          sizeHalfPt: config.headingSizes.heading_1 * 2,
          baseBold: true,
          color: 'C2410C',
          emphasisWords: [], // 대제목에는 강조어구 미적용
          autoBoldMarkdown: config.autoBoldMarkdown,
        });
        docxParagraphs.push(
          new Paragraph({
            children: runs,
            heading: HeadingLevel.HEADING_1,
            alignment: bodyAlignment,
            spacing: { before: 240, after: 120, line: lineSpacingDxa },
          })
        );
        break;
      }

      case 'heading_2': {
        const runs = parseInlineRuns(rawText, {
          font,
          sizeHalfPt: config.headingSizes.heading_2 * 2,
          baseBold: true,
          color: '334155',
          emphasisWords: [], // 중제목에는 강조어구 미적용
          autoBoldMarkdown: config.autoBoldMarkdown,
        });
        docxParagraphs.push(
          new Paragraph({
            children: runs,
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.LEFT,
            spacing: { before: 180, after: 80, line: lineSpacingDxa },
          })
        );
        break;
      }

      case 'heading_3': {
        const runs = parseInlineRuns(rawText, {
          font,
          sizeHalfPt: config.headingSizes.heading_3 * 2,
          baseBold: true,
          color: '475569',
          emphasisWords: [], // 소제목에는 강조어구 미적용
          autoBoldMarkdown: config.autoBoldMarkdown,
        });
        docxParagraphs.push(
          new Paragraph({
            children: runs,
            heading: HeadingLevel.HEADING_3,
            alignment: AlignmentType.LEFT,
            spacing: { before: 140, after: 60, line: lineSpacingDxa },
          })
        );
        break;
      }

      case 'heading_4':
      case 'heading_5': {
        const runs = parseInlineRuns(rawText, {
          font,
          sizeHalfPt: config.headingSizes.heading_4 * 2,
          baseBold: true,
          color: '475569',
          emphasisWords: [], // 하위 제목에는 강조어구 미적용
          autoBoldMarkdown: config.autoBoldMarkdown,
        });
        docxParagraphs.push(
          new Paragraph({
            children: runs,
            alignment: AlignmentType.LEFT,
            spacing: { before: 100, after: 40, line: lineSpacingDxa },
          })
        );
        break;
      }

      case 'scripture_header': {
        // Scripture Chapter/Book Title: 10pt, bold, soft orange, spaceAfter: 0 (빈 줄 없음)
        const hexColor = config.scriptureColor.replace('#', '') || 'EA580C';
        const runs = parseInlineRuns(rawText, {
          font,
          sizeHalfPt: (config.scriptureHeaderFontSizePt || 10) * 2,
          baseBold: true,
          color: hexColor,
          emphasisWords: [], // 성경 본문 및 성경 장제목에는 강조어구 미적용 (요청사항 반영)
          autoBoldMarkdown: config.autoBoldMarkdown,
        });
        docxParagraphs.push(
          new Paragraph({
            children: runs,
            alignment: bodyAlignment,
            spacing: { before: 100, after: 0, line: lineSpacingDxa },
            indent: {
              left: convertMillimetersToTwip(5),
              right: convertMillimetersToTwip(5),
            },
          })
        );
        break;
      }

      case 'scripture': {
        // Scripture Verse Text: 9pt, bold, soft orange, spaceBefore: 0 (장 이름과 빈 줄 없이 밀착)
        const hexColor = config.scriptureColor.replace('#', '') || 'EA580C';
        const runs = parseInlineRuns(rawText, {
          font,
          sizeHalfPt: (config.scriptureFontSizePt || 9) * 2,
          baseBold: true,
          color: hexColor,
          emphasisWords: [], // 성경 본문 구절에는 강조어구 미적용 (요청사항 반영)
          autoBoldMarkdown: config.autoBoldMarkdown,
        });
        docxParagraphs.push(
          new Paragraph({
            children: runs,
            alignment: bodyAlignment,
            spacing: { before: 0, after: 120, line: lineSpacingDxa },
            indent: {
              left: convertMillimetersToTwip(5),
              right: convertMillimetersToTwip(5),
            },
          })
        );
        break;
      }

      case 'quote': {
        const paragraphEmphasis = (p.emphasisPhrases && p.emphasisPhrases.length > 0)
          ? p.emphasisPhrases
          : config.emphasisWords;
        const runs = parseInlineRuns(rawText, {
          font,
          sizeHalfPt: (config.bodyFontSizePt - 0.5) * 2,
          color: '475569',
          emphasisWords: paragraphEmphasis,
          autoBoldMarkdown: config.autoBoldMarkdown,
        });
        docxParagraphs.push(
          new Paragraph({
            children: runs,
            alignment: bodyAlignment,
            spacing: { before: 80, after: 80, line: lineSpacingDxa },
            indent: { left: convertMillimetersToTwip(5), right: convertMillimetersToTwip(5) },
          })
        );
        break;
      }

      case 'body':
      default: {
        const paragraphEmphasis = (p.emphasisPhrases && p.emphasisPhrases.length > 0)
          ? p.emphasisPhrases
          : config.emphasisWords;
        const runs = parseInlineRuns(rawText, {
          font,
          sizeHalfPt: config.bodyFontSizePt * 2,
          color: '1E293B',
          emphasisWords: paragraphEmphasis,
          autoBoldMarkdown: config.autoBoldMarkdown,
        });
        docxParagraphs.push(
          new Paragraph({
            children: runs,
            alignment: bodyAlignment,
            spacing: { before: 0, after: 240, line: lineSpacingDxa },
          })
        );
        break;
      }
    }
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
            },
          },
        },
        children: docxParagraphs,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
