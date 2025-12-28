
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page } from '../types';
import ChallengeNotificationBadge from './ChallengeNotificationBadge';
import { useUIContext } from '../context/UIContext';

interface HeaderProps {
    onNavigate?: (page: Page) => void;
    currentPage?: Page;
    onOpenTutorial?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onNavigate, currentPage, onOpenTutorial }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const routerNavigate = useNavigate();
    const ui = useUIContext();
    const effectiveCurrentPage = currentPage ?? ui.currentPage;

    const pageToPath: Record<Page, string> = {
        home: '/',
        games: '/games',
        leaderboard: '/leaderboard',
        teams: '/teams',
        'team-games': '/team-games',
        profile: '/profile',
        admin: '/admin',
    };

    // Admin page accessible via direct URL (/admin) only - not shown in navigation
    // Authentication handled on admin page via token
    const navItems: { page: Page; label: string }[] = [
        { page: 'home', label: 'Home' },
        { page: 'games', label: 'The Games' },
        { page: 'leaderboard', label: 'Leaderboard' },
        { page: 'teams', label: 'Teams' },
        { page: 'team-games', label: 'Team Games' },
        { page: 'profile', label: 'Profile' },
    ];

    const handleNavClick = (page: Page) => {
        if (onNavigate) {
            onNavigate(page);
        } else {
            ui.setCurrentPage(page);
            routerNavigate(pageToPath[page]);
        }
        setIsMobileMenuOpen(false);
    };

    return (
        <header className="bg-gray-800 shadow-lg sticky top-0 z-40">
            <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">AI Sourcing Quiz</h1>
                    <p className="text-sm text-cyan-400">Powered by DG & Gemini</p>
                </div>
                <div className="hidden md:flex space-x-2 items-center">
                    {navItems.map(item => (
                          <button
                            key={item.page}
                            onClick={() => handleNavClick(item.page)}
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${effectiveCurrentPage === item.page ? 'bg-cyan-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                        >
                            {item.label}
                        </button>
                    ))}
                    <ChallengeNotificationBadge onClick={() => handleNavClick('profile')} />
                    <button
                        onClick={() => {
                            if (onOpenTutorial) onOpenTutorial();
                            else handleNavClick('home');
                        }}
                        className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200 flex items-center gap-1"
                        title="Open Tutorial"
                    >
                        <span>❓</span>
                        <span>Help</span>
                    </button>
                </div>
                <div className="md:hidden">
                    <button id="mobileMenuButton" aria-label="Open menu" className="text-white focus:outline-none" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
                    </button>
                </div>
            </nav>
            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                 <div className="md:hidden">
                    {navItems.map(item => (
                        <button
                            key={item.page}
                            onClick={() => handleNavClick(item.page)}
                            className={`block w-full text-left py-2 px-4 text-sm  transition-colors duration-200 ${effectiveCurrentPage === item.page ? 'bg-cyan-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                        >
                            {item.label}
                        </button>
                    ))}
                    <div className="py-2 px-4">
                        <ChallengeNotificationBadge onClick={() => handleNavClick('profile')} />
                    </div>
                    <button
                        onClick={() => { if (onOpenTutorial) onOpenTutorial(); else handleNavClick('home'); setIsMobileMenuOpen(false); }}
                        className="block w-full text-left py-2 px-4 text-sm text-gray-300 hover:bg-gray-700 transition-colors duration-200"
                    >
                        ❓ Help
                    </button>
                </div>
            )}
        </header>
    );
};

export default Header;
