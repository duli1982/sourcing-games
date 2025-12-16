
import React, { useState } from 'react';
import { usePlayerContext } from '../context/PlayerContext';
import AchievementsPanel from '../components/AchievementsPanel';
import { formatFeedback } from '../utils/feedbackFormatter';
import '../styles/feedback.css';

const ProfilePage: React.FC = () => {
    const { player, getPlayerStats } = usePlayerContext();
    const [showHistory, setShowHistory] = useState(false);
    const [expandedFeedback, setExpandedFeedback] = useState<number | null>(null);

    if (!player) {
        return (
            <div className="bg-gray-800 rounded-lg p-8 shadow-xl">
                <p className="text-gray-400">No player data available.</p>
            </div>
        );
    }

    const stats = getPlayerStats();
    const recentAttempts = player.attempts?.slice(0, 10) || [];

    return (
        <div>
            <h2 className="text-3xl font-bold text-cyan-400 mb-6">Player Profile</h2>

            {/* Player Info Card */}
            <div className="bg-gray-800 rounded-lg p-8 shadow-xl mb-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-2xl font-bold text-white">{player.name}</h3>
                        <p className="text-gray-400 text-sm">Joined the AI Sourcing League</p>
                    </div>
                    <div className="text-right">
                        <p className="text-4xl font-bold text-cyan-400">{player.score}</p>
                        <p className="text-gray-400 text-sm">Total Points</p>
                    </div>
                </div>

                {/* Statistics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-700 rounded-lg p-4">
                        <p className="text-gray-400 text-sm mb-1">Games Played</p>
                        <p className="text-2xl font-bold text-white">{stats.totalGamesPlayed}</p>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-4">
                        <p className="text-gray-400 text-sm mb-1">Average Score</p>
                        <p className="text-2xl font-bold text-cyan-400">{stats.averageScore}/100</p>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-4">
                        <p className="text-gray-400 text-sm mb-1">Best Score</p>
                        <p className="text-2xl font-bold text-green-400">{stats.bestScore}/100</p>
                    </div>
                </div>
            </div>

            {/* Achievements Panel */}
            <div className="mb-6">
                <AchievementsPanel player={player} />
            </div>

            {/* Game Breakdown */}
            {stats.gameBreakdown.length > 0 && (
                <div className="bg-gray-800 rounded-lg p-8 shadow-xl mb-6">
                    <h3 className="text-xl font-bold text-cyan-400 mb-4">Performance by Game</h3>
                    <div className="space-y-4">
                        {stats.gameBreakdown.map((gameStats) => (
                            <div key={gameStats.gameId} className="bg-gray-700 rounded-lg p-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h4 className="font-bold text-white">{gameStats.gameTitle}</h4>
                                        <p className="text-sm text-gray-400">{gameStats.attempts} attempt{gameStats.attempts !== 1 ? 's' : ''}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-cyan-400">{gameStats.bestScore}</p>
                                        <p className="text-xs text-gray-400">Best Score</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Attempts History */}
            {recentAttempts.length > 0 && (
                <div className="bg-gray-800 rounded-lg p-8 shadow-xl">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-cyan-400">Recent Attempts</h3>
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className="text-sm text-cyan-400 hover:text-cyan-300 transition"
                        >
                            {showHistory ? 'Hide Details' : 'Show Details'}
                        </button>
                    </div>

                    {showHistory ? (
                        <div className="space-y-4">
                            {recentAttempts.map((attempt, index) => {
                                const isFeedbackExpanded = expandedFeedback === index;
                                const formattedFeedback = attempt.feedback ? formatFeedback(attempt.feedback, attempt.score) : null;

                                return (
                                    <div key={index} className="bg-gray-700 rounded-lg p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex-1">
                                                <h4 className="font-bold text-white">{attempt.gameTitle}</h4>
                                                <p className="text-xs text-gray-400">
                                                    {new Date(attempt.ts).toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-bold text-cyan-400">{attempt.score}/100</p>
                                            </div>
                                        </div>

                                        {/* Submission */}
                                        <div className="mt-2 p-3 bg-gray-800 rounded text-sm text-gray-300">
                                            <p className="font-semibold text-gray-400 mb-1">Your Submission:</p>
                                            <p className="italic">{attempt.submission}</p>
                                        </div>

                                        {/* AI Feedback Section */}
                                        {formattedFeedback && (
                                            <div className="mt-3">
                                                <button
                                                    onClick={() => setExpandedFeedback(isFeedbackExpanded ? null : index)}
                                                    className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-750 rounded transition-colors text-left"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-cyan-400 text-lg">🤖</span>
                                                        <span className="font-semibold text-cyan-400">AI Coach Feedback</span>
                                                    </div>
                                                    <span className="text-gray-400 text-sm">
                                                        {isFeedbackExpanded ? '▼ Hide' : '▶ Show'}
                                                    </span>
                                                </button>

                                                {isFeedbackExpanded && (
                                                    <div className="mt-3 feedback-content bg-gray-800 p-4 rounded-lg border border-gray-600">
                                                        <div dangerouslySetInnerHTML={{ __html: formattedFeedback }} />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-gray-400 text-sm">
                            <p>You've made {recentAttempts.length} recent attempts. Click "Show Details" to see your submission history and AI feedback.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Empty State */}
            {stats.totalGamesPlayed === 0 && (
                <div className="bg-gray-800 rounded-lg p-12 shadow-xl text-center">
                    <p className="text-gray-400 text-lg mb-4">You haven't played any games yet!</p>
                    <p className="text-gray-500">Head over to the Games page to get started and start building your profile.</p>
                </div>
            )}
        </div>
    );
};

export default ProfilePage;
