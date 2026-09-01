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

  // Load Network Overview on Mount
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

  // Run Risk Analysis
  const handleAnalyze = async (req: AnalysisRequest) => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const report = await guardianApi.analyzeTarget(req);
      setCurrentReport(report);

      // Save to local session history
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

  // Initial mount: load overview and execute initial quick check for Ethereum
  useEffect(() => {
    loadOverview();
    handleAnalyze({
      target: 'ethereum',
      analysisType: 'quick',
      chain: 'eth',
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Navigation & Live Status Header */}
      <Header
        overview={overview}
        isLoadingOverview={isLoadingOverview}
        onRefreshOverview={loadOverview}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab 1: Risk Analyzer Terminal */}
        {activeTab === 'analyzer' && (
          <div className="space-y-8">
            {/* Search and Parameter Panel */}
            <SearchPanel
              onAnalyze={handleAnalyze}
              isLoading={isAnalyzing}
              error={analysisError}
            />

            {/* Current Report Display */}
            {currentReport && (
              <div className="space-y-8 animate-in fade-in duration-500">
                {/* 1. Overall Score & Subject Metadata */}
                <RiskScoreGauge report={currentReport} />

                {/* 2. Verified Normalized Signals Grid */}
                <SignalCardsGrid bundle={currentReport.rawTelegraphIntelligence} />

                {/* 3. Risk Factors, Flags & Warnings Breakdown */}
                <RiskFactorsBreakdown interpretation={currentReport.applicationInterpretation} />

                {/* 4. Evidence Attribution to Telegraph Miners */}
                <EvidenceAttributionTable
                  evidence={currentReport.applicationInterpretation?.evidenceAttribution || []}
                  disclaimer={currentReport.attributionDisclaimer || 'Attributed to verified Telegraph subnet miners.'}
                />

                {/* 5. Deterministic Mathematical Derivations */}
                <CalculationsExplorer
                  categories={currentReport.applicationInterpretation?.categoryBreakdown || {}}
                  calculations={currentReport.derivedCalculations}
                />

                {/* 6. Raw JSON Payload Viewer for Auditors */}
                <RawIntelligenceViewer report={currentReport} />
              </div>
            )}

            {/* Session History */}
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

        {/* Tab 2: Live On-Chain Subnet Events */}
        {activeTab === 'events' && (
          <SubnetEventsView
            events={overview?.liveSubnetEvents || []}
            isLoading={isLoadingOverview}
          />
        )}

        {/* Tab 3: Miner Dispatcher Registry */}
        {activeTab === 'miners' && (
          <MinersRegistryView miners={overview?.miners || []} />
        )}

        {/* Tab 4: Architecture & Methodology */}
        {activeTab === 'about' && <HowItWorksView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>Telegraph DeFi Guardian • Track 3: Applications & Agents</span>
          <span>Powered by Real Telegraph Protocol Miners & Verified Base-Sepolia Subnets</span>
        </div>
      </footer>
    </div>
  );
}
