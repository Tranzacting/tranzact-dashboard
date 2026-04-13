import { ColorScheme } from '../design-system/colors';
import { AnimationStyle } from '../design-system/animations';
import { TypographyStyle } from '../design-system/typography';

export type AudienceSegment =
  | 'executives'
  | 'business-owners'
  | 'young-entrepreneurs'
  | 'students'
  | 'general-public'
  | 'tech-savvy';

export type CampaignGoal =
  | 'awareness'
  | 'consideration'
  | 'conversion'
  | 'retention'
  | 'viral';

export interface TemplateConfig {
  template: 'template1' | 'template2' | 'template3';
  colorScheme: ColorScheme;
  animationStyle: AnimationStyle;
  typographyStyle: TypographyStyle;
}

export interface RuleCondition {
  audience?: AudienceSegment | AudienceSegment[];
  goal?: CampaignGoal | CampaignGoal[];
  industry?: string | string[];
  seasonality?: 'high' | 'low' | 'moderate';
}

interface Rule {
  name: string;
  condition: RuleCondition;
  config: TemplateConfig;
  weight: number; // Priority weight (1-10)
  engagement?: number; // Historical engagement score (0-1)
}

// Rules database - These will be updated by the learning algorithm
export const rules: Rule[] = [
  // Executive/Corporate Rules
  {
    name: 'Executive - Awareness',
    condition: { audience: 'executives', goal: 'awareness' },
    config: {
      template: 'template1',
      colorScheme: 'brandBlue',
      animationStyle: 'subtle',
      typographyStyle: 'professional',
    },
    weight: 9,
    engagement: 0.75,
  },
  {
    name: 'Executive - Conversion',
    condition: { audience: 'executives', goal: 'conversion' },
    config: {
      template: 'template2',
      colorScheme: 'minimalBW',
      animationStyle: 'subtle',
      typographyStyle: 'minimal',
    },
    weight: 10,
    engagement: 0.82,
  },

  // Business Owner Rules
  {
    name: 'Business Owner - Awareness',
    condition: { audience: 'business-owners', goal: 'awareness' },
    config: {
      template: 'template1',
      colorScheme: 'successGreen',
      animationStyle: 'smooth',
      typographyStyle: 'professional',
    },
    weight: 8,
    engagement: 0.78,
  },
  {
    name: 'Business Owner - Features',
    condition: { audience: 'business-owners', goal: 'consideration' },
    config: {
      template: 'template3',
      colorScheme: 'vibrantTeal',
      animationStyle: 'smooth',
      typographyStyle: 'modern',
    },
    weight: 8,
    engagement: 0.81,
  },

  // Young Entrepreneurs Rules
  {
    name: 'Young Entrepreneur - Viral',
    condition: { audience: 'young-entrepreneurs', goal: 'viral' },
    config: {
      template: 'template1',
      colorScheme: 'modernGradient',
      animationStyle: 'energetic',
      typographyStyle: 'modern',
    },
    weight: 9,
    engagement: 0.88,
  },
  {
    name: 'Young Entrepreneur - Engagement',
    condition: { audience: 'young-entrepreneurs', goal: ['awareness', 'consideration'] },
    config: {
      template: 'template2',
      colorScheme: 'vibrantTeal',
      animationStyle: 'energetic',
      typographyStyle: 'modern',
    },
    weight: 8,
    engagement: 0.85,
  },

  // Tech-Savvy Rules
  {
    name: 'Tech Savvy - Modern',
    condition: { audience: 'tech-savvy', goal: ['awareness', 'consideration'] },
    config: {
      template: 'template3',
      colorScheme: 'minimalBW',
      animationStyle: 'smooth',
      typographyStyle: 'minimal',
    },
    weight: 9,
    engagement: 0.79,
  },

  // Default fallback rules
  {
    name: 'Default - Professional',
    condition: {},
    config: {
      template: 'template1',
      colorScheme: 'brandBlue',
      animationStyle: 'subtle',
      typographyStyle: 'professional',
    },
    weight: 1,
    engagement: 0.65,
  },
];

// Helper function to match rules
export function matchRules(audience: AudienceSegment, goal: CampaignGoal): Rule[] {
  return rules
    .filter((rule) => {
      // Check audience match
      if (rule.condition.audience) {
        const audiences = Array.isArray(rule.condition.audience)
          ? rule.condition.audience
          : [rule.condition.audience];
        if (!audiences.includes(audience) && rule.condition.audience) {
          return false;
        }
      }

      // Check goal match
      if (rule.condition.goal) {
        const goals = Array.isArray(rule.condition.goal) ? rule.condition.goal : [rule.condition.goal];
        if (!goals.includes(goal) && rule.condition.goal) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      // Sort by weight (priority) then by engagement (quality)
      if (a.weight !== b.weight) return b.weight - a.weight;
      return (b.engagement || 0) - (a.engagement || 0);
    });
}

// Get best rule for audience & goal
export function getBestRule(audience: AudienceSegment, goal: CampaignGoal): Rule {
  const matched = matchRules(audience, goal);
  return matched[0] || rules[rules.length - 1]; // Return best match or default
}

// Update rule engagement score (called after video performance is measured)
export function updateRuleEngagement(ruleName: string, newEngagement: number) {
  const rule = rules.find((r) => r.name === ruleName);
  if (rule) {
    // Weighted average: 70% old, 30% new
    rule.engagement = (rule.engagement || 0) * 0.7 + newEngagement * 0.3;
  }
}
