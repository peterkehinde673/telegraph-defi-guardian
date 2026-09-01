import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  ShieldCheck,
  Building2,
  Wallet,
  Settings2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { AnalysisRequest, AnalysisType } from '../types/index.ts';

interface SearchPanelProps {
  onAnalyze: (req: AnalysisRequest) => void;
  isLoading: boolean;
  error: string | null;
}

const PRESET_TARGETS = [
  { label: 'Ethereum', value: 'ethereum', type: 'asset', chain: 'eth' },
  { label: 'Uniswap', value: 'uniswap', type: 'protocol', chain: 'eth' },
  { label: 'Aave', value: 'aave', type: 'protocol', chain: 'eth' },
  { label: 'USDC', value: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', type: 'asset', chain: 'eth' },
  { label: 'Vitalik.eth', value: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', type: 'wallet', chain: 'eth' },
  { label: 'Curve DAO', value: 'curve-dao-token', type: 'protocol', chain: 'eth' },
  { label: 'Solana', value: 'solana', type: 'asset', chain: 'solana' },
];

export const SearchPanel: React.FC<SearchPanelProps> = ({
  onAnalyze,
  isLoading,
  error,
}) => {
  const [target, setTarget] = useState('ethereum');
  const [analysisType, setAnalysisType] = useState<AnalysisType>('quick');
  const [chain, setChain] = useState('eth');
  const [contractAddress, setContractAddress] = useState('');
  const [domain, setDomain] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!target.trim()) {
      setValidationMsg('Please specify an asset name, protocol, or EVM wallet address.');
      return;
    }
    setValidationMsg(null);

    onAnalyze({
      target: target.trim(),
      analysisType,
      chain,
      contractAddress: contractAddress.trim() || undefined,
      domain: domain.trim() || undefined,
    });
  };

  const handleSelectPreset = (preset: typeof PRESET_TARGETS[0]) => {
    setTarget(preset.value);
    setAnalysisType(preset.type as AnalysisType);
    setChain(preset.chain);
    setValidationMsg(null);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Analysis Type Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => setAnalysisType('quick')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
              analysisType === 'quick'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-sm'
                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Quick Intelligence
          </button>
          <button
            type="button"
            onClick={() => setAnalysisType('asset')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
              analysisType === 'asset'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-sm'
                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Asset & Price Risk
          </button>
          <button
            type="button"
            onClick={() => setAnalysisType('protocol')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
              analysisType === 'protocol'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-sm'
                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            DeFi Protocol Collateral
          </button>
          <button
            type="button"
            onClick={() => setAnalysisType('wallet')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
              analysisType === 'wallet'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-sm'
                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            Wallet Sentinel
          </button>
        </div>

        {/* Search Input and Analyze Action */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={target}
              onChange={(e) => {
                setTarget(e.target.value);
                setValidationMsg(null);
              }}
              placeholder="Enter token symbol, protocol name, or 0x address (e.g. ethereum, uniswap, aave)..."
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 font-mono transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Chain Selector */}
            <select
              value={chain}
              onChange={(e) => setChain(e.target.value)}
              disabled={isLoading}
              className="py-3 px-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 font-mono"
            >
              <option value="eth">Ethereum</option>
              <option value="base">Base</option>
              <option value="arbitrum">Arbitrum</option>
              <option value="optimism">Optimism</option>
              <option value="polygon">Polygon</option>
              <option value="solana">Solana</option>
            </select>

            {/* Analyze Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center gap-2 py-3 px-6 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Dispatching Telegraph Miners...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze Target</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs text-slate-500 mr-1 font-mono">Verified Presets:</span>
          {PRESET_TARGETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              disabled={isLoading}
              className="px-2.5 py-1 text-xs bg-slate-950/70 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 text-slate-400 hover:text-emerald-400 rounded-lg transition-colors font-mono"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Advanced Options Accordion */}
        <div className="border-t border-slate-800/60 pt-2">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors py-1"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Advanced Miner Parameters (Token Contract & SSL Domain)</span>
            {showAdvanced ? (
              <ChevronUp className="w-3.5 h-3.5 ml-1" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-1" />
            )}
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-800/40">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Contract Address (for Token Holder Distribution Miner):
                </label>
                <input
                  type="text"
                  value={contractAddress}
                  onChange={(e) => setContractAddress(e.target.value)}
                  placeholder="0x... (e.g. USDC, UNI, AAVE contract)"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Protocol Web Domain (for TLS/SSL Miner Handshake):
                </label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="e.g. app.uniswap.org, aave.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* Validation or Error Message */}
        {(validationMsg || error) && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{validationMsg || error}</span>
          </div>
        )}
      </form>
    </div>
  );
};
