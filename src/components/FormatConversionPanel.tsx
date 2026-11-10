import React, { useState, useRef, useEffect } from 'react';
import {
  FormattedParagraph,
  ParagraphType,
  DocxExportConfig,
  generateDocxBlob,
} from '../utils/docxExporter';
import { parseManuscriptToParagraphs } from '../utils/paragraphParser';
import {
  Clipboard,
  FileDown,
  Upload,
  Trash2,
  Download,
  Eye,
  SlidersHorizontal,
  Check,
  RotateCcw,
  Sparkles,
  Bold,
  FileText,
  HelpCircle,
  Edit3,
} from 'lucide-react';

interface Props {
  initialText?: string;
  onShowToast: (msg: string) => void;
}

const STORAGE_KEY_FORMAT_CONFIG = 'writing_helper_docx_config_v1';

const DEFAULT_CONFIG: DocxExportConfig = {
  fontFamily: '맑은 고딕',
  bodyFontSizePt: 10,
  lineHeightRatio: 1.35,
  alignment: 'both',
  scriptureColor: 'E65100',
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
  emphasisWords: ['구속사', '예정론', '전적 타락', '무조건적 선택', '제한 속죄', '불가항력적 은혜', '성도의 견인'],
  autoBoldMarkdown: true,
};

const PARAGRAPH_TYPE_LABELS: Record<ParagraphType, { label: string; colorClass: string }> = {
  doc_title: { label: '문서 제목 (18pt)', colorClass: 'bg-orange-600 text-white' },
  doc_subtitle: { label: '부제목', colorClass: 'bg-amber-700 text-white' },
  heading_1: { label: '제목 1 (16pt)', colorClass: 'bg-blue-700 text-white' },
  heading_2: { label: '제목 2 (14pt)', colorClass: 'bg-teal-700 text-white' },
  heading_3: { label: '제목 3 (13pt)', colorClass: 'bg-sky-700 text-white' },
  heading_4: { label: '하위 제목 4 (12pt)', colorClass: 'bg-indigo-700 text-white' },
  heading_5: { label: '하위 제목 5 (11pt)', colorClass: 'bg-purple-700 text-white' },
  body: { label: '일반 본문 (10pt)', colorClass: 'bg-slate-700 text-white' },
  scripture: { label: '성경 인용 (9pt 주황)', colorClass: 'bg-[#ea580c] text-white' },
  quote: { label: '일반 인용문', colorClass: 'bg-slate-600 text-white' },
  numbered_list: { label: '번호 목록', colorClass: 'bg-emerald-700 text-white' },
  bullet_list: { label: '글머리 목록', colorClass: 'bg-emerald-800 text-white' },
};

export const FormatConversionPanel: React.FC<Props> = ({ initialText = '', onShowToast }) => {
  const [inputText, setInputText] = useState(initialText);
  const [paragraphs, setParagraphs] = useState<FormattedParagraph[]>([]);
  const [config, setConfig] = useState<DocxExportConfig>(DEFAULT_CONFIG);
  const [emphasisInput, setEmphasisInput] = useState(DEFAULT_CONFIG.emphasisWords.join(', '));
  const [activeStep, setActiveStep] = useState<'input' | 'editor' | 'preview'>('input');
  const [isExporting, setIsExporting] = useState(false);
  const [showConfigSettings, setShowConfigSettings] = useState(false);

  // Selected paragraph for type change
  const [editingParagraphId, setEditingParagraphId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved config
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FORMAT_CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved);
        setConfig((prev) => ({ ...prev, ...parsed }));
        if (parsed.emphasisWords) {
          setEmphasisInput(parsed.emphasisWords.join(', '));
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  // Update emphasis words array when string changes
  const handleEmphasisWordsChange = (val: string) => {
    setEmphasisInput(val);
    const words = val
      .split(',')
      .map((w) => w.trim())
      .filter((w) => w.length > 0);
    setConfig((prev) => ({ ...prev, emphasisWords: words }));
  };

  // Save Config
  const handleSaveConfig = () => {
    try {
      localStorage.setItem(STORAGE_KEY_FORMAT_CONFIG, JSON.stringify(config));
      onShowToast('✅ 서식 설정 규정이 저장되었습니다.');
    } catch {
      onShowToast('서식 설정 저장 중 오류가 발생했습니다.');
    }
  };

  // Reset Config
  const handleResetConfig = () => {
    setConfig(DEFAULT_CONFIG);
    setEmphasisInput(DEFAULT_CONFIG.emphasisWords.join(', '));
    try {
      localStorage.removeItem(STORAGE_KEY_FORMAT_CONFIG);
    } catch {
      // Ignore
    }
    onShowToast('🔄 기본 서식 규정으로 복원되었습니다.');
  };

  // Paste from clipboard
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputText(text);
        onShowToast('📋 클립보드 내용을 붙여넣었습니다.');
      } else {
        onShowToast('⚠️ 클립보드가 비어있습니다.');
      }
    } catch {
      onShowToast('⚠️ 클립보드 자동 읽기 권한이 없습니다. 텍스트 창에 직접 붙여넣어주세요.');
    }
  };

  // File upload (.txt, .md)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setInputText(text);
        onShowToast(`📁 "${file.name}" 문서를 불러왔습니다.`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Step 1 -> Step 2: Analyze manuscript into paragraphs
  const handleAnalyzeManuscript = () => {
    const text = inputText.trim();
    if (!text) {
      onShowToast('⚠️ 서식을 지정할 원고 내용을 먼저 입력하거나 불러와주세요.');
      return;
    }

    const parsed = parseManuscriptToParagraphs(text);
    setParagraphs(parsed);
    setActiveStep('editor');
    onShowToast(`✨ ${parsed.length}개 문단 구조 분석 및 서식 적용 완료!`);
  };

  // Update specific paragraph type
  const handleChangeParagraphType = (id: string, newType: ParagraphType) => {
    setParagraphs((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return {
            ...p,
            type: newType,
            isOutline: false, // reset outline if type changed directly
          };
        }
        return p;
      })
    );
    setEditingParagraphId(null);
    onShowToast('문단 유형이 변경되었습니다.');
  };

  // Toggle outline on paragraph
  const handleToggleOutline = (id: string) => {
    setParagraphs((prev) => {
      let counter = 1;
      return prev.map((p) => {
        if (p.id === id) {
          const willBeOutline = !p.isOutline;
          const cleanedText = willBeOutline
            ? p.originalText.replace(/^([0-9]+|[①-⑳]|[I|V|X]+)[\.\)\-\s\:]*/, '').trim()
            : p.originalText;
          return {
            ...p,
            originalText: cleanedText || p.originalText,
            isOutline: willBeOutline,
            type: 'body', // Outline is treated as body type according to prompt rule!
            outlineNumber: willBeOutline ? counter++ : undefined,
          };
        }
        if (p.isOutline) {
          return { ...p, outlineNumber: counter++ };
        }
        return p;
      });
    });
    setEditingParagraphId(null);
  };

  // Step 3: Export to actual DOCX file
  const handleDownloadDocx = async () => {
    if (paragraphs.length === 0) {
      onShowToast('⚠️ 다운로드할 문단 데이터가 없습니다.');
      return;
    }

    setIsExporting(true);
    try {
      const blob = await generateDocxBlob(paragraphs, config);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Get title from doc_title paragraph or default
      const titleP = paragraphs.find((p) => p.type === 'doc_title');
      const filename = titleP
        ? titleP.originalText.slice(0, 25).replace(/[\\/:*?"<>|]/g, '_')
        : 'Writing_Helper_서식완료문서';
      a.download = `${filename}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onShowToast(`🎉 "${filename}.docx" 파일이 다운로드되었습니다!`);
    } catch {
      onShowToast('DOCX 생성 중 오류가 발생했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  // Helper to render text with bold and emphasis in live preview
  const renderFormattedPreviewText = (text: string) => {
    const validKeywords = config.emphasisWords.filter((k) => k.length > 0);

    // Markdown bold handling
    if (config.autoBoldMarkdown && text.includes('**')) {
      const parts = text.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
          return (
            <strong key={idx} className="font-extrabold text-slate-900 bg-amber-100/60 px-0.5 rounded">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return renderKeywordsOnly(part, validKeywords, idx);
      });
    }

    return renderKeywordsOnly(text, validKeywords, 0);
  };

  const renderKeywordsOnly = (text: string, keywords: string[], baseKey: number) => {
    if (!text || keywords.length === 0) return text;
    const regexPattern = new RegExp(`(${keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
    const tokens = text.split(regexPattern);

    return tokens.map((token, i) => {
      if (keywords.includes(token)) {
        return (
          <strong key={`${baseKey}-${i}`} className="font-extrabold text-[#c2410c] bg-orange-100/70 px-0.5 rounded">
            {token}
          </strong>
        );
      }
      return token;
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".txt,.md,.text"
        className="hidden"
      />

      {/* 상단 3단계 스텝 내비게이션 (사진 2 결과물 형식 버튼 규격 기준) */}
      <div className="grid grid-cols-3 gap-1 mb-1">
        <button
          type="button"
          onClick={() => setActiveStep('input')}
          className={`w-full text-center py-2 px-1 cursor-pointer rounded-[8px] text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap overflow-hidden text-ellipsis ${
            activeStep === 'input'
              ? 'bg-gradient-to-br from-[#f97316] via-[#ea580c] to-[#c2410c] text-white border border-[#9a3412] shadow-[0_3px_8px_rgba(234,88,12,0.4)]'
              : 'bg-gradient-to-br from-white to-[#ffedd5] text-[#c2410c] border border-[#fdba74] shadow-[0_2px_5px_rgba(249,115,22,0.1)] hover:border-orange-400'
          }`}
        >
          1. 원고 입력
        </button>
        <button
          type="button"
          onClick={() => {
            if (paragraphs.length === 0 && inputText.trim()) {
              handleAnalyzeManuscript();
            } else {
              setActiveStep('editor');
            }
          }}
          className={`w-full text-center py-2 px-1 cursor-pointer rounded-[8px] text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap overflow-hidden text-ellipsis ${
            activeStep === 'editor'
              ? 'bg-gradient-to-br from-[#f97316] via-[#ea580c] to-[#c2410c] text-white border border-[#9a3412] shadow-[0_3px_8px_rgba(234,88,12,0.4)]'
              : 'bg-gradient-to-br from-white to-[#ffedd5] text-[#c2410c] border border-[#fdba74] shadow-[0_2px_5px_rgba(249,115,22,0.1)] hover:border-orange-400'
          }`}
        >
          2. 문단 구조 편집 {paragraphs.length > 0 ? `(${paragraphs.length})` : ''}
        </button>
        <button
          type="button"
          onClick={() => setActiveStep('preview')}
          className={`w-full text-center py-2 px-1 cursor-pointer rounded-[8px] text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap overflow-hidden text-ellipsis ${
            activeStep === 'preview'
              ? 'bg-gradient-to-br from-[#f97316] via-[#ea580c] to-[#c2410c] text-white border border-[#9a3412] shadow-[0_3px_8px_rgba(234,88,12,0.4)]'
              : 'bg-gradient-to-br from-white to-[#ffedd5] text-[#c2410c] border border-[#fdba74] shadow-[0_2px_5px_rgba(249,115,22,0.1)] hover:border-orange-400'
          }`}
        >
          3. 서식 미리보기 & DOCX
        </button>
      </div>

      {/* ========================================================
          단계 1: 원고 입력 화면
         ======================================================== */}
      {activeStep === 'input' && (
        <div className="flex flex-col gap-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#c2410c] flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              <span>원고 입력 (텍스트/파일)</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {inputText.length.toLocaleString()} 글자
            </span>
          </div>

          {/* 빠른 불러오기 툴바 */}
          <div className="grid grid-cols-4 gap-1">
            <button
              type="button"
              onClick={handlePasteClipboard}
              className="flex items-center justify-center gap-1 py-1.5 px-1 bg-gradient-to-br from-white to-[#ffedd5] hover:border-orange-400 text-[#c2410c] border border-[#fdba74] rounded-[8px] text-[11px] font-bold shadow-xs cursor-pointer active:scale-98 transition"
            >
              <Clipboard className="w-3.5 h-3.5 text-orange-600" />
              <span>클립보드</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-1 py-1.5 px-1 bg-gradient-to-br from-white to-[#ffedd5] hover:border-orange-400 text-[#c2410c] border border-[#fdba74] rounded-[8px] text-[11px] font-bold shadow-xs cursor-pointer active:scale-98 transition"
            >
              <Upload className="w-3.5 h-3.5 text-orange-600" />
              <span>파일 열기</span>
            </button>
            <button
              type="button"
              onClick={() => setShowConfigSettings(!showConfigSettings)}
              className="flex items-center justify-center gap-1 py-1.5 px-1 bg-gradient-to-br from-white to-[#ffedd5] hover:border-orange-400 text-slate-700 border border-[#fdba74] rounded-[8px] text-[11px] font-bold shadow-xs cursor-pointer active:scale-98 transition"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
              <span>서식 규정</span>
            </button>
            <button
              type="button"
              onClick={() => setInputText('')}
              className="flex items-center justify-center gap-1 py-1.5 px-1 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300 rounded-[8px] text-[11px] font-bold shadow-xs cursor-pointer active:scale-98 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>비우기</span>
            </button>
          </div>

          {/* 원고 입력 에어리어 */}
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`서식을 지정할 원고나 문서를 여기에 붙여넣거나 [클립보드], [파일 열기] 버튼으로 불러오세요.

※ 팁: 
- 'II. 개요' 아래의 항목들은 자동으로 아라비아 숫자(1. 2. 3.)와 줄바꿈이 적용되는 개요 본문으로 분류됩니다.
- 성경 구절(예: 로마서 8:28, 요 3:16)은 주황색 9pt 성경 인용 전용 서식으로 자동 판별됩니다.`}
            className="w-full h-[180px] sm:h-[230px] p-2.5 border border-[#fdba74] rounded-xl text-xs bg-white text-[#1e293b] outline-none shadow-inner resize-none leading-relaxed focus:ring-1 focus:ring-orange-400 font-mono"
          />

          {/* 원고 분석 & 서식 적용 메인 버튼 */}
          <button
            type="button"
            onClick={handleAnalyzeManuscript}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs shadow-md transition active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-amber-200" />
            <span>원고 문단 구조 분석 & 서식 적용하기 (앱 내 즉시 실행)</span>
          </button>
        </div>
      )}

      {/* ========================================================
          단계 2: 문단 구조 관리 & 인터랙티브 수정 화면
         ======================================================== */}
      {activeStep === 'editor' && (
        <div className="flex flex-col gap-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-extrabold text-[#c2410c] flex items-center gap-1">
                <Edit3 className="w-3.5 h-3.5" />
                <span>문단 구조 편집 ({paragraphs.length}개)</span>
              </span>
              <p className="text-[10px] text-slate-500">
                배지를 눌러 제목·본문·개요·성경인용을 변경할 수 있습니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveStep('preview')}
              className="bg-gradient-to-br from-white to-[#ffedd5] text-[#c2410c] border border-[#fdba74] shadow-[0_2px_5px_rgba(249,115,22,0.1)] hover:border-orange-400 rounded-[8px] text-[11px] font-bold px-2.5 py-1 cursor-pointer transition flex items-center gap-1 whitespace-nowrap"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>미리보기</span>
            </button>
          </div>

          {/* 문단 리스트 */}
          <div className="max-h-[380px] overflow-y-auto space-y-1.5 pr-0.5">
            {paragraphs.map((p, index) => {
              const typeInfo = PARAGRAPH_TYPE_LABELS[p.type] || PARAGRAPH_TYPE_LABELS.body;
              return (
                <div
                  key={p.id}
                  className={`p-2 rounded-xl border text-xs transition bg-white/95 shadow-xs ${
                    p.isOutline
                      ? 'border-amber-400 bg-amber-50/40'
                      : p.type === 'scripture'
                      ? 'border-orange-300 bg-orange-50/30'
                      : 'border-orange-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 gap-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-mono text-slate-400">#{index + 1}</span>
                      {/* 문단 유형 변경 버튼 */}
                      <button
                        type="button"
                        onClick={() =>
                          setEditingParagraphId(editingParagraphId === p.id ? null : p.id)
                        }
                        className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold cursor-pointer hover:opacity-90 transition ${typeInfo.colorClass}`}
                      >
                        {p.isOutline ? `개요 항목 (${p.outlineNumber}.)` : typeInfo.label}
                      </button>

                      {/* 개요 토글 버튼 */}
                      <button
                        type="button"
                        onClick={() => handleToggleOutline(p.id)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                          p.isOutline
                            ? 'bg-amber-500 text-white border-amber-600'
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {p.isOutline ? '✓ 개요 해제' : '+ 개요로 지정'}
                      </button>
                    </div>
                  </div>

                  {/* 팝업 문단 유형 선택기 */}
                  {editingParagraphId === p.id && (
                    <div className="p-2 mb-2 rounded-lg bg-orange-50 border border-orange-200 grid grid-cols-3 sm:grid-cols-4 gap-1 text-[10px]">
                      {(Object.keys(PARAGRAPH_TYPE_LABELS) as ParagraphType[]).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => handleChangeParagraphType(p.id, t)}
                          className={`p-1 rounded text-center font-bold cursor-pointer transition ${
                            p.type === t
                              ? 'bg-orange-600 text-white'
                              : 'bg-white text-slate-700 hover:bg-orange-100 border border-orange-200'
                          }`}
                        >
                          {PARAGRAPH_TYPE_LABELS[t].label.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 문단 내용 표시 */}
                  <div className="text-[11.5px] leading-relaxed text-slate-800 break-words pl-1 font-sans">
                    {p.isOutline && (
                      <span className="font-extrabold text-amber-900 mr-1.5">
                        {p.outlineNumber}.
                      </span>
                    )}
                    {renderFormattedPreviewText(
                      p.isOutline
                        ? p.originalText.replace(/^([0-9]+|[①-⑳]|[I|V|X]+)[\.\)\-\s\:]*/, '').trim()
                        : p.originalText
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setActiveStep('preview')}
              className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs shadow-md cursor-pointer flex items-center justify-center gap-1"
            >
              <Eye className="w-4 h-4" />
              <span>서식 최종 미리보기 및 DOCX 생성으로 이동</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          단계 3: 최종 서식 미리보기 & DOCX 다운로드
         ======================================================== */}
      {activeStep === 'preview' && (
        <div className="flex flex-col gap-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#c2410c] flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              <span>서식 적용 미리보기 (Docs/Word)</span>
            </span>
            <button
              type="button"
              onClick={() => setActiveStep('editor')}
              className="bg-gradient-to-br from-white to-[#ffedd5] text-[#c2410c] border border-[#fdba74] shadow-[0_2px_5px_rgba(249,115,22,0.1)] hover:border-orange-400 rounded-[8px] text-[11px] font-bold px-2.5 py-1 cursor-pointer transition flex items-center gap-1 whitespace-nowrap"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>문단 재수정</span>
            </button>
          </div>

          {/* 실제 문서 형태의 미리보기 창 */}
          <div className="max-h-[340px] sm:max-h-[400px] overflow-y-auto bg-white p-4 sm:p-6 rounded-xl border border-orange-200 shadow-inner font-['Malgun_Gothic'] text-slate-800 space-y-2">
            {paragraphs.map((p) => {
              if (p.isOutline) {
                const cleanOutlineText = p.originalText
                  .replace(/^([0-9]+|[①-⑳]|[I|V|X]+)[\.\)\-\s\:]*/, '')
                  .trim();
                return (
                  <div
                    key={p.id}
                    className="pl-3 text-[10pt] leading-[1.35] text-slate-800 flex items-start"
                  >
                    <span className="font-extrabold text-amber-900 mr-2 flex-shrink-0">
                      {p.outlineNumber}.
                    </span>
                    <span className="flex-1">{renderFormattedPreviewText(cleanOutlineText)}</span>
                  </div>
                );
              }

              switch (p.type) {
                case 'doc_title':
                  return (
                    <h1
                      key={p.id}
                      className="text-[18pt] font-black text-[#c2410c] text-justify my-3 leading-snug"
                    >
                      {renderFormattedPreviewText(p.originalText)}
                    </h1>
                  );
                case 'doc_subtitle':
                  return (
                    <h2 key={p.id} className="text-[12pt] font-bold text-slate-600 text-justify mb-3">
                      {renderFormattedPreviewText(p.originalText)}
                    </h2>
                  );
                case 'heading_1':
                  return (
                    <h2
                      key={p.id}
                      className="text-[16pt] font-extrabold text-[#c2410c] text-justify mt-4 mb-2 border-b border-orange-200 pb-1"
                    >
                      {renderFormattedPreviewText(p.originalText)}
                    </h2>
                  );
                case 'heading_2':
                  return (
                    <h3 key={p.id} className="text-[14pt] font-extrabold text-slate-800 mt-3 mb-1.5">
                      {renderFormattedPreviewText(p.originalText)}
                    </h3>
                  );
                case 'heading_3':
                  return (
                    <h4 key={p.id} className="text-[13pt] font-bold text-slate-700 mt-2.5 mb-1">
                      {renderFormattedPreviewText(p.originalText)}
                    </h4>
                  );
                case 'scripture':
                  return (
                    <div
                      key={p.id}
                      className="text-[9pt] font-bold text-[#E65100] px-2.5 py-1.5 my-1.5 bg-orange-50/40 rounded-lg leading-relaxed"
                    >
                      {renderFormattedPreviewText(p.originalText)}
                    </div>
                  );
                case 'quote':
                  return (
                    <blockquote
                      key={p.id}
                      className="text-[9.5pt] italic text-slate-600 pl-3 border-l-2 border-slate-400 my-2 leading-relaxed"
                    >
                      {renderFormattedPreviewText(p.originalText)}
                    </blockquote>
                  );
                case 'body':
                default:
                  return (
                    <p
                      key={p.id}
                      className="text-[10pt] leading-[1.35] text-justify text-slate-800 mb-4"
                    >
                      {renderFormattedPreviewText(p.originalText)}
                    </p>
                  );
              }
            })}
          </div>

          {/* 최종 DOCX 다운로드 버튼 */}
          <button
            type="button"
            disabled={isExporting}
            onClick={handleDownloadDocx}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs shadow-lg transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4 text-emerald-100" />
            <span>
              {isExporting
                ? 'DOCX 문서 생성 중...'
                : '📄 구글 독스 / MS 워드용 DOCX 파일 다운로드 (실제 파일 생성)'}
            </span>
          </button>
        </div>
      )}

      {/* ========================================================
          서식 규정 및 강조단어 설정 서브 패널
         ======================================================== */}
      {showConfigSettings && (
        <div className="p-3 bg-white/95 rounded-xl border border-orange-200 text-xs shadow-md animate-in fade-in duration-150">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-extrabold text-[#c2410c] flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>문서 서식 상세 규정 & 강조 볼드체 설정</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowConfigSettings(false)}
              className="text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕ 닫기
            </button>
          </div>

          {/* 강조 단어/어구 볼드체 규정 (사용자 특별 요청 반영) */}
          <div className="mb-2 p-2 rounded-lg bg-orange-50/70 border border-orange-200">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10.5px] font-extrabold text-orange-950 flex items-center gap-1 whitespace-nowrap">
                <Bold className="w-3.5 h-3.5 text-orange-600" />
                <span>강조 단어·어구 볼드(Bold) 지정</span>
              </label>
              <label className="text-[10px] text-slate-600 flex items-center gap-1 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={config.autoBoldMarkdown}
                  onChange={(e) => setConfig({ ...config, autoBoldMarkdown: e.target.checked })}
                  className="rounded text-orange-600 focus:ring-orange-400"
                />
                <span>**단어** 볼드 자동 적용</span>
              </label>
            </div>
            <textarea
              value={emphasisInput}
              onChange={(e) => handleEmphasisWordsChange(e.target.value)}
              placeholder="본문에서 굵게(Bold) 강조할 단어나 어구를 쉼표(,)로 구분하여 입력하세요."
              className="w-full h-[38px] p-1.5 border border-[#fdba74] rounded-md text-[11px] bg-white text-slate-800 outline-none resize-none"
            />
            <p className="text-[9.5px] text-orange-700 mt-0.5 truncate">
              * 등록 단어 및 마크다운 볼드는 미리보기 및 DOCX에 굵게 적용됩니다.
            </p>
          </div>

          {/* 서식 상세 그리드 */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-0.5">본문 글꼴</label>
              <select
                value={config.fontFamily}
                onChange={(e) => setConfig({ ...config, fontFamily: e.target.value })}
                className="w-full h-7 px-1.5 border border-[#fdba74] rounded-md text-[11px] bg-white"
              >
                <option value="맑은 고딕">맑은 고딕 (표준 권장)</option>
                <option value="KoPub바탕">KoPub바탕 (출판용)</option>
                <option value="본고딕">본고딕 (Noto Sans KR)</option>
                <option value="나눔명조">나눔명조</option>
                <option value="나눔고딕">나눔고딕</option>
                <option value="바탕체">바탕체</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-0.5">본문 글자 크기</label>
              <select
                value={config.bodyFontSizePt}
                onChange={(e) => setConfig({ ...config, bodyFontSizePt: Number(e.target.value) })}
                className="w-full h-7 px-1.5 border border-[#fdba74] rounded-md text-[11px] bg-white"
              >
                <option value={10}>10pt (표준 규격)</option>
                <option value={10.5}>10.5pt</option>
                <option value={11}>11pt (가독성 우수)</option>
                <option value={9.5}>9.5pt</option>
                <option value={12}>12pt</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-0.5">본문 줄 간격</label>
              <select
                value={config.lineHeightRatio}
                onChange={(e) => setConfig({ ...config, lineHeightRatio: Number(e.target.value) })}
                className="w-full h-7 px-1.5 border border-[#fdba74] rounded-md text-[11px] bg-white"
              >
                <option value={1.35}>1.35 (표준 집필)</option>
                <option value={1.5}>1.50 (여유 있는 행간)</option>
                <option value={1.6}>1.60 (웹 문서 표준)</option>
                <option value={1.8}>1.80 (학술 스타일)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-0.5">문단 정렬</label>
              <select
                value={config.alignment}
                onChange={(e) =>
                  setConfig({ ...config, alignment: e.target.value as 'both' | 'left' | 'center' })
                }
                className="w-full h-7 px-1.5 border border-[#fdba74] rounded-md text-[11px] bg-white"
              >
                <option value="both">양쪽 정렬 (표준 권장)</option>
                <option value="left">왼쪽 정렬</option>
                <option value="center">가운데 정렬</option>
              </select>
            </div>
          </div>

          {/* 개요 서식 & 성경 인용 서식 */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-0.5">개요 번호 형식</label>
              <select
                value={config.outlineNumberFormat}
                onChange={(e) =>
                  setConfig({ ...config, outlineNumberFormat: e.target.value as '1.' | '1)' | '1-' })
                }
                className="w-full h-7 px-1.5 border border-[#fdba74] rounded-md text-[11px] bg-white"
              >
                <option value="1.">1. 2. 3. (표준 아라비아 숫자)</option>
                <option value="1)">1) 2) 3)</option>
                <option value="1-">1- 2- 3-</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                성경 인용 색상 (9pt 전용)
              </label>
              <select
                value={config.scriptureColor}
                onChange={(e) => setConfig({ ...config, scriptureColor: e.target.value })}
                className="w-full h-7 px-1.5 border border-[#fdba74] rounded-md text-[11px] bg-white"
              >
                <option value="E65100">주황색 (#E65100, 표준 권장)</option>
                <option value="1E3A8A">감청색 (#1E3A8A)</option>
                <option value="334155">짙은 회색 (#334155)</option>
              </select>
            </div>
          </div>

          <div className="flex gap-1.5 mt-2">
            <button
              type="button"
              onClick={handleSaveConfig}
              className="flex-1 py-2 rounded-[8px] bg-gradient-to-br from-[#f97316] via-[#ea580c] to-[#c2410c] text-white border border-[#9a3412] shadow-[0_3px_8px_rgba(234,88,12,0.4)] font-bold text-[11px] cursor-pointer flex items-center justify-center gap-1 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              <span>서식 규정 저장</span>
            </button>
            <button
              type="button"
              onClick={handleResetConfig}
              className="flex-1 py-2 rounded-[8px] bg-gradient-to-br from-white to-[#ffedd5] text-[#c2410c] border border-[#fdba74] shadow-[0_2px_5px_rgba(249,115,22,0.1)] hover:border-orange-400 font-bold text-[11px] cursor-pointer flex items-center justify-center gap-1 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>기본 규정 복원</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
