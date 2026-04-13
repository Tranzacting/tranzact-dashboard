# Remotion Video Setup

This document explains how to use the Remotion video generator for creating TranZact ad videos.

## What's Been Set Up

### Compositions
- **UsersTeamsVideo** (`src/compositions/UsersTeamsVideo.tsx`) - 10-second ad video explaining the Users & Teams feature

### Structure
- **10 seconds total** (300 frames at 30fps, 1920x1080 resolution)
  - **0-1.5s**: Intro section with gradient background and feature headline
  - **1.5-4.5s**: Feature showcase with the Users & Teams interface UI screenshot
  - **4.5-7.5s**: Feature highlights with 4 key features (staggered animation)
  - **7.5-10s**: Call-to-action section with action button

### Key Features

The video includes:
- Smooth fade-in/fade-out transitions
- Spring animations for visual polish
- Responsive layout with proper typography
- Uses the "Add team members" UI screenshot from your Canva designs
- Professional gradient backgrounds
- Feature highlight cards with staggered animations

## Prerequisites

To render videos to MP4, you need **FFmpeg** installed:

```bash
# macOS (using Homebrew)
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Windows (using Chocolatey)
choco install ffmpeg
```

## How to Use

### 1. Preview the Video in Browser

Navigate to the VideoPreview page in your dashboard application:

```
http://localhost:5173/video-preview
```

This uses Remotion's Player component to preview the video with playback controls.

### 2. Render to MP4

To generate the actual MP4 file:

```bash
cd dashboard
npm run render-video
```

This will create `../Ads/output-video.mp4` with:
- H.264 codec
- 1920x1080 resolution
- 30fps
- Quality: CRF 18 (high quality)

### 3. Manual Render with Custom Options

```bash
cd dashboard

# Basic render
npx remotion render src/Root.tsx UsersTeamsVideo output.mp4

# With custom concurrency (faster rendering)
npx remotion render src/Root.tsx UsersTeamsVideo output.mp4 --concurrency 4

# Render as image sequence (for video editing software)
npx remotion render src/Root.tsx UsersTeamsVideo output-frames/

# Render with custom quality settings
npx remotion render src/Root.tsx UsersTeamsVideo output.mp4 --crf 15
```

## Modifying the Video

### Change Text Content
Edit `src/compositions/UsersTeamsVideo.tsx`:
- Update text in `IntroSection`, `FeatureHighlights`, and `CTASection` components

### Change Colors
Look for:
- `backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'` - Gradient colors
- `#667eea` - Primary brand color
- `#764ba2` - Secondary brand color

### Change Timing
Modify frame calculations:
- `Sequence` component `from` and `durationInFrames` props control when sections appear
- `interpolate()` calls control animations

Example: Change intro duration from 1.5s to 2s:
```tsx
// Change from:
<Sequence from={0} durationInFrames={Math.round(1.5 * fps)}>
// To:
<Sequence from={0} durationInFrames={Math.round(2 * fps)}>
```

### Change Images/Assets
1. Add your image to `dashboard/public/assets/`
2. Import using `staticFile('assets/your-image.png')`
3. Update the `src` attribute

Example:
```tsx
<img src={staticFile('assets/your-new-image.png')} />
```

### Customize Feature Highlights
Edit the `FeatureHighlights` component to add/remove/modify the 4 feature cards:

```tsx
<HighlightCard
  title="Your Feature"
  description="Feature description"
  index={0}
  frame={localFrame}
  fps={fps}
/>
```

## Video Output Quality

Current settings (in `remotion.config.ts`):
- **Codec**: H.264 (widely compatible)
- **Quality**: CRF 18 (high quality, ~50-100MB for 10s video)
- **Resolution**: 1920x1080 (Full HD)
- **Frame Rate**: 30fps
- **Pixel Format**: YUV 4:2:0 (standard for web)

To adjust quality:
- **Better quality**: Lower CRF value (0-18, lower = better)
- **Smaller file**: Higher CRF value (18-28)
- **Faster rendering**: Increase `--concurrency` flag

## Sharing/Using the Video

Once rendered:
1. Move `../Ads/output-video.mp4` to desired location
2. Use in:
   - Email campaigns (Instantly)
   - Landing pages
   - Social media
   - HubSpot campaign materials
   - Demo videos

## Creating More Videos

To create additional videos (e.g., for other features):

1. Create new composition file: `src/compositions/YourFeatureVideo.tsx`
2. Add to `src/Root.tsx`:
   ```tsx
   <Composition
     id="YourFeatureVideo"
     component={YourFeatureVideo}
     durationInFrames={300}
     fps={30}
     width={1920}
     height={1080}
   />
   ```
3. Render: `npx remotion render src/Root.tsx YourFeatureVideo output.mp4`

## Troubleshooting

### FFmpeg not found
```
Error: Could not execute ffmpeg
```
Solution: Install FFmpeg (see Prerequisites)

### Permission denied rendering
```
EACCES: permission denied, open 'output.mp4'
```
Solution: Ensure the output directory exists and is writable

### Out of memory
```
ENOMEM: out of memory
```
Solution: Reduce concurrency: `--concurrency 1`

### Slow rendering
Solution: Increase concurrency: `--concurrency 8` (use half your CPU cores)

## Resources

- [Remotion Documentation](https://www.remotion.dev/docs)
- [Player Component](https://www.remotion.dev/docs/player)
- [Composition API](https://www.remotion.dev/docs/composition)
- [Animations & Interpolation](https://www.remotion.dev/docs/interpolate)
- [Spring Animation](https://www.remotion.dev/docs/spring)

## Next Steps

1. Preview the video: navigate to video preview page
2. Test rendering: `npm run render-video`
3. Customize text, colors, timing as needed
4. Create additional feature videos using the same structure
5. Integrate rendered videos into campaigns
