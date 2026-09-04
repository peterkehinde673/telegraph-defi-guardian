import React from 'react';
import {
  FileCheck,
  Cpu,
  Hash,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { RiskFactorEvidence } from '../types/index.ts';

interface EvidenceAttributionTableProps {
  evidence: RiskFactorEvidence[];
  disclaimer: string;
}

export const EvidenceAttributionTable: React.FC<EvidenceAttributionTableProps> = ({
  evidence = [],
  disclaimer = '',
}) => {
  const safeEvidence = evidence || [];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
        <div>
          <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-emerald-400" />
            Evidence & Telegraph Provenance
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Evidence used by the risk model, with Engine provenance shown only when supplied by Telegraph
          </p>
        </div>
        <span className="px-2.5 py-1 text-xs bg-slate-800 text-slate-300 rounded-lg font-mono">
          {safeEvidence.length} Evidence Factors
        </span>
      </div>

      {safeEvidence.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3 pr-4 font-semibold">Factor / Category</th>
                <th className="pb-3 px-4 font-semibold">Telegraph Intent</th>
                <th className="pb-3 px-4 font-semibold">Miner Provenance</th>
                <th className="pb-3 px-4 font-semibold">Confidence & Origin</th>
                <th className="pb-3 px-4 font-semibold">Canonical Reference</th>
                <th className="pb-3 px-4 font-semibold text-right">Score</th>
                <th className="pb-3 pl-4 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {safeEvidence.map((item, idx) => {
                const isAttributionUnavailable =
                  !item.minerName ||
                  item.minerName.toLowerCase().includes('unavailable') ||
                  !item.minerId ||
                  item.minerId.toLowerCase().includes('unavailable');

                const hasCanonical = Boolean(
                  item.canonicalProof &&
                  !item.canonicalProof.toLowerCase().includes('no canonical') &&
                  !item.canonicalProof.toLowerCase().includes('unavailable'),
                );

                return (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 pr-4">
                      <div className="font-bold text-slate-200">{item.factorId}</div>
                      <div className="text-[11px] text-slate-400 max-w-[220px] truncate mt-0.5" title={item.finding}>
                        {item.finding}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] whitespace-nowrap">
                        {item.telegraphIntent}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300">
                      {isAttributionUnavailable ? (
                        <span className="text-[11px] text-slate-400 italic">
                          Not exposed by Engine response
                        </span>
                      ) : (
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Cpu className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate max-w-[140px] text-slate-200" title={item.minerName}>
                              {item.minerName}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">ID: #{item.minerId}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1">
                        {item.confidence !== undefined && (
                          <span className="text-xs font-mono font-bold text-white">{(item.confidence * 100).toFixed(0)}%</span>
                        )}
                        <span className="text-[9px] px-1.5 py-0.5 rounded border whitespace-nowrap font-mono bg-slate-800/70 text-slate-400 border-slate-700">
                          {item.confidenceSource === 'telegraph_engine' ? 'Source: Telegraph Engine' : 'Source: Application-calculated'}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {hasCanonical ? (
                        <div className="flex items-center gap-1">
                          <Hash className="w-3 h-3 text-slate-500" />
                          <code className="text-[11px] text-slate-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 truncate max-w-[160px]" title={item.canonicalProof}>
                            {item.canonicalProof}
                          </code>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">Not supplied by Engine</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span className="font-bold text-white">{item.contributionScore}</span>
                      <span className="text-slate-500 text-[10px]"> / 100</span>
                      <div className="text-[10px] text-slate-500">wt: {(item.weight * 100).toFixed(0)}%</div>
                    </td>

                    <td className="py-3.5 pl-4 text-center">
                      {item.polarity === 'positive' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px]"><CheckCircle className="w-3 h-3" />Healthy</span>}
                      {item.polarity === 'negative' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[10px]"><XCircle className="w-3 h-3" />Risk Flag</span>}
                      {item.polarity === 'neutral' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px]"><AlertTriangle className="w-3 h-3" />Neutral</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-slate-500 p-4 bg-slate-950/40 rounded-xl border border-slate-800/40 font-mono">
          No evidence factors recorded.
        </p>
      )}

      {disclaimer && (
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 text-[11px] text-slate-400 leading-relaxed font-mono">
          <strong className="text-slate-300">Provenance Notice: </strong>
          {disclaimer}
        </div>
      )}
    </div>
  );
};
