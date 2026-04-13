import { TemplateConfig } from './rules';

export interface VideoMetrics {
  videoId: string;
  timestamp: string;
  template: TemplateConfig;
  audience: string;
  campaign: string;

  // Performance metrics
  views: number;
  clicks: number;
  ctr: number; // Click-through rate (%)
  impressions: number;
  engagement: number; // Overall engagement score (0-1)
  avgWatchTime: number; // seconds
  completionRate: number; // percentage

  // Conversions
  leads: number;
  conversions: number;
  cpc: number; // Cost per click
  cpa: number; // Cost per acquisition
  roas: number; // Return on ad spend
}

export interface PerformanceDatabase {
  videos: VideoMetrics[];
  rules: Map<string, { avgEngagement: number; count: number }>;
}

// In-memory performance database (in production, use real DB)
export const performanceDB: PerformanceDatabase = {
  videos: [],
  rules: new Map(),
};

// Record video performance
export function recordVideoPerformance(metrics: VideoMetrics) {
  performanceDB.videos.push(metrics);

  // Update rule stats
  const ruleKey = JSON.stringify(metrics.template);
  const existing = performanceDB.rules.get(ruleKey) || { avgEngagement: 0, count: 0 };

  existing.avgEngagement = (existing.avgEngagement * existing.count + metrics.engagement) / (existing.count + 1);
  existing.count += 1;

  performanceDB.rules.set(ruleKey, existing);
}

// Get performance stats for a rule configuration
export function getPerformanceStats(template: TemplateConfig) {
  const ruleKey = JSON.stringify(template);
  return performanceDB.rules.get(ruleKey) || { avgEngagement: 0, count: 0 };
}

// Get top performing videos
export function getTopPerformingVideos(limit: number = 10) {
  return [...performanceDB.videos]
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, limit);
}

// Get performance by audience
export function getPerformanceByAudience(audience: string) {
  return performanceDB.videos.filter((v) => v.audience === audience);
}

// Get average metrics for a template
export function getTemplateMetrics(template: string) {
  const videos = performanceDB.videos.filter((v) => v.template.template === template);
  if (!videos.length) return null;

  return {
    avgEngagement: videos.reduce((sum, v) => sum + v.engagement, 0) / videos.length,
    avgCtr: videos.reduce((sum, v) => sum + v.ctr, 0) / videos.length,
    avgWatchTime: videos.reduce((sum, v) => sum + v.avgWatchTime, 0) / videos.length,
    avgRoas: videos.reduce((sum, v) => sum + v.roas, 0) / videos.length,
    count: videos.length,
  };
}

// Export metrics for analysis
export function exportMetrics() {
  return {
    totalVideos: performanceDB.videos.length,
    videos: performanceDB.videos,
    rules: Object.fromEntries(performanceDB.rules),
  };
}
