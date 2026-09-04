import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { SearchPanel } from './components/SearchPanel.tsx';
import { RiskScoreGauge } from './components/RiskScoreGauge.tsx';
import { SignalCardsGrid } from './components/SignalCardsGrid.tsx';
import { RiskFactorsBreakdown } from './components/RiskFactorsBreakdown.tsx';
import { EvidenceAttributionTable } from './components/EvidenceAttributionTable.tsx';
import { CalculationsExplorer } from './components/CalculationsExplorer.tsx';
import { RawIntelligenceViewer } from './components/RawIntelligenceViewer.tsx';
import { AnalysisHistory } from './components/AnalysisHistory.tsx';
import { SubnetEventsView } from './components/SubnetEventsView.tsx';
import { MinersRegistryView } from './components/MinersRegistryView.tsx';
import { HowItWorksView } from './components/HowItWorksView.tsx';
import { guardianApi } from './api/client.ts';
import {
  AnalysisRequest,
  DeFiRiskAssessmentReport,
  NetworkOverviewResponse,
  StoredAnalysisRecord,
} from './types/index.ts';

const LOCAL_STORAGE_KEY = 'telegraph_defi_guardian_history_v2';

export default function App() {
  const [activeTab, setActiveTab] = useState<'analyzer' | 'events' | 'miners' | 'about'>('analyzer');
  const [overview, setOverview] = useState<NetworkOverviewResponse | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);

  const [currentReport, setCurrentReport] = useState<DeFiRiskAssessmentReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [history, setHistory] = useState<StoredAnalysisRecord[]>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const loadOverview = async () => {
    setIsLoadingOverview(true);
    try {
      const data = await guardianApi.getOverview();
      setOverview(data);
    } catch (err: any) {
      console.warn('Network overview fetch notice:', err.message);
    } finally {
      setIsLoadingOverview(false);
    }
  };

  const handleAnalyze = async (req: AnalysisRequest) => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const report = await guardianApi.analyzeTarget(req);
      setCurrentReport(report);

      const newRecord: StoredAnalysisRecord = {
        id: `${report.subject.id}_${Date.now()}`,
        timestamp: report.timestamp,
        targetName: report.subject.name,
        targetSymbol: report.subject.symbol,
        type: report.subject.type,
        riskScore: report.applicationInterpretation.overallRiskScore,
        classification: report.applicationInterpretation.riskClassification,
        confidence: report.applicationInterpretation.confidenceScore,
        report,
      };

      setHistory((prev) => {
        const filtered = prev.filter((r) => r.targetName !== newRecord.targetName);
        const updated = [newRecord, ...filtered].slice(0, 15);
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        } catch {
          // Ignore localStorage quota errors
        }
        return updated;
      });
    } catch (err: any) {
      console.error('Analysis error:', err);
      setAnalysisError(err.message || 'Failed to complete DeFi Guardian risk assessment.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {
      // Ignore
    }
  };

  // Overview is read-only and safe to load automatically. Paid Engine inference is
  // intentionally user-initiated so opening the public app never spends the
  // operator's x402 wallet without an explicit analysis action.
  useEffect(() => {
    loadOverview();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      <Header
        overview={overview}
        isLoadingOverview={isLoadingOverview}
        onRefreshOverview={loadOverview}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'analyzer' && (
          <div className="space-y-8">
            <SearchPanel
              onAnalyze={handleAnalyze}
              isLoading={isAnalyzing}
              error={analysisError}
            />

            {currentReport && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <RiskScoreGauge report={currentReport} />
                <SignalCardsGrid bundle={currentReport.rawTelegraphIntelligence} />
                <RiskFactorsBreakdown interpretation={currentReport.applicationInterpretation} />
                <EvidenceAttributionTable
                  evidence={currentReport.applicationInterpretation?.evidenceAttribution || []}
                  disclaimer={currentReport.attributionDisclaimer || 'Telegraph Engine provenance is shown where the response exposes it; application-derived calculations are labeled separately.'}
                />
                <CalculationsExplorer
                  categories={currentReport.applicationInterpretation?.categoryBreakdown || {}}
                  calculations={currentReport.derivedCalculations}
                />
                <RawIntelligenceViewer report={currentReport} />
              </div>
            )}

            <AnalysisHistory
              history={history}
              onSelectReport={(report) => {
                setCurrentReport(report);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onClearHistory={handleClearHistory}
            />
          </div>
        )}

        {activeTab === 'events' && (
          <SubnetEventsView
            events={overview?.liveSubnetEvents || []}
            isLoading={isLoadingOverview}
          />
        )}

        {activeTab === 'miners' && (
          <MinersRegistryView miners={overview?.miners || []} />
        )}

        {activeTab === 'about' && <HowItWorksView />}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>Telegraph DeFi Guardian • Track 3: Applications & Agents</span>
          <span>Powered by Telegraph Engine and live Telegraph network data</span>
        </div>
      </footer>
    </div>
  );
}
