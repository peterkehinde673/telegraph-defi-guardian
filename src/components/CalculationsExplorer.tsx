import React from 'react';
import {
  Calculator,
  Percent,
  Layers,
  Scale,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { CategoryScore, DerivedCalculations, RiskCategoryName } from '../types/index.ts';

interface CalculationsExplorerProps {
  categories: Record<RiskCategoryName, CategoryScore>;
  calculations: DerivedCalculations;
}

export const CalculationsExplorer: React.FC<CalculationsExplorerProps> = ({
  categories = {} as Record<RiskCategoryName, CategoryScore>,
  calculations,
}) => {
  const categoryList = Object.values(categories || {}) as CategoryScore[];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            Deterministic Model Derivations & Weight Breakdown
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Open mathematical formulas computing the composite risk score without black-box heuristics
          </p>
        </div>
        <span className="text-xs text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
          Final: {calculations.normalizedFinalScore.toFixed(1)} / 100
        </span>
      </div>

      {/* Category Weighted Scores Progress Bars */}
      <div className="space-y-3.5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
          Weighted Risk Category Components
        </h4>
        <div className="space-y-3">
          {categoryList.map((cat) => {
            const widthPct = Math.min(100, Math.max(5, cat.score));
            const barColor =
              cat.score < 28
                ? 'bg-emerald-500'
                : cat.score < 55
                ? 'bg-amber-500'
                : cat.score < 78
                ? 'bg-orange-500'
                : 'bg-red-500';

            return (
              <div key={cat.name} className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/60 font-mono text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">{cat.displayName}</span>
                    <span className="text-[10px] text-slate-500 font-semibold px-1.5 py-0.2 bg-slate-900 border border-slate-800 rounded">
                      Weight: {(cat.weight * 100).toFixed(0)}%
                    </span>
                    {cat.isMissing && (
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                        Signal Missing
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Score:</span>
                    <span className="font-bold text-white">{cat.score.toFixed(1)}</span>
                    <span className="text-slate-500 text-[10px]">
                      (Contributes: {cat.weightedScore.toFixed(1)} pts)
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`${barColor} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Derived Mathematical Metrics Grid */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
          Intermediate Derived Indicators
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
            <span className="text-slate-500 text-[10px] block">Price Feed Spread</span>
            <span className="text-base font-bold text-slate-200 mt-0.5 block">
              {calculations.priceSpreadPct != null ? `${calculations.priceSpreadPct.toFixed(2)}%` : 'N/A'}
            </span>
            <span className="text-[10px] text-slate-500 mt-1 block">Cross-oracle delta</span>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
            <span className="text-slate-500 text-[10px] block">Mcap / TVL Multiple</span>
            <span className="text-base font-bold text-slate-200 mt-0.5 block">
              {calculations.marketCapToTvlRatio != null ? `${calculations.marketCapToTvlRatio.toFixed(2)}x` : 'N/A'}
            </span>
            <span className="text-[10px] text-slate-500 mt-1 block">Collateral ratio</span>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
            <span className="text-slate-500 text-[10px] block">Gas Congestion</span>
            <span className="text-base font-bold text-slate-200 mt-0.5 block">
              {calculations.gasCongestionMultiple != null ? `${calculations.gasCongestionMultiple.toFixed(2)}x` : '1.0x'}
            </span>
            <span className="text-[10px] text-slate-500 mt-1 block">Relative to 20 Gwei baseline</span>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
            <span className="text-slate-500 text-[10px] block">Missing Data Penalty</span>
            <span className="text-base font-bold text-amber-400 mt-0.5 block">
              +{calculations.missingSignalPenaltyScore.toFixed(1)} pts
            </span>
            <span className="text-[10px] text-slate-500 mt-1 block">Conservative uncertainty</span>
          </div>
        </div>
      </div>
    </div>
  );
};
