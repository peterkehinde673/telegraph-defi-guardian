import React from 'react';
import {
  Radio,
  CheckCircle2,
  FileCheck,
  Shield,
  Layers,
  Clock,
  Hash,
  ExternalLink,
} from 'lucide-react';
import { TelegraphSubnetResponseEvent } from '../types/index.ts';

interface SubnetEventsViewProps {
  events: TelegraphSubnetResponseEvent[];
  isLoading: boolean;
}

export const SubnetEventsView: React.FC<SubnetEventsViewProps> = ({
  events = [],
  isLoading,
}) => {
  const safeEvents = events || [];

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
              Live Telegraph Subnet Response Event Stream
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Cryptographically signed verification events published on Base-Sepolia
            </p>
          </div>
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-mono">
            {safeEvents.length} Live Signed Events
          </span>
        </div>

        <div className="mt-6 space-y-4">
          {safeEvents.length > 0 ? (
            safeEvents.map((evt, idx) => {
              const resStr = Array.isArray(evt.response_string)
                ? evt.response_string.join(' ')
                : typeof evt.response_string === 'string'
                ? evt.response_string
                : JSON.stringify(evt.response_string);

              return (
                <div
                  key={evt.id || idx}
                  className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-3 font-mono text-xs hover:border-slate-700 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold">
                        {evt.chain || 'Base-Sepolia'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                        {evt.event_type || 'SubnetResponse'}
                      </span>
                      {evt.confidence != null && (
                        <span className="text-[11px] text-slate-400">
                          Confidence: <strong className="text-emerald-400">{(evt.confidence * 100).toFixed(0)}%</strong>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{evt.timestamp ? new Date(evt.timestamp).toLocaleString() : 'Recent'}</span>
                    </div>
                  </div>

                  {/* Response Payload */}
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-slate-200 leading-relaxed text-xs">
                    {resStr}
                  </div>

                  {/* Cryptographic Proof and Submitter / Miner Attribution */}
                  <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1">
                    <div className="flex items-center gap-2">
                      {evt.submitter && (
                        <span>
                          Submitter: <strong className="text-slate-200">{evt.submitter.slice(0, 8)}...{evt.submitter.slice(-4)}</strong>
                        </span>
                      )}
                      {evt.miner_id && (
                        <span>
                          Miner ID: <strong className="text-slate-200">#{evt.miner_id}</strong>
                        </span>
                      )}
                      {evt.miner_name && (
                        <span className="text-slate-500">({evt.miner_name})</span>
                      )}
                      {evt.blocknumber != null && (
                        <span className="text-slate-500">Block #{evt.blocknumber}</span>
                      )}
                    </div>
                    {evt.id && (
                      <div className="flex items-center gap-1 text-slate-500 truncate max-w-[280px]">
                        <Hash className="w-3 h-3" />
                        <span className="truncate">Event ID: {evt.id}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-slate-500 font-mono text-xs">
              No live subnet events returned from the node.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
