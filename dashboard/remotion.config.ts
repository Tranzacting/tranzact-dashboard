import { Config } from 'remotion';

Config.setFrameRate(30);
Config.setHeight(1080);
Config.setWidth(1920);
Config.setDurationInFrames(375); // 12.5 seconds at 30fps
Config.setCodec('h264');
Config.setPixelFormat('yuv420p');
Config.setCrf(18); // Quality: 0-51, lower is better quality
Config.setImageSequenceFramePadding(5);
