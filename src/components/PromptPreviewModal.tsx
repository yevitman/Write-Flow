import React, { useState } from 'react';
import { Copy, Check, ExternalLink, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  prompt: string;
  onClose: () => void;
  onRunGpt: () => void;
}

export const PromptPreviewModal: React.FC<Props> = ({
  isOpen,
  prompt,
  onClose,
  onRunGpt,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl max-h-[90vh] rounded-2xl bg-white shadow-2xl border border-orange-200 text-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm tracking-tight">생성된 프롬프트 미리보기</span>
            <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-medium">
              {prompt.length.toLocaleString()}자
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition cursor-pointer"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 p-3 overflow-y-auto bg-amber-50/30">
          <textarea
            readOnly
            value={prompt}
            className="w-full h-full min-h-[300px] p-3 text-xs font-mono bg-white border border-amber-200 rounded-xl text-slate-800 resize-none focus:outline-none focus:ring-1 focus:ring-orange-400 leading-relaxed select-all"
          />
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between p-3 bg-white border-t border-orange-100 flex-shrink-0 gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-800 text-xs font-bold transition cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? '복사 완료!' : '클립보드 복사'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRunGpt}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-extrabold shadow-md transition cursor-pointer active:scale-95"
            >
              <ExternalLink className="w-4 h-4" />
              <span>GPT로 즉시 실행</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
