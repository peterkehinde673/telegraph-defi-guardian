import React from 'react';
import {
  ShieldCheck,
  Cpu,
  Database,
  Calculator,
  FileCheck,
  Layers,
  ArrowRight,
  Radio,
  Lock,
} from 'lucide-react';

export const HowItWorksView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="border-b border-slate-800/80 pb-4">
          <h3 className="text-lg font-bold text-white font-mono flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Telegraph DeFi Guardian Architecture & Verification Pipeline
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            End-to-end flow from user query to real Telegraph miners, cryptographic normalization, and deterministic scoring
          </p>
        </div>

        {/* Pipeline Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs">
          {/* Step 1 */}
          <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                1
              </span>
              <span className="text-[10px] text-slate-500">CLIENT</span>
            </div>
            <h4 className="font-bold text-slate-200 text-sm">Target Dispatch</h4>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              User submits a token symbol, protocol name, or EVM wallet address to the backend. No fake data or browser shortcuts.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                2
              </span>
              <span className="text-[10px] text-slate-500">TELEGRAPH SUBNET</span>
            </div>
            <h4 className="font-bold text-slate-200 text-sm">Miner Queries</h4>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Backend queries real Telegraph Miners for <code className="text-emerald-400">CRYPTO_PRICE</code>, <code className="text-emerald-400">TVL_LOOKUP</code>, <code className="text-emerald-400">GAS_PRICE</code>, and <code className="text-emerald-400">FRAUD_DETECTION</code>.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                3
              </span>
              <span className="text-[10px] text-slate-500">VERIFICATION</span>
            </div>
            <h4 className="font-bold text-slate-200 text-sm">Pure Normalization</h4>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Raw miner responses are parsed into typed <code className="text-slate-300">NormalizedSignal&lt;T&gt;</code> with cryptographic proofs and source attribution.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                4
              </span>
              <span className="text-[10px] text-slate-500">RISK ENGINE</span>
            </div>
            <h4 className="font-bold text-slate-200 text-sm">Deterministic Risk</h4>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Mathematical formulas calculate liquidity depth, price volatility, settlement overhead, and penalize missing signals conservatively.
            </p>
          </div>
        </div>

        {/* Deterministic Scoring Methodology */}
        <div className="p-5 bg-slate-950/40 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
          <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
            <Calculator className="w-4 h-4 text-emerald-400" />
            Deterministic Scoring Formula
          </h4>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            The overall DeFi Risk Score (0-100) is calculated as the weighted sum of five independent risk vectors plus a calibrated missing-signal uncertainty penalty:
          </p>
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-emerald-300 font-mono text-[11px]">
            Score = (LiquidityDepth × 0.30) + (PriceVolatility × 0.25) + (CounterpartyRisk × 0.20) + (NetworkExecution × 0.15) + (AssetDistribution × 0.10) + MissingSignalPenalty
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px]">
            <div className="p-2 bg-slate-900 rounded border border-slate-800">
              <strong className="text-emerald-400">LOW (0 - 28)</strong>: Stable liquidity & minimal slippage.
            </div>
            <div className="p-2 bg-slate-900 rounded border border-slate-800">
              <strong className="text-amber-400">MODERATE (28 - 55)</strong>: Normal trading environment.
            </div>
            <div className="p-2 bg-slate-900 rounded border border-slate-800">
              <strong className="text-orange-400">HIGH (55 - 78)</strong>: Thin reserves or elevated volatility.
            </div>
            <div className="p-2 bg-slate-900 rounded border border-slate-800">
              <strong className="text-red-400">CRITICAL (78 - 100)</strong>: Direct sanctions or insolvency risk.
            </div>
          </div>
        </div>

        {/* Telegraph Protocol Rules Compliance */}
        <div className="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-xl space-y-2 font-mono text-xs">
          <h4 className="font-bold text-emerald-300 text-sm flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            Telegraph Protocol Hackathon Track 3 Compliance
          </h4>
          <ul className="space-y-1.5 text-slate-300 text-[11px] list-disc list-inside">
            <li>Zero simulated miner responses or mocked payloads.</li>
            <li>All intelligence queries flow through real registered Telegraph Miners.</li>
            <li>Cryptographic event IDs and proof hashes preserved throughout the report.</li>
            <li>Missing data is explicitly disclosed rather than silently substituted.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
