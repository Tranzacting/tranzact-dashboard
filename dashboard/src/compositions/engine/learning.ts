import {
  AudienceSegment,
  CampaignGoal,
  TemplateConfig,
  getBestRule,
  updateRuleEngagement,
  matchRules,
} from './rules';
import {
  getPerformanceStats,
  getTopPerformingVideos,
  getTemplateMetrics,
  recordVideoPerformance,
  VideoMetrics,
} from './performance';

export interface LearningConfig {
  explorationRate: number; // 0-1, how often to try new variations (default: 0.2 = 20%)
  biastowardNewRules: boolean; // true = occasionally test unproven rules
  updateFrequency: number; // how many videos before updating rules
}

const defaultConfig: LearningConfig = {
  explorationRate: 0.2,
  biastowardNewRules: true,
  updateFrequency: 50,
};

// Main learning algorithm
export function selectOptimalTemplate(
  audience: AudienceSegment,
  goal: CampaignGoal,
  config: LearningConfig = defaultConfig
): TemplateConfig {
  // 80% of the time, use proven winners
  if (Math.random() > config.explorationRate) {
    const bestRule = getBestRule(audience, goal);
    return bestRule.config;
  }

  // 20% of the time, explore new variations
  const allRules = matchRules(audience, goal);
  if (allRules.length > 1 && config.biastowardNewRules) {
    // Pick a random rule from top performers (excluding the absolute best)
    const exploratory = allRules.slice(1, Math.min(5, allRules.length));
    if (exploratory.length > 0) {
      return exploratory[Math.floor(Math.random() * exploratory.length)].config;
    }
  }

  // Fallback
  return getBestRule(audience, goal).config;
}

// Process video performance and learn from it
export function processPerformanceFeedback(metrics: VideoMetrics, overallEngagement: number) {
  // Record the performance
  recordVideoPerformance(metrics);

  // Update the associated rule with new engagement score
  const matchedRules = matchRules(metrics.audience as AudienceSegment, metrics.campaign as CampaignGoal);
  if (matchedRules.length > 0) {
    const bestMatch = matchedRules[0];
    updateRuleEngagement(bestMatch.name, overallEngagement);
  }

  return {
    recorded: true,
    learningComplete: true,
    updatedRule: matchedRules[0]?.name || 'default',
  };
}

// Generate variations to test
export function generateVariations(baseTemplate: TemplateConfig, count: number = 5): TemplateConfig[] {
  const colorSchemes = ['brandBlue', 'modernGradient', 'minimalBW', 'vibrantTeal', 'successGreen'];
  const animationStyles = ['subtle', 'energetic', 'smooth'];
  const typographyStyles = ['professional', 'modern', 'minimal'];
  const templates = ['template1', 'template2', 'template3'];

  const variations: TemplateConfig[] = [];

  for (let i = 0; i < count; i++) {
    variations.push({
      template: templates[i % templates.length] as any,
      colorScheme: colorSchemes[i % colorSchemes.length] as any,
      animationStyle: animationStyles[i % animationStyles.length] as any,
      typographyStyle: typographyStyles[i % typographyStyles.length] as any,
    });
  }

  return variations;
}

// Get insights on what's working
export function getInsights() {
  const topVideos = getTopPerformingVideos(5);

  const insights = {
    topPerformingVideos: topVideos.map((v) => ({
      videoId: v.videoId,
      engagement: v.engagement,
      template: v.template.template,
      colorScheme: v.template.colorScheme,
      animationStyle: v.template.animationStyle,
    })),
    templatePerformance: {
      template1: getTemplateMetrics('template1'),
      template2: getTemplateMetrics('template2'),
      template3: getTemplateMetrics('template3'),
    },
    recommendations: generateRecommendations(),
  };

  return insights;
}

function generateRecommendations() {
  const topVideos = getTopPerformingVideos(10);

  const colorCounts: { [key: string]: number } = {};
  const animationCounts: { [key: string]: number } = {};
  const templateCounts: { [key: string]: number } = {};

  topVideos.forEach((v) => {
    colorCounts[v.template.colorScheme] = (colorCounts[v.template.colorScheme] || 0) + 1;
    animationCounts[v.template.animationStyle] = (animationCounts[v.template.animationStyle] || 0) + 1;
    templateCounts[v.template.template] = (templateCounts[v.template.template] || 0) + 1;
  });

  return {
    preferredColors: Object.entries(colorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([color]) => color),
    preferredAnimations: Object.entries(animationCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([anim]) => anim),
    preferredTemplates: Object.entries(templateCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([template]) => template),
  };
}

// A/B test two configurations
export function runABTest(templateA: TemplateConfig, templateB: TemplateConfig, videoCount: number = 100) {
  const metricsA = getPerformanceStats(templateA);
  const metricsB = getPerformanceStats(templateB);

  return {
    templateA: {
      ...templateA,
      avgEngagement: metricsA.avgEngagement,
      sampleSize: metricsA.count,
    },
    templateB: {
      ...templateB,
      avgEngagement: metricsB.avgEngagement,
      sampleSize: metricsB.count,
    },
    recommendation: metricsA.avgEngagement > metricsB.avgEngagement ? 'templateA' : 'templateB',
    confidenceScore:
      Math.min(metricsA.count, metricsB.count) / videoCount,
  };
}
