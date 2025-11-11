
import React, { useState, useEffect } from 'react';
import { useAppContext } from './context/AppContext';
import NameModal from './components/NameModal';
import OnboardingTutorial from './components/OnboardingTutorial';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import GamesPage from './pages/GamesPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import Toast from './components/Toast';
import { Page } from './types';

const TUTORIAL_COMPLETED_KEY = 'ai-sourcing-tutorial-completed';

const App: React.FC = () => {
  const { player, currentPage, setCurrentPage, toasts } = useAppContext();
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

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
  };

  const handleTutorialComplete = () => {
    localStorage.setItem(TUTORIAL_COMPLETED_KEY, 'true');
    setShowTutorial(false);
  };

  const handleOpenTutorial = () => {
    setShowTutorial(true);
  };

  if (!player) {
    return <NameModal />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header onNavigate={handleNavigate} currentPage={currentPage} onOpenTutorial={handleOpenTutorial} />
      <main className="container mx-auto p-6">
        <div className="relative">
          {/* By applying the 'active' class, we can control visibility and transitions via CSS */}
          <div className={`page ${currentPage === 'home' ? 'active' : ''}`}><HomePage /></div>
          <div className={`page ${currentPage === 'games' ? 'active' : ''}`}><GamesPage /></div>
          <div className={`page ${currentPage === 'leaderboard' ? 'active' : ''}`}><LeaderboardPage /></div>
          <div className={`page ${currentPage === 'profile' ? 'active' : ''}`}><ProfilePage /></div>
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
