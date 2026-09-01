import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  Fingerprint,
  Info,
} from 'lucide-react';
import { DeFiRiskAssessmentReport, RiskClassification } from '../types/index.ts';

interface RiskScoreGaugeProps {
  report: DeFiRiskAssessmentReport;
}

export const RiskScoreGauge: React.FC<RiskScoreGaugeProps> = ({ report }) => {
  const { subject, applicationInterpretation, timestamp, engineVersion } = report;
  const {
    overallRiskScore,
    riskClassification,
    confidenceScore,
    executiveSummary,
  } = applicationInterpretation;

  // Colors & Configuration by Classification
  const getTheme = (classification: RiskClassification) => {
    switch (classification) {
      case 'LOW':
        return {
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
          ring: 'stroke-emerald-400',
          icon: ShieldCheck,
          label: 'LOW RISK',
          desc: 'Optimal liquidity cushion and strong price stability.',
        };
      case 'MODERATE':
        return {
          color: 'text-amber-400',
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/30',
          ring: 'stroke-amber-400',
          icon: AlertTriangle,
          label: 'MODERATE RISK',
          desc: 'Standard market conditions; standard slippage precautions advised.',
        };
      case 'HIGH':
        return {
          color: 'text-orange-400',
          bg: 'bg-orange-500/10',
          border: 'border-orange-500/30',
          ring: 'stroke-orange-400',
          icon: ShieldAlert,
          label: 'HIGH RISK',
          desc: 'Elevated volatility, thin collateral depth, or counterparty anomalies detected.',
        };
      case 'CRITICAL':
      default:
        return {
          color: 'text-red-400',
          bg: 'bg-red-500/10',
          border: 'border-red-500/30',
          ring: 'stroke-red-400',
          icon: Flame,
          label: 'CRITICAL RISK',
          desc: 'Severe vulnerability detected (insolvency exposure, sanctions, or extreme volatility).',
        };
    }
  };

  const theme = getTheme(riskClassification);
  const IconComponent = theme.icon;

  // Gauge calculation (0 to 100)
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallRiskScore / 100) * circumference;
  const formattedDate = new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: Circular Risk Score Meter */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center p-4 bg-slate-950/60 rounded-xl border border-slate-800/80">
          <div className="relative w-44 h-44 flex items-center justify-center">
            {/* SVG Circular Progress */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
              {/* Background Ring */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="stroke-slate-800"
                strokeWidth="12"
                fill="transparent"
              />
              {/* Active Progress Ring */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                className={`${theme.ring} transition-all duration-1000 ease-out`}
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            {/* Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-4xl font-bold font-mono tracking-tight text-white">
                {overallRiskScore.toFixed(1)}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Out of 100
              </span>
            </div>
          </div>

          {/* Classification Badge */}
          <div className={`mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full border ${theme.bg} ${theme.border} ${theme.color} text-xs font-bold tracking-wide font-mono`}>
            <IconComponent className="w-3.5 h-3.5" />
            <span>{theme.label}</span>
          </div>
        </div>

        {/* Right: Subject Details, Executive Summary & Confidence */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-white tracking-tight font-mono">
                  {subject.name}
                </h2>
                {subject.symbol && (
                  <span className="px-2 py-0.5 text-xs bg-slate-800 text-slate-300 rounded font-mono font-medium">
                    {subject.symbol}
                  </span>
                )}
                <span className="px-2 py-0.5 text-[11px] bg-slate-800 text-emerald-400 rounded-full font-mono capitalize">
                  {subject.type}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 font-mono">
                <span>Chain: <strong className="text-slate-200 uppercase">{subject.chain || 'ETH'}</strong></span>
                {subject.contractAddress && (
                  <span className="truncate max-w-[200px]" title={subject.contractAddress}>
                    Contract: <code className="text-emerald-400">{subject.contractAddress}</code>
                  </span>
                )}
              </p>
            </div>

            {/* Analysis Metadata */}
            <div className="flex flex-col items-end text-xs text-slate-400 font-mono">
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>{formattedDate}</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5">
                Engine {engineVersion}
              </span>
            </div>
          </div>

          {/* Executive Summary */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-emerald-400" />
              Deterministic Executive Synthesis
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/60">
              {executiveSummary}
            </p>
          </div>

          {/* Confidence Meter Bar */}
          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
            <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
              <span className="text-slate-400 flex items-center gap-1">
                <Fingerprint className="w-3.5 h-3.5 text-slate-500" />
                Signal Confidence Rating:
              </span>
              <span className="font-bold text-emerald-400">
                {(confidenceScore * 100).toFixed(0)}% Mathematical Confidence
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.round(confidenceScore * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
