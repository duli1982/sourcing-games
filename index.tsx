
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { UIProvider } from './context/UIContext';
import { LeaderboardProvider } from './context/LeaderboardContext';
import { PlayerProvider } from './context/PlayerContext';

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
          <App />
        </PlayerProvider>
      </LeaderboardProvider>
    </UIProvider>
  </React.StrictMode>
);
