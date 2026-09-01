import {
  AnalysisRequest,
  DeFiRiskAssessmentReport,
  NetworkOverviewResponse,
  TelegraphMinerIntegration,
  TelegraphSubnetResponseEvent,
} from '../types/index.ts';

const API_TIMEOUT_MS = 25000;

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = API_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s while waiting for Telegraph network response.`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export class TelegraphGuardianApiClient {
  /**
   * Retrieves overall Telegraph Node status, live on-chain signed events, and active miner integrations.
   */
  public async getOverview(): Promise<NetworkOverviewResponse> {
    const res = await fetchWithTimeout('/api/telegraph/overview');
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Failed to fetch Telegraph network overview (HTTP ${res.status})`);
    }
    const data = await res.json();
    return data.data;
  }

  /**
   * Dispatches a real multi-intent analysis to the Telegraph Guardian backend.
   */
  public async analyzeTarget(req: AnalysisRequest): Promise<DeFiRiskAssessmentReport> {
    const res = await fetchWithTimeout('/api/telegraph/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `DeFi Guardian analysis failed (HTTP ${res.status})`);
    }

    const data = await res.json();
    if (!data.success || !data.data) {
      throw new Error(data.error || 'Invalid or malformed analysis report received from backend.');
    }

    return data.data;
  }

  /**
   * Fetches the live miner dispatcher registry.
   */
  public async getMiners(): Promise<TelegraphMinerIntegration[]> {
    const res = await fetchWithTimeout('/api/telegraph/miners');
    if (!res.ok) {
      throw new Error(`Failed to fetch miners (HTTP ${res.status})`);
    }
    const data = await res.json();
    return data.data;
  }

  /**
   * Fetches real on-chain SubnetResponse events from the Telegraph node.
   */
  public async getLiveEvents(): Promise<TelegraphSubnetResponseEvent[]> {
    const res = await fetchWithTimeout('/api/telegraph/events');
    if (!res.ok) {
      throw new Error(`Failed to fetch live subnet events (HTTP ${res.status})`);
    }
    const data = await res.json();
    return data.data;
  }
}

export const guardianApi = new TelegraphGuardianApiClient();
