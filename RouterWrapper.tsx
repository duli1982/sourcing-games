import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import PlayerProfilePage from './pages/PlayerProfilePage';
import TeamDetailPage from './pages/TeamDetailPage';
import GamePage from './pages/GamePage';

/**
 * RouterWrapper implements hybrid routing:
 * - React Router handles dynamic routes (/player/:playerName, /team/:teamId)
 * - Main app continues using state-based navigation for home/games/leaderboard/profile/teams/admin
 *
 * This approach minimizes refactoring while enabling URL-based profile and team pages.
 */
const RouterWrapper: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Dynamic route for player profiles */}
        <Route path="/player/:playerName" element={<PlayerProfilePage />} />

        {/* Dynamic route for team details */}
        <Route path="/team/:teamId" element={<TeamDetailPage />} />

        {/* Dynamic route for game pages with discussion */}
        <Route path="/games/:gameId" element={<GamePage />} />

        {/* Catch-all route for main app (state-based navigation) */}
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  );
};

export default RouterWrapper;
