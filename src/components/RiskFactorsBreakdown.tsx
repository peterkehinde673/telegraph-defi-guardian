import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { ApplicationInterpretation } from '../types/index.ts';

interface RiskFactorsBreakdownProps {
  interpretation: ApplicationInterpretation;
}

export const RiskFactorsBreakdown: React.FC<RiskFactorsBreakdownProps> = ({
  interpretation,
}) => {
  const {
    positiveSignals = [],
    negativeSignals = [],
    warnings = [],
    missingDataWarnings = [],
  } = interpretation || {};

  const safePositive = positiveSignals || [];
  const safeNegative = negativeSignals || [];
  const safeWarnings = warnings || [];
  const safeMissing = missingDataWarnings || [];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-emerald-400" />
            Risk Factor Evaluation & Disclosures
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Deterministic classification of structural strengths, risks, and missing signals
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {safePositive.length} Strengths
          </span>
          <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
            {safeNegative.length} Risks
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Positive Signals */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            Verified Positive Factors ({safePositive.length})
          </h4>
          {safePositive.length > 0 ? (
            <ul className="space-y-2">
              {safePositive.map((sig, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/30 text-xs text-emerald-200"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{sig}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 p-3 bg-slate-950/40 rounded-xl border border-slate-800/40 font-mono">
              No strong positive factors verified for this subject.
            </p>
          )}
        </div>

        {/* Negative Signals */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 font-mono flex items-center gap-1.5">
            <XCircle className="w-4 h-4" />
            Identified Risk Vectors ({safeNegative.length})
          </h4>
          {safeNegative.length > 0 ? (
            <ul className="space-y-2">
              {safeNegative.map((sig, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-950/20 border border-rose-800/30 text-xs text-rose-200"
                >
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{sig}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-slate-950/40 rounded-xl border border-slate-800/40 text-xs text-slate-400 font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Zero critical risk anomalies detected.</span>
            </div>
          )}
        </div>
      </div>

      {/* Warnings & Missing Data Disclosures */}
      <div className="border-t border-slate-800/80 pt-4 space-y-3">
        {safeWarnings.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              Active System Warnings
            </h4>
            <div className="space-y-1.5">
              {safeWarnings.map((warn, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-xs text-amber-300 font-mono"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>{warn}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {safeMissing.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-slate-500" />
              Missing Data & Transparency Disclosures ({safeMissing.length})
            </h4>
            <div className="space-y-1.5">
              {safeMissing.map((msg, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-400 font-mono"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0 mt-1.5" />
                  <span>{msg}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
