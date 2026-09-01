import React, { useState } from 'react';
import {
  Code,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  FileJson,
} from 'lucide-react';
import { DeFiRiskAssessmentReport } from '../types/index.ts';

interface RawIntelligenceViewerProps {
  report: DeFiRiskAssessmentReport;
}

export const RawIntelligenceViewer: React.FC<RawIntelligenceViewerProps> = ({
  report,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'raw' | 'calculations' | 'full'>('raw');
  const [copied, setCopied] = useState(false);

  const getPayload = () => {
    switch (activeTab) {
      case 'raw':
        return report.rawTelegraphIntelligence;
      case 'calculations':
        return report.derivedCalculations;
      case 'full':
      default:
        return report;
    }
  };

  const handleCopy = () => {
    const text = JSON.stringify(getPayload(), null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Code className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-sm font-bold text-white font-mono">
              Raw & Normalized Intelligence Payload (Auditor & Developer Terminal)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspect structured normalized signals and cryptographically attested proofs
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
          <span>{isOpen ? 'Collapse Payload' : 'Expand Payload'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-slate-800 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Tab Selector */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveTab('raw')}
                className={`px-3 py-1 text-xs rounded-md font-mono transition-colors ${
                  activeTab === 'raw'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                1. Raw Telegraph Signals
              </button>
              <button
                onClick={() => setActiveTab('calculations')}
                className={`px-3 py-1 text-xs rounded-md font-mono transition-colors ${
                  activeTab === 'calculations'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                2. Deterministic Derivations
              </button>
              <button
                onClick={() => setActiveTab('full')}
                className={`px-3 py-1 text-xs rounded-md font-mono transition-colors ${
                  activeTab === 'full'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                3. Complete Report JSON
              </button>
            </div>

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono transition-colors border border-slate-700"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy JSON Payload</span>
                </>
              )}
            </button>
          </div>

          {/* Code Viewer */}
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800/80 overflow-x-auto max-h-96">
            <pre className="text-xs font-mono text-emerald-300 leading-relaxed">
              {JSON.stringify(getPayload(), null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
