import React from 'react';
import {
  Shield,
  Activity,
  Cpu,
  RefreshCw,
  Terminal,
  Radio,
  Server,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { NetworkOverviewResponse } from '../types/index.ts';

interface HeaderProps {
  overview: NetworkOverviewResponse | null;
  isLoadingOverview: boolean;
  onRefreshOverview: () => void;
  activeTab: 'analyzer' | 'events' | 'miners' | 'about';
  setActiveTab: (tab: 'analyzer' | 'events' | 'miners' | 'about') => void;
}

export const Header: React.FC<HeaderProps> = ({
  overview,
  isLoadingOverview,
  onRefreshOverview,
  activeTab,
  setActiveTab,
}) => {
  const isConnected = !!overview?.nodeStatus?.publicKey;
  const pubKey = overview?.nodeStatus?.publicKey;
  const shortKey =
    typeof pubKey === 'string' && pubKey.length >= 10
      ? `${pubKey.substring(0, 6)}...${pubKey.substring(pubKey.length - 4)}`
      : typeof pubKey === 'string' && pubKey.length > 0
      ? pubKey
      : 'Connecting...';
  const minersCount = overview?.miners?.length ?? (isLoadingOverview ? '...' : 0);
  const eventsCount = overview?.liveSubnetEvents?.length ?? 0;

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/30">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white font-mono">
                  TELEGRAPH <span className="text-emerald-400">DeFi Guardian</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full">
                  BASE-SEPOLIA SUBNET
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Verifiable Intelligence & Deterministic Risk Terminal
              </p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('analyzer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'analyzer'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Risk Terminal
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'events'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              Subnet Events
              {eventsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-slate-800 text-emerald-400 rounded-full font-mono">
                  {eventsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('miners')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'miners'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Miner Registry
              <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-slate-800 text-slate-300 rounded-full font-mono">
                {minersCount}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'about'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Architecture
            </button>
          </nav>

          {/* Node Status & Actions */}
          <div className="flex items-center gap-3">
            {/* Live Node Pill */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="text-slate-400">Node:</span>
              <span className="font-mono text-slate-200 font-medium">{shortKey}</span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={onRefreshOverview}
              disabled={isLoadingOverview}
              title="Refresh Telegraph Network State"
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoadingOverview ? 'animate-spin text-emerald-400' : ''}`}
              />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
