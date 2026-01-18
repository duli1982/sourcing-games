
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayerContext } from '../context/PlayerContext';
import { useUIContext } from '../context/UIContext';
import { Page } from '../types';

const pageToPath: Record<Page, string> = {
    home: '/',
    games: '/games',
    leaderboard: '/leaderboard',
    teams: '/teams',
    'team-games': '/team-games',
    profile: '/profile',
    admin: '/admin',
};

const HomePage: React.FC = () => {
    const { player } = usePlayerContext();
    const { setCurrentPage } = useUIContext();
    const navigate = useNavigate();

    const handleNavigate = (page: Page) => {
        navigate(pageToPath[page]);
        setCurrentPage(page);
    };

    return (
        <div className="bg-gray-800 rounded-lg p-8 shadow-xl">
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">Welcome, {player?.name}!</h2>
            <p className="text-gray-300 mb-6">You are now part of a global competition for top recruiters. Compete in sourcing games, get feedback from our AI Coach, and climb the leaderboard to prove you're the best.</p>
            <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-gray-700 p-6 rounded-lg">
                    <h3 className="font-bold text-xl mb-2 text-white">Compete & Win</h3>
                    <p className="text-gray-400">Tackle real-world sourcing challenges and earn points for your precision and creativity.</p>
                </div>
                <div className="bg-gray-700 p-6 rounded-lg">
                    <h3 className="font-bold text-xl mb-2 text-white">AI-Powered Feedback</h3>
                    <p className="text-gray-400">Get personalized feedback on your game submissions from our AI Coach, powered by Gemini.</p>
                </div>
                <div className="bg-gray-700 p-6 rounded-lg">
                    <h3 className="font-bold text-xl mb-2 text-white">Climb the Ranks</h3>
                    <p className="text-gray-400">See how you stack up against your peers on a live, global leaderboard.</p>
                </div>
            </div>

            {/* Game Tracks Section */}
            <div className="mt-10 pt-8 border-t border-gray-700">
                <h3 className="text-2xl font-bold text-white mb-6">Choose Your Track</h3>
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Individual Games Track */}
                    <div className="bg-gradient-to-br from-cyan-900/30 to-gray-700 p-6 rounded-lg border-2 border-cyan-600 hover:border-cyan-500 transition">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-4xl">🏆</span>
                            <h4 className="font-bold text-2xl text-cyan-400">Individual Games</h4>
                        </div>
                        <p className="text-gray-300 mb-4">
                            Challenge yourself with daily individual sourcing games. Perfect your Boolean search, outreach,
                            and talent intelligence skills solo.
                        </p>
                        <ul className="text-gray-400 text-sm mb-4 space-y-1">
                            <li>• Daily rotation of sourcing challenges</li>
                            <li>• AI-powered feedback on every submission</li>
                            <li>• Personal score tracking and analytics</li>
                            <li>• Global leaderboard rankings</li>
                        </ul>
                        <button
                            onClick={() => handleNavigate('games')}
                            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-6 rounded-md transition duration-300"
                        >
                            Play Individual Games →
                        </button>
                    </div>

                    {/* Team Games Track */}
                    <div className="bg-gradient-to-br from-purple-900/30 to-gray-700 p-6 rounded-lg border-2 border-purple-600 hover:border-purple-500 transition">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-4xl">👥</span>
                            <h4 className="font-bold text-2xl text-purple-400">Team Games</h4>
                        </div>
                        <p className="text-gray-300 mb-4">
                            Team up for bi-weekly sourcing challenges that demand collaboration. Combine your strengths,
                            learn from teammates, and compete as a unified squad.
                        </p>
                        <ul className="text-gray-400 text-sm mb-4 space-y-1">
                            <li>• Bi-weekly team challenges (15th & end of month)</li>
                            <li>• Collaborative problem-solving with AI feedback</li>
                            <li>• Shared team scores and achievement tracking</li>
                            <li>• Team rankings and competitive leaderboards</li>
                        </ul>
                        <button
                            onClick={() => handleNavigate('team-games')}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-md transition duration-300"
                        >
                            Play Team Games →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage;
