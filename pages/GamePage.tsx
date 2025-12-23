import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { games } from '../data/games';
import GameCard from '../components/GameCard';
import CommentSection from '../components/CommentSection';

type TabType = 'play' | 'discussion';

const GamePage: React.FC = () => {
    const { gameId } = useParams<{ gameId: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabType>('play');

    // Find the game by ID
    const game = games.find(g => g.id === gameId);

    if (!game) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="bg-gray-800 rounded-lg p-12 shadow-xl text-center">
                    <svg className="w-16 h-16 mx-auto text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h2 className="text-2xl font-bold text-gray-300 mb-4">Game Not Found</h2>
                    <p className="text-gray-400 mb-6">The game you're looking for doesn't exist.</p>
                    <button
                        onClick={() => navigate('/games')}
                        className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
                    >
                        Back to Games
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => navigate('/games')}
                    className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors flex items-center gap-1 mb-4"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Games
                </button>

                <h1 className="text-3xl font-bold text-white mb-2">{game.title}</h1>
                <p className="text-gray-400">{game.description}</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6 border-b border-gray-700">
                <button
                    onClick={() => setActiveTab('play')}
                    className={`px-6 py-3 font-semibold transition-all border-b-2 ${
                        activeTab === 'play'
                            ? 'border-cyan-500 text-cyan-400'
                            : 'border-transparent text-gray-400 hover:text-gray-300'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Play Game
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('discussion')}
                    className={`px-6 py-3 font-semibold transition-all border-b-2 ${
                        activeTab === 'discussion'
                            ? 'border-cyan-500 text-cyan-400'
                            : 'border-transparent text-gray-400 hover:text-gray-300'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Discussion
                    </div>
                </button>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {activeTab === 'play' && (
                    <GameCard game={game} mode="challenge" />
                )}

                {activeTab === 'discussion' && (
                    <CommentSection gameId={game.id} />
                )}
            </div>
        </div>
    );
};

export default GamePage;
