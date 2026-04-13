# Remotion Video Generator - Quick Start

## What's Been Created

A **10-second ad video** explaining the **Users & Teams** feature using Remotion.

### Files Added
- `src/compositions/UsersTeamsVideo.tsx` - Main video composition
- `src/Root.tsx` - Remotion composition root
- `src/pages/VideoPreview.tsx` - Video preview page component
- `remotion.config.ts` - Remotion configuration
- `public/assets/` - Asset folder with UI screenshot
- `REMOTION_SETUP.md` - Detailed documentation

### Integration
- Added "Video Generator" card to homepage dashboard
- New route/view in the app navigation
- Click the card to preview the video

## Quick Links

**View in Dashboard:**
1. Start the dev server: `npm run dev`
2. Navigate to dashboard home page
3. Click "Video Generator" card

**Preview Video:**
- Opens in browser with playback controls at `/video-preview`

**Generate MP4 File:**
```bash
cd dashboard
npm run render-video
# Output: ../Ads/output-video.mp4
```

## Video Content

**10 seconds breakdown:**
- **0-1.5s**: "Collaborate with Your Team" intro with gradient
- **1.5-4.5s**: Shows the team management interface screenshot
- **4.5-7.5s**: 4 feature highlights (staggered animations):
  - Add Team Members
  - Assign Roles
  - Manage Permissions
  - Team Collaboration
- **7.5-10s**: "Start Collaborating Today" CTA with button

## Customization

### Change Video Text
Edit `src/compositions/UsersTeamsVideo.tsx`:
- Update text in component functions
- Change colors, fonts, animations

### Change Duration
Modify frame durations in `Sequence` components

### Add New Videos
1. Create new file: `src/compositions/YourVideo.tsx`
2. Add to `src/Root.tsx`
3. Render: `npx remotion render src/Root.tsx YourVideo output.mp4`

## Prerequisites to Render

Need FFmpeg installed:
```bash
# macOS
brew install ffmpeg

# Linux
sudo apt-get install ffmpeg

# Windows
choco install ffmpeg
```

## Next Steps

1. ✅ Setup complete
2. Preview the video in dashboard
3. Test rendering to MP4 (requires FFmpeg)
4. Customize text/colors as needed
5. Use in campaigns (Instantly, email, social)

## Support

See `REMOTION_SETUP.md` for:
- Detailed configuration
- Troubleshooting
- Advanced rendering options
- Creating more videos
