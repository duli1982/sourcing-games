import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Page, PublicPlayer } from '../types';
import PublicProfileCard from '../components/PublicProfileCard';
import ActivityTimeline from '../components/ActivityTimeline';
import AchievementsPanel from '../components/AchievementsPanel';
import ChallengeButton from '../components/ChallengeButton';
import ChallengeModal from '../components/ChallengeModal';
import { Spinner } from '../components/Spinner';
import Header from '../components/Header';
import { useUIContext } from '../context/UIContext';

/**
 * PlayerProfilePage - Public player profile view
 * Accessible via /player/[name] routes
 * Shows player stats, achievements, and game history
 */
const PlayerProfilePage: React.FC = () => {
  const { playerName } = useParams<{ playerName: string }>();
  const navigate = useNavigate();
  const { currentPage, setCurrentPage } = useUIContext();
  const [player, setPlayer] = useState<PublicPlayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isChallengeOpen, setIsChallengeOpen] = useState(false);

  useEffect(() => {
    const fetchPlayerProfile = async () => {
      if (!playerName) {
        setError('No player name provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/player?name=${encodeURIComponent(playerName)}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Player not found or profile is private');
          } else {
            const contentType = response.headers.get('content-type') || '';
            const body = contentType.includes('application/json')
              ? JSON.stringify(await response.json())
              : (await response.text()).slice(0, 200);
            setError(`Failed to load player profile (HTTP ${response.status}): ${body}`);
          }
          setPlayer(null);
          setLoading(false);
          return;
        }

        const data = await response.json();
        setPlayer(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching player profile:', err);
        setError('Failed to load player profile');
        setPlayer(null);
        setLoading(false);
      }
    };

    fetchPlayerProfile();
  }, [playerName]);

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
    navigate('/');
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    setCurrentPage('leaderboard');
    navigate('/leaderboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header onNavigate={handleNavigate} currentPage={currentPage} onOpenTutorial={() => {}} />
        <div className="flex items-center justify-center h-screen">
          <Spinner />
        </div>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header onNavigate={handleNavigate} currentPage={currentPage} onOpenTutorial={() => {}} />
        <div className="flex flex-col items-center justify-center h-screen px-4">
          <div className="bg-gray-800 rounded-lg p-8 max-w-md text-center">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h2 className="text-2xl font-bold text-white mb-2">Profile Not Found</h2>
            <p className="text-gray-400 mb-6">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-md transition duration-300"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header onNavigate={handleNavigate} currentPage={currentPage} onOpenTutorial={() => {}} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <button
            onClick={handleBack}
            className="text-cyan-400 hover:text-cyan-300 transition flex items-center gap-2"
          >
            ← Back
          </button>

          <ChallengeButton
            playerName={player.name}
            playerId={player.id}
            onChallengeClick={() => setIsChallengeOpen(true)}
            size="medium"
          />
        </div>

        <ChallengeModal
          isOpen={isChallengeOpen}
          onClose={() => setIsChallengeOpen(false)}
          challengedPlayerName={player.name}
          challengedPlayerId={player.id}
        />

        <PublicProfileCard player={player} />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm mb-1">Total Score</div>
            <div className="text-3xl font-bold text-cyan-400">
              {player.stats.totalPoints.toLocaleString()}
            </div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm mb-1">Games Played</div>
            <div className="text-3xl font-bold text-white">{player.stats.totalGamesPlayed}</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm mb-1">Average Score</div>
            <div className="text-3xl font-bold text-white">{player.stats.averageScore}</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm mb-1">Best Score</div>
            <div className="text-3xl font-bold text-green-400">{player.stats.bestScore}</div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Achievements</h2>
          {player.achievements && player.achievements.length > 0 ? (
            <AchievementsPanel player={player} />
          ) : (
            <div className="bg-gray-800 rounded-lg p-8 text-center">
              <p className="text-gray-400">No achievements unlocked yet</p>
            </div>
          )}
        </div>

        {player.stats.totalGamesPlayed > 0 && <ActivityTimeline stats={player.stats} />}
      </div>
    </div>
  );
};

export default PlayerProfilePage;
