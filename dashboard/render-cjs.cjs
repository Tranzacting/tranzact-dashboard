const { bundle } = require('@remotion/bundler');
const { renderMedia } = require('@remotion/renderer');
const path = require('path');

const projectRoot = process.cwd();

async function render() {
  try {
    console.log('🎬 Starting Remotion render...');

    // Bundle the Remotion project
    const bundleLocation = await bundle({
      entryPoint: path.join(projectRoot, 'src/Root.tsx'),
      webpackOverride: (config) => config,
    });

    console.log('📦 Bundle created:', bundleLocation);

    // Render the video
    await renderMedia({
      composition: 'UsersTeamsVideo',
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: path.join(projectRoot, '../Ads/output-video.mp4'),
      inputProps: {},
    });

    console.log('✅ Video rendered successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Render failed:', err);
    process.exit(1);
  }
}

render();
