import { selectOptimalTemplate, type LearningConfig } from '../compositions/engine';
import { AudienceSegment, CampaignGoal } from '../compositions/engine/rules';

export interface VideoGenerationRequest {
  id: string;
  audience: AudienceSegment;
  campaign: CampaignGoal;
  headline: string;
  subheadline?: string;
  cta?: string;
  imageUrl?: string;
  features?: Array<{ title: string; description: string }>;
  learningConfig?: Partial<LearningConfig>;
}

export interface GeneratedVideo {
  videoId: string;
  templateConfig: any;
  composition: string;
  props: any;
  estimatedDuration: string;
  outputPath: string;
  metadata: {
    audience: AudienceSegment;
    campaign: CampaignGoal;
    createdAt: string;
    learningIteration: number;
  };
}

// Main batch generator
export async function generateVideoBatch(
  requests: VideoGenerationRequest[],
  outputDir: string = './output-videos'
): Promise<GeneratedVideo[]> {
  console.log(`🎬 Starting batch generation for ${requests.length} videos...`);

  const generatedVideos: GeneratedVideo[] = [];

  for (let i = 0; i < requests.length; i++) {
    const request = requests[i];
    console.log(`\n[${i + 1}/${requests.length}] Generating video: ${request.id}`);

    try {
      const video = generateSingleVideo(request, outputDir);
      generatedVideos.push(video);
      console.log(`✅ Generated: ${video.videoId}`);
    } catch (error) {
      console.error(`❌ Failed to generate ${request.id}:`, error);
    }
  }

  console.log(`\n✨ Batch complete! Generated ${generatedVideos.length}/${requests.length} videos`);
  return generatedVideos;
}

function generateSingleVideo(request: VideoGenerationRequest, outputDir: string): GeneratedVideo {
  const templateConfig = selectOptimalTemplate(request.audience, request.campaign, request.learningConfig);

  // Map template to composition component
  const compositionMap: { [key: string]: string } = {
    template1: 'PremiumTemplate1',
    template2: 'PremiumTemplate2',
    template3: 'PremiumTemplate3',
  };

  const composition = compositionMap[templateConfig.template];

  // Build props based on template
  const props = buildTemplateProps(templateConfig, request);

  const outputPath = `${outputDir}/${request.id}.mp4`;

  return {
    videoId: request.id,
    templateConfig,
    composition,
    props,
    estimatedDuration: '12.5s',
    outputPath,
    metadata: {
      audience: request.audience,
      campaign: request.campaign,
      createdAt: new Date().toISOString(),
      learningIteration: Math.floor(Math.random() * 1000), // In production, track actual iteration
    },
  };
}

function buildTemplateProps(templateConfig: any, request: VideoGenerationRequest): any {
  const baseProps = {
    headline: request.headline,
    subheadline: request.subheadline || request.campaign,
    cta: request.cta || 'Get Started',
    colorScheme: templateConfig.colorScheme,
    animationStyle: templateConfig.animationStyle,
    typographyStyle: templateConfig.typographyStyle,
  };

  // Add template-specific props
  switch (templateConfig.template) {
    case 'template2':
      return {
        ...baseProps,
        imageUrl: request.imageUrl,
      };
    case 'template3':
      return {
        ...baseProps,
        features: request.features || [],
      };
    default:
      return baseProps;
  }
}

// Generate videos from CSV/JSON data
export async function generateVideosFromData(
  dataFile: string,
  outputDir: string = './output-videos'
): Promise<GeneratedVideo[]> {
  try {
    const data = require(dataFile);
    const requests: VideoGenerationRequest[] = Array.isArray(data) ? data : data.videos || [];

    return generateVideoBatch(requests, outputDir);
  } catch (error) {
    console.error('Failed to load data file:', error);
    throw error;
  }
}

// Render all generated videos using Remotion CLI
export async function renderAllVideos(videos: GeneratedVideo[], parallel: number = 4) {
  console.log(`\n🎥 Rendering ${videos.length} videos in parallel (max ${parallel} at once)...`);

  const queue = [...videos];
  const active: Promise<any>[] = [];

  while (queue.length > 0 || active.length > 0) {
    // Fill up to parallel limit
    while (active.length < parallel && queue.length > 0) {
      const video = queue.shift()!;
      const renderPromise = renderSingleVideo(video);
      active.push(renderPromise);
    }

    // Wait for one to complete
    if (active.length > 0) {
      await Promise.race(active);
      active.splice(
        active.findIndex((p) => p.constructor.name === 'Promise'),
        1
      );
    }
  }

  console.log('✨ All videos rendered!');
}

async function renderSingleVideo(video: GeneratedVideo): Promise<void> {
  return new Promise((resolve) => {
    // In production, use actual Remotion rendering
    console.log(`  ↳ Rendering ${video.videoId}...`);

    // Simulate render time
    setTimeout(() => {
      console.log(`  ✅ ${video.videoId} complete`);
      resolve();
    }, Math.random() * 5000 + 2000);
  });
}

// Export for CSV processing
export function exportAsCSV(videos: GeneratedVideo[]): string {
  const headers = [
    'VideoID',
    'Audience',
    'Campaign',
    'Template',
    'ColorScheme',
    'AnimationStyle',
    'Typography',
    'OutputPath',
    'CreatedAt',
  ];

  const rows = videos.map((v) => [
    v.videoId,
    v.metadata.audience,
    v.metadata.campaign,
    v.templateConfig.template,
    v.templateConfig.colorScheme,
    v.templateConfig.animationStyle,
    v.templateConfig.typographyStyle,
    v.outputPath,
    v.metadata.createdAt,
  ]);

  const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
  return csv;
}
