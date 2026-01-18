import React from 'react';
import type { PlayerStats } from '../types';

interface ActivityTimelineProps {
  stats: PlayerStats;
}

/**
 * ActivityTimeline - Displays player's game breakdown and recent activity
 * Shows attempts and best scores for each game played
 */
const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ stats }) => {
  // Sort games by best score descending
  const sortedGames = [...stats.gameBreakdown].sort((a, b) => b.bestScore - a.bestScore);

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Game Performance</h2>

      {sortedGames.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No games played yet</p>
      ) : (
        <div className="space-y-3">
          {sortedGames.map((game) => (
            <div
              key={game.gameId}
              className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-white font-semibold">{game.gameTitle}</h3>
                  <p className="text-sm text-gray-400">
                    {game.attempts} {game.attempts === 1 ? 'attempt' : 'attempts'}
                  </p>
                </div>

                {/* Score Badge */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm text-gray-400">Best Score</div>
                    <div className={`text-2xl font-bold ${
                      game.bestScore >= 85
                        ? 'text-green-400'
                        : game.bestScore >= 60
                        ? 'text-cyan-400'
                        : 'text-yellow-400'
                    }`}>
                      {game.bestScore}
                    </div>
                  </div>

                  {/* Score indicator */}
                  <div className="relative w-16 h-16">
                    <svg className="transform -rotate-90 w-16 h-16">
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="transparent"
                        className="text-gray-600"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="transparent"
                        strokeDasharray={`${2 * Math.PI * 28}`}
                        strokeDashoffset={`${2 * Math.PI * 28 * (1 - game.bestScore / 100)}`}
                        className={
                          game.bestScore >= 85
                            ? 'text-green-400'
                            : game.bestScore >= 60
                            ? 'text-cyan-400'
                            : 'text-yellow-400'
                        }
                      />
                    </svg>
                    <div className="absolute top-0 left-0 w-16 h-16 flex items-center justify-center">
                      <span className="text-xs text-white font-bold">{game.bestScore}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityTimeline;
