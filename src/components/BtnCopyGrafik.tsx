import React, { useState } from 'react';
import { Copy, Check, Download, Loader2, Image as ImageIcon } from 'lucide-react';
import { copyChartToClipboard, downloadChartAsPNG } from '../utils/chartExport';

interface BtnCopyGrafikProps {
  chartRef: React.RefObject<HTMLDivElement | null>;
  fileName?: string;
  chartTitle?: string;
  className?: string;
  variant?: 'emerald' | 'cyan' | 'slate' | 'indigo';
}

export const BtnCopyGrafik: React.FC<BtnCopyGrafikProps> = ({
  chartRef,
  fileName = 'grafik',
  chartTitle = 'Grafik',
  className = '',
  variant = 'emerald',
}) => {
  const [status, setStatus] = useState<'idle' | 'copying' | 'success'>('idle');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const handleCopy = async () => {
    if (status === 'copying') return;
    setStatus('copying');
    setFeedbackMsg(null);

    const res = await copyChartToClipboard(chartRef.current, fileName);

    if (res.success) {
      setStatus('success');
      setFeedbackMsg(res.message);
      setTimeout(() => {
        setStatus('idle');
      }, 2500);
      setTimeout(() => {
        setFeedbackMsg(null);
      }, 5000);
    } else {
      setStatus('idle');
      setFeedbackMsg(res.message);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await downloadChartAsPNG(chartRef.current, fileName);
  };

  const variantStyles = {
    emerald: {
      btn: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200/90 hover:border-emerald-300',
      activeBtn: 'bg-emerald-600 text-white border-emerald-600',
      icon: 'text-emerald-700',
    },
    cyan: {
      btn: 'bg-cyan-900/40 hover:bg-cyan-800/60 text-cyan-200 border-cyan-500/40 hover:border-cyan-400',
      activeBtn: 'bg-cyan-500 text-slate-950 border-cyan-500 font-bold',
      icon: 'text-cyan-300',
    },
    slate: {
      btn: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 hover:border-slate-300',
      activeBtn: 'bg-slate-800 text-white border-slate-800',
      icon: 'text-slate-600',
    },
    indigo: {
      btn: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200/90 hover:border-indigo-300',
      activeBtn: 'bg-indigo-600 text-white border-indigo-600',
      icon: 'text-indigo-600',
    },
  }[variant];

  return (
    <div
      data-html2canvas-ignore="true"
      className={`relative inline-flex items-center rounded-lg border shadow-2xs backdrop-blur-xs select-none ${variantStyles.btn} ${className}`}
    >
      {/* Main Copy Button */}
      <button
        type="button"
        onClick={handleCopy}
        disabled={status === 'copying'}
        className={`px-2.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer rounded-l-lg ${
          status === 'success' ? 'text-emerald-800 font-bold' : ''
        }`}
        title={`Salin gambar ${chartTitle} langsung ke clipboard (bisa di-paste ke WA, Word, Excel, Canva)`}
      >
        {status === 'copying' ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 shrink-0" />
            <span>Menyalin...</span>
          </>
        ) : status === 'success' ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
            <span className="text-emerald-700 font-bold">Tersalin!</span>
          </>
        ) : (
          <>
            <Copy className={`w-3.5 h-3.5 ${variantStyles.icon} shrink-0`} />
            <span>Salin Grafik</span>
          </>
        )}
      </button>

      {/* Divider */}
      <span className="w-px h-4 bg-slate-300/60" />

      {/* Quick Download PNG button */}
      <button
        type="button"
        onClick={handleDownload}
        className="px-1.5 py-1.5 text-xs font-semibold hover:bg-black/5 transition-colors cursor-pointer rounded-r-lg"
        title="Simpan sebagai file gambar PNG langsung"
      >
        <Download className={`w-3.5 h-3.5 ${variantStyles.icon} shrink-0`} />
      </button>

      {/* Floating feedback message toast/popover */}
      {feedbackMsg && (
        <div className="absolute top-full left-0 mt-2 z-50 whitespace-nowrap bg-slate-900 text-white text-[11px] px-3 py-1.5 rounded-lg shadow-xl border border-slate-700 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}
    </div>
  );
};
