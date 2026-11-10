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
}

export interface DocxExportConfig {
  fontFamily: string; // e.g. '맑은 고딕'
  bodyFontSizePt: number; // 10
  lineHeightRatio: number; // 1.35
  alignment: 'both' | 'left' | 'center';
  scriptureColor: string; // 'E65100'
  scriptureFontSizePt: number; // 9
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

  // Regex escape keywords
  const regexPattern = new RegExp(
    `(${validKeywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'g'
  );

  const tokens = text.split(regexPattern);
  return tokens.flatMap((token) => {
    if (!token) return [];
    const isKeyword = validKeywords.includes(token);
    return [
      new TextRun({
        text: token,
        font,
        size: sizeHalfPt,
        bold: baseBold || isKeyword,
        color: isKeyword && !color ? 'C2410C' : color, // Slightly vibrant orange-dark if emphasized
      }),
    ];
  });
}

export async function generateDocxBlob(
  paragraphs: FormattedParagraph[],
  config: DocxExportConfig
): Promise<Blob> {
  const docxParagraphs: Paragraph[] = [];
  const font = config.fontFamily || '맑은 고딕';

  // Map alignment
  const alignMap = {
    both: AlignmentType.BOTH,
    left: AlignmentType.LEFT,
    center: AlignmentType.CENTER,
  };
  const bodyAlignment = alignMap[config.alignment] || AlignmentType.BOTH;

  // Line height: standard Word single is 240 dxa (lineRule: "auto", line: ratio * 240)
  const lineSpacingDxa = Math.round((config.lineHeightRatio || 1.35) * 240);

  paragraphs.forEach((p) => {
    let rawText = p.originalText.trim();
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
          emphasisWords: config.emphasisWords,
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
          emphasisWords: config.emphasisWords,
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
          sizeHalfPt: (config.bodyFontSizePt + 2) * 2,
          baseBold: true,
          color: '475569',
          emphasisWords: config.emphasisWords,
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
          emphasisWords: config.emphasisWords,
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
          emphasisWords: config.emphasisWords,
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
          emphasisWords: config.emphasisWords,
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
          emphasisWords: config.emphasisWords,
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

      case 'scripture': {
        // Scripture Quotation dedicated rule: 9pt, orange #E65100, bold, continuous paragraph
        const hexColor = config.scriptureColor.replace('#', '') || 'E65100';
        const runs = parseInlineRuns(rawText, {
          font,
          sizeHalfPt: (config.scriptureFontSizePt || 9) * 2,
          baseBold: true,
          color: hexColor,
          emphasisWords: config.emphasisWords,
          autoBoldMarkdown: config.autoBoldMarkdown,
        });
        docxParagraphs.push(
          new Paragraph({
            children: runs,
            alignment: bodyAlignment,
            spacing: { before: 30, after: 40, line: lineSpacingDxa },
            indent: { left: convertMillimetersToTwip(4), right: convertMillimetersToTwip(4) },
          })
        );
        break;
      }

      case 'quote': {
        const runs = parseInlineRuns(rawText, {
          font,
          sizeHalfPt: (config.bodyFontSizePt - 0.5) * 2,
          color: '475569',
          emphasisWords: config.emphasisWords,
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
        const runs = parseInlineRuns(rawText, {
          font,
          sizeHalfPt: config.bodyFontSizePt * 2,
          color: '1E293B',
          emphasisWords: config.emphasisWords,
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
