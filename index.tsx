
import React from 'react';
import ReactDOM from 'react-dom/client';
import RouterWrapper from './RouterWrapper';
import { UIProvider } from './context/UIContext';
import { LeaderboardProvider } from './context/LeaderboardContext';
import { PlayerProvider } from './context/PlayerContext';
import { TeamProvider } from './context/TeamContext';
import { ChallengeProvider } from './context/ChallengeContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <UIProvider>
      <LeaderboardProvider>
        <PlayerProvider>
          <ChallengeProvider>
            <TeamProvider>
              <RouterWrapper />
            </TeamProvider>
          </ChallengeProvider>
        </PlayerProvider>
      </LeaderboardProvider>
    </UIProvider>
  </React.StrictMode>
);
