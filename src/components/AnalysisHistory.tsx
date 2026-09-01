import React from 'react';
import {
  History,
  Trash2,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Flame,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { DeFiRiskAssessmentReport, StoredAnalysisRecord } from '../types/index.ts';

interface AnalysisHistoryProps {
  history: StoredAnalysisRecord[];
  onSelectReport: (report: DeFiRiskAssessmentReport) => void;
  onClearHistory: () => void;
}

export const AnalysisHistory: React.FC<AnalysisHistoryProps> = ({
  history = [],
  onSelectReport,
  onClearHistory,
}) => {
  const safeHistory = history || [];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-400" />
            Session Analysis History
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real risk reports generated during your current session (stored locally)
          </p>
        </div>

        {safeHistory.length > 0 && (
          <button
            onClick={onClearHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-red-950/40 text-slate-400 hover:text-red-300 border border-slate-800 hover:border-red-800/50 rounded-lg text-xs font-mono transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {safeHistory.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {safeHistory.map((record) => {
            const dateStr = new Date(record.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={record.id}
                onClick={() => onSelectReport(record.report)}
                className="p-4 bg-slate-950/60 hover:bg-slate-800/50 border border-slate-800/80 hover:border-emerald-500/40 rounded-xl cursor-pointer transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white font-mono text-sm group-hover:text-emerald-400 transition-colors">
                      {record.targetName}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded font-mono ${
                        record.classification === 'LOW'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : record.classification === 'MODERATE'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : record.classification === 'HIGH'
                          ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {record.classification}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span>Score: <strong className="text-slate-200">{record.riskScore.toFixed(1)}/100</strong></span>
                    <span className="text-slate-500">{(record.confidence * 100).toFixed(0)}% conf</span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{dateStr}</span>
                  </div>
                  <span className="text-emerald-400 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                    Load Report <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800/40 space-y-2">
          <History className="w-8 h-8 text-slate-600 mx-auto" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
            No Analyses Executed Yet
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Analyze any token, protocol, or wallet address above to build a verified risk audit session.
          </p>
        </div>
      )}
    </div>
  );
};
