
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePlayerContext } from './context/PlayerContext';
import { useUIContext } from './context/UIContext';
import NameModal from './components/NameModal';
import OnboardingTutorial from './components/OnboardingTutorial';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import GamesPage from './pages/GamesPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import TeamsPage from './pages/TeamsPage';
import TeamGamesPage from './pages/TeamGamesPage';
import AdminPage from './pages/AdminPage';
import Toast from './components/Toast';
import { Page } from './types';

const TUTORIAL_COMPLETED_KEY = 'ai-sourcing-tutorial-completed';

const pageToPath: Record<Page, string> = {
  home: '/',
  games: '/games',
  leaderboard: '/leaderboard',
  teams: '/teams',
  'team-games': '/team-games',
  profile: '/profile',
  admin: '/admin',
};

const pathToPage = (pathname: string): Page | null => {
  switch (pathname) {
    case '/':
      return 'home';
    case '/games':
      return 'games';
    case '/leaderboard':
      return 'leaderboard';
    case '/teams':
      return 'teams';
    case '/team-games':
      return 'team-games';
    case '/profile':
      return 'profile';
    case '/admin':
      return 'admin';
    default:
      return null;
  }
};

const App: React.FC = () => {
  const { player, isLoadingPlayer } = usePlayerContext();
  const { currentPage, setCurrentPage, toasts } = useUIContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [showTutorial, setShowTutorial] = useState(false);

  // Check if user has completed tutorial
  useEffect(() => {
    if (player) {
      const tutorialCompleted = localStorage.getItem(TUTORIAL_COMPLETED_KEY);
      if (!tutorialCompleted) {
        setShowTutorial(true);
      }
    }
  }, [player]);

  // Admin access via URL parameter (?admin=true)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === 'true') {
      setCurrentPage('admin');
      navigate(pageToPath.admin);
      // Clean URL after navigation (optional - removes ?admin=true from URL)
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [navigate, setCurrentPage]);

  // Sync state-based navigation with URL paths
  useEffect(() => {
    const pageFromPath = pathToPage(location.pathname);
    if (pageFromPath && pageFromPath !== currentPage) {
      setCurrentPage(pageFromPath);
    }
  }, [location.pathname, setCurrentPage]);

  // Admin access via keyboard shortcut (Ctrl+Shift+A)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl+Shift+A (Windows/Linux) or Cmd+Shift+A (Mac)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setCurrentPage('admin');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [setCurrentPage]);

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
    navigate(pageToPath[page]);
  };

  const handleTutorialComplete = () => {
    localStorage.setItem(TUTORIAL_COMPLETED_KEY, 'true');
    setShowTutorial(false);
  };

  const handleOpenTutorial = () => {
    setShowTutorial(true);
  };

  // Show loading screen while fetching player from Supabase
  if (isLoadingPlayer) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-gray-400 text-lg">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!player) {
    return <NameModal />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header onNavigate={handleNavigate} currentPage={currentPage} onOpenTutorial={handleOpenTutorial} />
      <main className="container mx-auto p-6">
        <div className="pages-container">
          {/* By applying the 'active' class, we can control visibility and transitions via CSS */}
          <div className={`page ${currentPage === 'home' ? 'active' : ''}`}><HomePage /></div>
          <div className={`page ${currentPage === 'games' ? 'active' : ''}`}><GamesPage /></div>
          <div className={`page ${currentPage === 'leaderboard' ? 'active' : ''}`}><LeaderboardPage /></div>
          <div className={`page ${currentPage === 'teams' ? 'active' : ''}`}><TeamsPage /></div>
          <div className={`page ${currentPage === 'team-games' ? 'active' : ''}`}><TeamGamesPage /></div>
          <div className={`page ${currentPage === 'profile' ? 'active' : ''}`}><ProfilePage /></div>
          <div className={`page ${currentPage === 'admin' ? 'active' : ''}`}><AdminPage /></div>
        </div>
      </main>
      <div className="fixed top-5 right-5 z-50 space-y-2">
        {toasts.map((toast) => (
          <Toast key={toast.id} message={toast.message} type={toast.type} id={toast.id} />
        ))}
      </div>

      {/* Onboarding Tutorial */}
      {showTutorial && <OnboardingTutorial onComplete={handleTutorialComplete} />}
    </div>
  );
};

export default App;
