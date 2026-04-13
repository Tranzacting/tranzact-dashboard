# 🎬 Intelligent Video Generation System

A scalable, AI-driven video generation platform that learns and optimizes ad templates based on real performance data.

## Overview

This system generates professional video ads at scale using a learning algorithm that continuously improves template selection based on what actually works with your target audiences.

### Key Features

- ✅ **Design System**: 5 color schemes, 3 animation styles, 3 typography styles, 5 layout types
- ✅ **3 Premium Templates**: Ready-to-use, professionally designed video compositions
- ✅ **Rules Engine**: 10+ predefined rules for audience × goal matching
- ✅ **Learning Algorithm**: 80/20 exploration strategy for continuous optimization
- ✅ **Performance Tracking**: Records engagement, CTR, conversions, ROAS
- ✅ **Batch Generation**: Generate hundreds of videos automatically
- ✅ **CLI Tools**: Simple commands to generate, analyze, and preview videos

---

## System Architecture

```
Input Data (CSV/JSON)
    ↓
Learning Engine (Select Template)
    ↓
Template Configuration
    ↓
Render Video (Remotion)
    ↓
Performance Tracking
    ↓
Feedback Loop (Update Rules)
```

---

## How It Works

### 1. Video Generation Flow

When you generate a video:

1. **Input**: Specify audience, campaign goal, headline, and content
2. **Selection**: Learning engine picks the best-performing template for that audience/goal
3. **Composition**: Builds a Remotion composition with selected template
4. **Rendering**: Generates MP4 video using Remotion CLI
5. **Tracking**: Records performance once video is deployed
6. **Learning**: Updates rules based on performance metrics

### 2. Learning Algorithm

The system uses a **Bayesian exploration strategy**:

- **80% Exploit**: Use proven winners (highest historical engagement)
- **20% Explore**: Try new template combinations to discover improvements

This balance prevents over-optimization while ensuring continuous discovery.

### 3. Performance Feedback Loop

```
Record Metrics (CTR, Engagement, Conversions)
    ↓
Calculate Engagement Score (0-1)
    ↓
Update Rule Engagement
    ↓
Next Video Selects Better Template
    ↓
Cycle Repeats
```

---

## File Structure

```
src/compositions/
├── design-system/           # Core design components
│   ├── colors.ts           # 5 color schemes
│   ├── animations.ts       # Animation presets
│   ├── typography.ts       # Font/text styling
│   ├── layouts.tsx         # Reusable layout components
│   ├── components.tsx      # Text, Button, Card, Image components
│   └── index.ts            # Exports
│
├── templates/              # Video compositions
│   ├── PremiumTemplate1.tsx  # Hero-focused
│   ├── PremiumTemplate2.tsx  # Image + content split
│   └── PremiumTemplate3.tsx  # Feature grid
│
├── engine/                 # Intelligence & learning
│   ├── rules.ts            # Rule definitions & matching
│   ├── performance.ts      # Metrics tracking
│   ├── learning.ts         # ML algorithm
│   └── index.ts            # Exports
│
└── scripts/
    ├── generate-videos.ts   # Batch generation logic
    ├── cli.ts               # Command-line interface
    └── data/sample-videos.json  # Example data

```

---

## Usage

### Quick Start

1. **Create a video data file** (`videos.json`):

```json
{
  "videos": [
    {
      "id": "ad_001",
      "audience": "executives",
      "campaign": "awareness",
      "headline": "Real-Time Manufacturing Visibility",
      "subheadline": "Monitor your entire operation",
      "cta": "Schedule Demo"
    }
  ]
}
```

2. **Generate videos**:

```bash
npm run gen:videos generate ./videos.json ./output
```

3. **View insights**:

```bash
npm run gen:videos insights
```

### Audience Types

- `executives` - C-level, risk-averse, ROI-focused
- `business-owners` - SME owners, practical, growth-minded
- `young-entrepreneurs` - Startup founders, ambitious, tech-savvy
- `students` - Learning, budget-conscious
- `general-public` - Mass market, simple messaging
- `tech-savvy` - Developers, engineers, advanced users

### Campaign Goals

- `awareness` - Build brand recognition
- `consideration` - Show features/benefits
- `conversion` - Drive signups or purchases
- `retention` - Keep existing users engaged
- `viral` - Maximize shares and reach

### Command Reference

```bash
# Generate videos from data file
npm run gen:videos generate ./videos.json ./output

# Show learning insights
npm run gen:videos insights

# Preview optimal template
npm run gen:videos preview executives awareness

# Generate sample data file
npm run gen:videos sample

# Show help
npm run gen:videos help
```

---

## Data File Format

### Minimal Example
```json
{
  "id": "ad_001",
  "audience": "business-owners",
  "campaign": "conversion",
  "headline": "Grow Your Business Faster",
  "cta": "Get Started"
}
```

### Complete Example
```json
{
  "id": "ad_advanced_001",
  "audience": "executives",
  "campaign": "conversion",
  "headline": "Enterprise-Grade Analytics",
  "subheadline": "Real-time insights for manufacturing leaders",
  "cta": "View Demo",
  "imageUrl": "assets/dashboard.png",
  "features": [
    {
      "title": "Real-Time Monitoring",
      "description": "Live data from your production floor"
    },
    {
      "title": "Predictive Analytics",
      "description": "AI-powered insights"
    }
  ]
}
```

---

## Design System

### Color Schemes

| Name | Primary | Secondary | Use Case |
|------|---------|-----------|----------|
| **brandBlue** | #0066CC | #0052A3 | Corporate, professional |
| **modernGradient** | #FF6B35 | #F7931E | Youth, energy |
| **minimalBW** | #000000 | #333333 | Elegant, minimalist |
| **vibrantTeal** | #00B4D8 | #0096C7 | Innovation, tech |
| **successGreen** | #10B981 | #059669 | Growth, positive |

### Animation Styles

| Style | Best For | Characteristics |
|-------|----------|-----------------|
| **subtle** | Professionals | Smooth, understated fades |
| **energetic** | Young audience | Bounces, rotations, dynamic |
| **smooth** | Premium | Parallax, slow zooms |

### Typography Styles

| Style | Best For |
|-------|----------|
| **professional** | B2B, executives |
| **modern** | Tech startups, youth |
| **minimal** | Luxury, premium |

### Layouts

- **HeroCenter** - Full screen with centered content
- **HeroLeft** - Content left, image right
- **SplitScreen** - Two equal halves
- **CardGrid** - Feature grid layout
- **FullBleed** - Image background with text overlay

---

## Performance Metrics

The system tracks:

- **Engagement**: Overall interaction score (0-1)
- **CTR**: Click-through rate (%)
- **Conversions**: Number of desired actions
- **ROAS**: Return on ad spend
- **Watch Time**: Average video completion time

---

## Rules Engine

### How Rules Work

```typescript
Rule = {
  name: "Executive - Conversion",
  condition: { audience: "executives", goal: "conversion" },
  config: {
    template: "template2",
    colorScheme: "minimalBW",
    animationStyle: "subtle",
    typographyStyle: "minimal"
  },
  weight: 10,        // Priority (1-10)
  engagement: 0.82   // Historical engagement
}
```

### Rule Matching

The system:
1. Finds all rules matching the audience + goal
2. Sorts by weight (priority)
3. Further sorts by engagement (performance)
4. Returns the best match

### Learning Updates

When a video performs:
1. Record metrics (CTR, engagement, etc.)
2. Calculate engagement score
3. Update the associated rule's engagement
4. Next video will favor that combination

---

## A/B Testing

Compare two template configurations:

```typescript
import { runABTest } from './engine';

const result = runABTest(templateA, templateB);
// Shows which performed better and confidence score
```

---

## Batch Generation Example

Generate 100 videos from a CSV file with slight variations:

```json
{
  "videos": [
    { "id": "batch_001", "audience": "executives", "campaign": "awareness", ... },
    { "id": "batch_002", "audience": "executives", "campaign": "awareness", ... },
    { "id": "batch_003", "audience": "business-owners", "campaign": "conversion", ... },
    // ... 97 more
  ]
}
```

```bash
npm run gen:videos generate ./batch.json ./output
# Generates 100 videos, optimally assigned to templates
```

---

## Output

After generation, you get:

1. **Individual MP4 files** - One for each video
2. **manifest.json** - Metadata about all videos
3. **videos.csv** - Spreadsheet with template assignments

```json
{
  "generatedAt": "2024-04-10T...",
  "totalVideos": 100,
  "videos": [
    {
      "videoId": "ad_001",
      "outputPath": "./output/ad_001.mp4",
      "template": "template2",
      "audience": "executives",
      "campaign": "awareness"
    }
    // ...
  ]
}
```

---

## Next Steps

1. **Deploy Videos**: Use the output MP4s in your ad campaigns
2. **Track Performance**: Measure CTR, conversions, engagement
3. **Feed Back Results**: Run learning algorithm with new metrics
4. **Generate Next Batch**: System improves template selection
5. **Repeat**: Continuous optimization cycle

---

## Tips for Best Results

### 1. Start with Quality Data
- Use clear, compelling headlines
- Provide high-quality images
- Write concise, benefit-focused copy

### 2. Test Different Audiences
- Run videos for different audience segments
- Let the learning algorithm discover what works for each
- Update your rules based on findings

### 3. Monitor Performance
- Track CTR, engagement, and conversions
- Update the performance database regularly
- Review insights frequently

### 4. Iterate Quickly
- Generate small batches (10-20 videos)
- Deploy and measure results
- Feed back data to learn from
- Generate improved versions

### 5. Trust the Algorithm
- The learning system will naturally favor successful combinations
- Don't overthink template selection
- Let data drive decisions

---

## Advanced Usage

### Custom Learning Config

```typescript
import { selectOptimalTemplate } from './engine';

const config = {
  explorationRate: 0.3,  // 30% exploration (vs 20% default)
  biastowardNewRules: true,
  updateFrequency: 100
};

const template = selectOptimalTemplate('executives', 'awareness', config);
```

### Generate Variations

```typescript
import { generateVariations } from './engine';

const baseTemplate = { /* ... */ };
const variations = generateVariations(baseTemplate, 10);
// Generates 10 different variations to test
```

### Export Metrics

```typescript
import { exportMetrics } from './engine';

const metrics = exportMetrics();
console.log(JSON.stringify(metrics, null, 2));
// Full performance database export
```

---

## Troubleshooting

**Q: Why is the same template being selected?**
A: The algorithm found a high-performing combination. This is good! It's exploiting what works. The 20% exploration rate ensures variety.

**Q: How do I force a specific template?**
A: Directly import the template component instead of using the learning layer:
```typescript
import { PremiumTemplate1 } from './templates';
// Use directly with your desired props
```

**Q: Can I add custom rules?**
A: Yes! Edit `src/compositions/engine/rules.ts` and add new rule objects to the `rules` array.

---

## System Performance

- **Generation**: ~1s per video (composition building)
- **Rendering**: ~2-5min per video (depends on Remotion setup)
- **Batch of 100**: ~3-8 hours with 4 parallel renders
- **Memory**: ~200MB per parallel render process

---

## Architecture Decisions

### Why 80/20 Exploration?
- **80%** ensures we ship good videos consistently
- **20%** ensures we discover improvements
- Balance prevents stagnation while maintaining quality

### Why Weights and Engagement?
- **Weights** allow manual prioritization
- **Engagement** provides automatic ranking
- Combined = both explicit and data-driven decisions

### Why Bayesian Approach?
- Scales well from 10 to 100,000+ videos
- Naturally handles uncertainty
- Graceful degradation when data is limited

---

## Future Enhancements

- [ ] Computer vision analysis of video engagement
- [ ] Sentiment analysis on audience comments
- [ ] Automatic caption/subtitle generation
- [ ] Voice-over synthesis (text-to-speech)
- [ ] Multi-language support
- [ ] Social media platform optimization
- [ ] Real-time performance dashboard
- [ ] Automated bid optimization

---

## Support

For issues or questions:
1. Check sample data file: `src/data/sample-videos.json`
2. Review CLI help: `npm run gen:videos help`
3. Check console logs for detailed error messages
4. Review learning insights: `npm run gen:videos insights`

---

**Happy video generating! 🎉**
