// Engine Exports
export {
  matchRules,
  getBestRule,
  updateRuleEngagement,
  type AudienceSegment,
  type CampaignGoal,
  type TemplateConfig,
  type RuleCondition,
} from './rules';

export {
  recordVideoPerformance,
  getPerformanceStats,
  getTopPerformingVideos,
  getPerformanceByAudience,
  getTemplateMetrics,
  exportMetrics,
  type VideoMetrics,
  type PerformanceDatabase,
} from './performance';

export {
  selectOptimalTemplate,
  processPerformanceFeedback,
  generateVariations,
  getInsights,
  runABTest,
  type LearningConfig,
} from './learning';
