
import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { Player, Page, Toast, ToastType } from '../types';
import { fetchLeaderboard, syncPlayerRecord } from '../services/supabaseService';

interface AppContextType {\n  player: Player | null;\n  setPlayer: (player: Player) => void;\n  leaderboard: Player[];\n  isLoadingLeaderboard: boolean;
  updateScore: (gameScore: number) => void;
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  toasts: Toast[];
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialLeaderboard: Player[] = [];

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [player, setPlayerState] = useState<Player | null>(() => {
      try {
          const item = window.localStorage.getItem('player');
          return item ? JSON.parse(item) : null;
      } catch (error) {
          console.error("Failed to parse player from localStorage", error);
          return null;
      }
  });
  const [leaderboard, setLeaderboard] = useState<Player[]>(() => {
    try {
        const item = window.localStorage.getItem('leaderboard');
        return item ? JSON.parse(item) : initialLeaderboard;
    } catch (error) {
        console.error("Failed to parse leaderboard from localStorage", error);
        return initialLeaderboard;
    }
  });
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    try {
        if(player) {
            window.localStorage.setItem('player', JSON.stringify(player));
        } else {
            window.localStorage.removeItem('player');
        }
    } catch (error) {
        console.error("Failed to save player to localStorage", error);
    }
  }, [player]);

  useEffect(() => {
    try {
        window.localStorage.setItem('leaderboard', JSON.stringify(leaderboard));
    } catch (error) {
        console.error("Failed to save leaderboard to localStorage", error);
    }
  }, [leaderboard]);

  useEffect(() => {
    let isMounted = true;
    const loadLeaderboard = async () => {\n      setIsLoadingLeaderboard(true);
      const remoteLeaderboard = await fetchLeaderboard();
      if (!isMounted || !remoteLeaderboard) return;

      let hasStoredLeaderboard = false;
      try {
        const stored = window.localStorage.getItem('leaderboard');
        if (stored) {
          const parsed = JSON.parse(stored);
          hasStoredLeaderboard = Array.isArray(parsed) && parsed.length > 0;
        }
      } catch (error) {
        console.error('Failed to read stored leaderboard during Supabase sync', error);
      }

      if (remoteLeaderboard.length === 0 && hasStoredLeaderboard) {
        return;
      }

      setLeaderboard(remoteLeaderboard);
    };

    loadLeaderboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const persistPlayerToRemote = useCallback(async (playerToSave: Player, progress?: Record<string, unknown>) => {
    await syncPlayerRecord(playerToSave, progress);
  }, []);


  const setPlayer = (newPlayer: Player) => {
    setPlayerState(newPlayer);
    setLeaderboard(prev => {
        const existingPlayer = prev.find(p => p.name.toLowerCase() === newPlayer.name.toLowerCase());
        if (!existingPlayer) {
            return [...prev, newPlayer].sort((a, b) => b.score - a.score);
        }
        return prev;
    });
    persistPlayerToRemote(newPlayer);
  };
  
  const updateScore = useCallback((gameScore: number) => {
    if (!player) return;

    let newTotalScore = 0;
    setLeaderboard(prev => {
        const updatedLeaderboard = prev.map(p => {
            if (p.name === player.name) {
                newTotalScore = p.score + gameScore;
                return { ...p, score: newTotalScore };
            }
            return p;
        });
        return updatedLeaderboard.sort((a, b) => b.score - a.score);
    });

    setPlayerState(prevPlayer => {
      if(!prevPlayer) return null;
      const updatedPlayer: Player = { ...prevPlayer, score: newTotalScore };
      persistPlayerToRemote(updatedPlayer, {
        lastGameScore: gameScore,
        updatedAt: new Date().toISOString(),
      });
      return updatedPlayer;
    });
  }, [player, persistPlayerToRemote]);

  const addToast = (message: string, type: ToastType) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const value = { player, setPlayer, leaderboard, isLoadingLeaderboard,  updateScore, currentPage, setCurrentPage, toasts, addToast, removeToast };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};



