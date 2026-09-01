import React, { useState } from 'react';
import {
  Cpu,
  Search,
  CheckCircle2,
  ExternalLink,
  Layers,
  Filter,
  Sparkles,
} from 'lucide-react';
import { TelegraphMinerIntegration } from '../types/index.ts';

interface MinersRegistryViewProps {
  miners: TelegraphMinerIntegration[];
}

export const MinersRegistryView: React.FC<MinersRegistryViewProps> = ({ miners = [] }) => {
  const [search, setSearch] = useState('');
  const [selectedIntent, setSelectedIntent] = useState<string>('ALL');

  const safeMiners = miners || [];

  // Extract all unique intents
  const allIntents = Array.from(
    new Set(safeMiners.flatMap((m) => m.supported_intents || [])),
  ).sort();

  // Filtered miners
  const filteredMiners = safeMiners.filter((miner) => {
    const matchesSearch =
      (miner.name && miner.name.toLowerCase().includes(search.toLowerCase())) ||
      miner.id?.toString().includes(search) ||
      (miner.description && miner.description.toLowerCase().includes(search.toLowerCase())) ||
      (miner.endpoint && miner.endpoint.toLowerCase().includes(search.toLowerCase()));

    const matchesIntent =
      selectedIntent === 'ALL' || (miner.supported_intents && miner.supported_intents.includes(selectedIntent));

    return matchesSearch && matchesIntent;
  });

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <Cpu className="w-5 h-5 text-emerald-400" />
              Telegraph Miner Dispatcher & Intent Registry
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Active registered decentralized miners powering intelligence verification
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg">
              {safeMiners.length} Registered Miners
            </span>
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">
              {allIntents.length} Unique Intents
            </span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search miners by ID, name, intent, or endpoint..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500 shrink-0" />
            <select
              value={selectedIntent}
              onChange={(e) => setSelectedIntent(e.target.value)}
              className="py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
            >
              <option value="ALL">All Intents ({allIntents.length})</option>
              {allIntents.map((intent) => (
                <option key={intent} value={intent}>
                  {intent}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Miners Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMiners.map((miner) => (
            <div
              key={miner.id}
              className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-3 font-mono text-xs flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                      #{miner.id}
                    </span>
                    <h4 className="font-bold text-slate-200 text-xs truncate max-w-[180px]">
                      {miner.name}
                    </h4>
                  </div>
                </div>

                {miner.description && (
                  <p className="text-[11px] text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {miner.description}
                  </p>
                )}

                {/* Supported Intents Chips */}
                <div className="mt-3">
                  <span className="text-[10px] text-slate-500 block mb-1">Supported Intents:</span>
                  <div className="flex flex-wrap gap-1">
                    {miner.supported_intents?.map((int) => (
                      <span
                        key={int}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                          int === selectedIntent
                            ? 'bg-emerald-500 text-white font-bold'
                            : 'bg-slate-900 text-slate-300 border border-slate-800'
                        }`}
                      >
                        {int}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Endpoint */}
              {miner.endpoint && (
                <div className="pt-2 border-t border-slate-900 text-[10px] text-slate-500 truncate" title={miner.endpoint}>
                  Endpoint: <code className="text-slate-400">{miner.endpoint}</code>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
