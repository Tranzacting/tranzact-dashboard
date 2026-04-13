import React from 'react';
import { Composition } from 'remotion';
import { UsersTeamsVideo } from './compositions/UsersTeamsVideo';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="UsersTeamsVideo"
        component={UsersTeamsVideo}
        durationInFrames={375}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
    </>
  );
};
