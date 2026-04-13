#!/usr/bin/env node

import { generateVideoBatch, generateVideosFromData, exportAsCSV, type VideoGenerationRequest } from './generate-videos';
import { getInsights, selectOptimalTemplate } from '../compositions/engine';
import * as fs from 'fs';
import * as path from 'path';

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  console.log('🎬 TranZact Intelligent Video Generator\n');

  try {
    switch (command) {
      case 'generate':
        await handleGenerate();
        break;

      case 'insights':
        handleInsights();
        break;

      case 'preview':
        handlePreview();
        break;

      case 'sample':
        handleGenerateSample();
        break;

      case 'help':
      default:
        showHelp();
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

async function handleGenerate() {
  const inputFile = args[1] || './src/data/sample-videos.json';
  const outputDir = args[2] || './output-videos';

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Input file not found: ${inputFile}`);
    console.log('\nUsage: npm run gen:videos generate <input-file> [output-dir]');
    console.log('Example: npm run gen:videos generate ./videos.json ./output');
    return;
  }

  console.log(`📂 Reading from: ${inputFile}`);
  console.log(`📁 Output to: ${outputDir}\n`);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const videos = await generateVideosFromData(inputFile, outputDir);

  // Export manifest
  const manifest = {
    generatedAt: new Date().toISOString(),
    totalVideos: videos.length,
    videos: videos.map((v) => ({
      videoId: v.videoId,
      outputPath: v.outputPath,
      template: v.templateConfig.template,
      audience: v.metadata.audience,
      campaign: v.metadata.campaign,
    })),
  };

  const manifestPath = path.join(outputDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n📋 Manifest saved to: ${manifestPath}`);

  // Export CSV
  const csvPath = path.join(outputDir, 'videos.csv');
  const csv = exportAsCSV(videos);
  fs.writeFileSync(csvPath, csv);
  console.log(`📊 CSV export saved to: ${csvPath}`);
}

function handleInsights() {
  console.log('📊 Learning Insights:\n');
  const insights = getInsights();

  console.log('🏆 Top Performing Videos:');
  insights.topPerformingVideos.forEach((v, i) => {
    console.log(
      `  ${i + 1}. ${v.videoId} (Engagement: ${(v.engagement * 100).toFixed(1)}%) - ${v.template}`
    );
  });

  console.log('\n📈 Template Performance:');
  Object.entries(insights.templatePerformance).forEach(([template, metrics]) => {
    if (metrics) {
      console.log(`  ${template}:`);
      console.log(`    • Avg Engagement: ${(metrics.avgEngagement * 100).toFixed(1)}%`);
      console.log(`    • Avg CTR: ${metrics.avgCtr?.toFixed(2)}%`);
      console.log(`    • Videos: ${metrics.count}`);
    }
  });

  console.log('\n💡 Recommendations:');
  console.log(`  • Preferred Colors: ${insights.recommendations.preferredColors.join(', ')}`);
  console.log(`  • Preferred Animations: ${insights.recommendations.preferredAnimations.join(', ')}`);
  console.log(`  • Best Templates: ${insights.recommendations.preferredTemplates.join(', ')}`);
}

function handlePreview() {
  const audience = (args[1] as any) || 'business-owners';
  const goal = (args[2] as any) || 'consideration';

  const config = selectOptimalTemplate(audience, goal);

  console.log(`\n🎨 Optimal Template for ${audience} → ${goal}:\n`);
  console.log(`  Template: ${config.template}`);
  console.log(`  Colors: ${config.colorScheme}`);
  console.log(`  Animation: ${config.animationStyle}`);
  console.log(`  Typography: ${config.typographyStyle}`);
  console.log('\nThis combination has been selected based on historical performance data.');
}

function handleGenerateSample() {
  const sampleData: VideoGenerationRequest[] = [
    {
      id: 'sample_001',
      audience: 'executives',
      campaign: 'awareness',
      headline: 'Your Sample Campaign #1',
      subheadline: 'Tagline goes here',
      cta: 'Call to Action',
    },
    {
      id: 'sample_002',
      audience: 'business-owners',
      campaign: 'conversion',
      headline: 'Your Sample Campaign #2',
      subheadline: 'Another great message',
      cta: 'Try Free',
    },
  ];

  const outputPath = './sample-videos.json';
  fs.writeFileSync(outputPath, JSON.stringify({ videos: sampleData }, null, 2));
  console.log(`✅ Sample data file created: ${outputPath}`);
  console.log(`\nEdit this file with your video details, then run:`);
  console.log(`  npm run gen:videos generate ${outputPath}`);
}

function showHelp() {
  console.log(`
Usage: npm run gen:videos [command] [options]

Commands:
  generate <file> [output]   Generate videos from JSON/CSV file
                            Example: generate ./videos.json ./output

  insights                   Show learning insights and recommendations

  preview <audience> <goal>  Preview optimal template for audience
                            Example: preview executives awareness

  sample                     Generate sample data file

  help                       Show this help message

Examples:
  npm run gen:videos generate ./data/videos.json
  npm run gen:videos insights
  npm run gen:videos preview business-owners conversion
  npm run gen:videos sample

Environment:
  Set PARALLEL=N to render N videos in parallel (default: 4)
  Example: PARALLEL=8 npm run gen:videos generate ./videos.json
`);
}

main().catch(console.error);
