import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Coins,
  Database,
  Fuel,
  Shield,
  Users,
  Lock,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  Cpu,
} from 'lucide-react';
import { InputIntelligenceBundle } from '../types/index.ts';

interface SignalCardsGridProps {
  bundle: InputIntelligenceBundle;
}

const renderCardFooter = (
  signal: any,
  extraLabel?: string,
  extraVal?: React.ReactNode
) => {
  const isUnavailable =
    !signal.attribution?.minerName ||
    signal.attribution.minerName.toLowerCase().includes('unavailable') ||
    !signal.attribution?.minerId ||
    signal.attribution.minerId.toLowerCase().includes('unavailable');

  return (
    <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1.5 font-mono">
      <div className="flex justify-between items-center">
        <span className="text-slate-500">Miner:</span>
        <span
          className="text-slate-300 truncate max-w-[150px]"
          title={signal.attribution?.minerName}
        >
          {isUnavailable ? 'Attribution unavailable from Engine response' : signal.attribution.minerName}
        </span>
      </div>
      <div className="flex justify-between items-center text-[10px]">
        <span className="text-slate-500">Confidence:</span>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-200 font-bold">{(signal.confidence * 100).toFixed(0)}%</span>
          <span
            className={`px-1.5 py-0.5 rounded border text-[9px] ${
              signal.confidenceSource === 'telegraph_engine'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {signal.confidenceSource === 'telegraph_engine'
              ? 'Source: Telegraph Engine'
              : 'Source: Application-calculated'}
          </span>
        </div>
      </div>
      {extraLabel && (
        <div className="flex justify-between items-center">
          <span className="text-slate-500">{extraLabel}:</span>
          <span className="text-slate-300">{extraVal}</span>
        </div>
      )}
    </div>
  );
};

export const SignalCardsGrid: React.FC<SignalCardsGridProps> = ({ bundle }) => {
  const { price, tvl, gas, walletRisk, holders, ssl } = bundle;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-400" />
          Verified Telegraph Subnet Intelligence Signals
        </h3>
        <span className="text-xs text-slate-500 font-mono">
          Attested by Cryptographic Miners
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: CRYPTO_PRICE */}
        {price && price.success ? (
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 font-mono">CRYPTO_PRICE</h4>
                    <span className="text-[10px] text-slate-500 font-mono">Intent #14</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-mono">
                  VERIFIED
                </span>
              </div>

              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-white">
                    ${price.data.priceUsd < 0.01 ? price.data.priceUsd.toFixed(6) : price.data.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">USD</span>
                </div>

                <div className="flex items-center gap-2 mt-1 text-xs font-mono">
                  {price.data.change24hPct != null && (
                    <span
                      className={`flex items-center gap-0.5 font-semibold ${
                        price.data.change24hPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {price.data.change24hPct >= 0 ? (
                        <TrendingUp className="w-3.5 h-3.5" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5" />
                      )}
                      {price.data.change24hPct.toFixed(2)}% (24h)
                    </span>
                  )}
                  {price.data.priceRange.spreadPct != null && (
                    <span className="text-slate-500 text-[11px]">
                      Spread: {price.data.priceRange.spreadPct.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {renderCardFooter(price, 'Oracles', `${price.data.sourceCount} Independent Feeds`)}
          </div>
        ) : (
          <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-xl p-4 flex flex-col justify-between opacity-70">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-slate-800 text-slate-500">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 font-mono">CRYPTO_PRICE</h4>
                  <span className="text-[10px] text-slate-600 font-mono">Intent #14</span>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] bg-slate-800 text-slate-500 rounded font-mono">
                UNAVAILABLE
              </span>
            </div>
            <p className="text-xs text-slate-500 my-4">
              Real-time oracle price feeds were not retrieved for this subject.
            </p>
            <div className="text-[11px] text-slate-600 font-mono">
              Missing-data uncertainty applied
            </div>
          </div>
        )}

        {/* Card 2: TVL_LOOKUP */}
        {tvl && tvl.success ? (
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 font-mono">TVL_LOOKUP</h4>
                    <span className="text-[10px] text-slate-500 font-mono">Intent #17</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded font-mono">
                  VERIFIED
                </span>
              </div>

              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-white">
                    ${tvl.data.tvlUsd >= 1e9
                      ? `${(tvl.data.tvlUsd / 1e9).toFixed(2)}B`
                      : tvl.data.tvlUsd >= 1e6
                      ? `${(tvl.data.tvlUsd / 1e6).toFixed(2)}M`
                      : tvl.data.tvlUsd.toLocaleString('en-US')}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">USD TVL</span>
                </div>

                <p className="text-xs text-slate-400 mt-1 font-mono">
                  Protocol: <strong className="text-slate-200 capitalize">{tvl.data.protocolName}</strong>
                </p>
              </div>
            </div>

            {renderCardFooter(
              tvl,
              'Tier',
              <span className="text-blue-400 font-semibold">
                {tvl.data.tvlUsd >= 1e9 ? 'Institutional Tier' : tvl.data.tvlUsd >= 100e6 ? 'Deep Liquidity' : 'Moderate Cushion'}
              </span>
            )}
          </div>
        ) : (
          <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-xl p-4 flex flex-col justify-between opacity-70">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-slate-800 text-slate-500">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 font-mono">TVL_LOOKUP</h4>
                  <span className="text-[10px] text-slate-600 font-mono">Intent #17</span>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] bg-slate-800 text-slate-500 rounded font-mono">
                UNAVAILABLE
              </span>
            </div>
            <p className="text-xs text-slate-500 my-4">
              Protocol locked collateral feed was not queried or returned empty for this asset.
            </p>
            <div className="text-[11px] text-slate-600 font-mono">
              Liquidity depth unmeasured
            </div>
          </div>
        )}

        {/* Card 3: GAS_PRICE */}
        {gas && gas.success ? (
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                    <Fuel className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 font-mono">GAS_PRICE</h4>
                    <span className="text-[10px] text-slate-500 font-mono">Intent #23</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded font-mono uppercase">
                  {gas.data.feeLevel}
                </span>
              </div>

              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-white">
                    {gas.data.gasPriceGwei.toFixed(4)}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Gwei</span>
                </div>

                <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
                  <span>Transfer Cost: <strong className="text-slate-200">${gas.data.transferCostUsd?.toFixed(4) || '0.002'}</strong></span>
                  {gas.data.blockNumber && (
                    <span className="text-slate-500">Block #{gas.data.blockNumber}</span>
                  )}
                </div>
              </div>
            </div>

            {renderCardFooter(
              gas,
              'Settlement',
              <span className="text-emerald-400">Low Congestion</span>
            )}
          </div>
        ) : (
          <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-xl p-4 flex flex-col justify-between opacity-70">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-slate-800 text-slate-500">
                  <Fuel className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 font-mono">GAS_PRICE</h4>
                  <span className="text-[10px] text-slate-600 font-mono">Intent #23</span>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] bg-slate-800 text-slate-500 rounded font-mono">
                UNAVAILABLE
              </span>
            </div>
            <p className="text-xs text-slate-500 my-4">
              Live EVM gas rate was not queried for this transaction lifecycle.
            </p>
            <div className="text-[11px] text-slate-600 font-mono">
              Settlement overhead unmeasured
            </div>
          </div>
        )}

        {/* Card 4: WALLET_RISK (FRAUD_DETECTION) */}
        {walletRisk && walletRisk.success ? (
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 font-mono">WALLET_RISK</h4>
                    <span className="text-[10px] text-slate-500 font-mono">Intent #28</span>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 text-[10px] rounded font-mono font-bold ${
                    walletRisk.data.riskLevel === 'SAFE' || walletRisk.data.riskLevel === 'LOW'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}
                >
                  {walletRisk.data.riskLevel}
                </span>
              </div>

              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-white">
                    {walletRisk.data.riskScore.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Risk Index (0-1)</span>
                </div>

                <div className="mt-1 text-xs text-slate-400 font-mono truncate">
                  Funder: <code className="text-slate-300">{walletRisk.data.directFunder || 'Clean Genesis'}</code>
                </div>
              </div>
            </div>

            {renderCardFooter(
              walletRisk,
              'Findings',
              <span className="text-slate-300">{(walletRisk.data.reasonCodes?.length ?? 0)} Risk Factors</span>
            )}
          </div>
        ) : null}

        {/* Card 5: TOKEN_HOLDERS */}
        {holders && holders.success ? (
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 font-mono">TOKEN_HOLDERS</h4>
                    <span className="text-[10px] text-slate-500 font-mono">Intent #26</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 text-[10px] bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded font-mono">
                  VERIFIED
                </span>
              </div>

              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-white">
                    {holders.data.holdersCount.toLocaleString('en-US')}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Wallets</span>
                </div>

                <p className="text-xs text-slate-400 mt-1 font-mono">
                  Token: <strong className="text-slate-200">{holders.data.tokenSymbol}</strong> ({holders.data.chain.toUpperCase()})
                </p>
              </div>
            </div>

            {renderCardFooter(
              holders,
              'Distribution',
              <span className="text-emerald-400">Decentralized Base</span>
            )}
          </div>
        ) : null}

        {/* Card 6: SSL_HANDSHAKE */}
        {ssl && ssl.success ? (
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 font-mono">SSL_HANDSHAKE</h4>
                    <span className="text-[10px] text-slate-500 font-mono">Intent #18</span>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 text-[10px] rounded font-mono ${
                    ssl.data.isValid
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}
                >
                  {ssl.data.statusText}
                </span>
              </div>

              <div className="mt-3">
                <div className="text-lg font-bold font-mono text-white truncate">
                  {ssl.data.domain}
                </div>

                <div className="text-xs text-slate-400 mt-1 font-mono">
                  Issuer: <strong className="text-slate-200">{ssl.data.issuer}</strong>
                </div>
              </div>
            </div>

            {renderCardFooter(
              ssl,
              'Expires',
              <span className="text-emerald-400">{ssl.data.daysUntilExpiry} days remaining</span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
