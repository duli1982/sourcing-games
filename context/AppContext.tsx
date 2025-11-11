
import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { Player, Page, Toast, ToastType, Attempt, PlayerStats, Achievement } from '../types';
import { fetchLeaderboard, fetchPlayerById, createPlayer, updatePlayer } from '../services/supabaseService';
import { checkNewAchievements } from '../data/achievements';

interface AppContextType {
  player: Player | null;
  setPlayer: (player: Player) => Promise<void>;
  isLoadingPlayer: boolean;
  leaderboard: Player[];
  isLoadingLeaderboard: boolean;
  updateScore: (gameScore: number) => Promise<void>;
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  toasts: Toast[];
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: number) => void;
  addAttempt: (attempt: Attempt) => void;
  getPlayerStats: () => PlayerStats;
  unlockAchievement: (achievementId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialLeaderboard: Player[] = [];

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [player, setPlayerState] = useState<Player | null>(null);
  const [isLoadingPlayer, setIsLoadingPlayer] = useState<boolean>(true);
  const [leaderboard, setLeaderboard] = useState<Player[]>(() => {
    try {
        const item = window.localStorage.getItem('leaderboard');
        return item ? JSON.parse(item) : initialLeaderboard;
    } catch (error) {
        console.error("Failed to parse leaderboard from localStorage", error);
        return initialLeaderboard;
    }
  });
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState<boolean>(true);
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

  // Load player from Supabase on mount (Hybrid: Supabase primary, localStorage cache)
  useEffect(() => {
    let isMounted = true;

    const loadPlayer = async () => {
      setIsLoadingPlayer(true);

      try {
        // 1. Try to get stored player ID from localStorage
        const storedPlayerId = window.localStorage.getItem('playerId');

        if (storedPlayerId) {
          // 2. Fetch player from Supabase by ID (source of truth)
          const playerData = await fetchPlayerById(storedPlayerId);

          if (isMounted && playerData) {
            setPlayerState(playerData);
            // Update localStorage cache
            window.localStorage.setItem('player', JSON.stringify(playerData));
          } else if (isMounted && !playerData) {
            // Player not found in DB, clear localStorage
            window.localStorage.removeItem('playerId');
            window.localStorage.removeItem('player');
          }
        } else {
          // 3. Fallback to localStorage cache only (for offline use)
          try {
            const cachedPlayer = window.localStorage.getItem('player');
            if (cachedPlayer && isMounted) {
              const parsedPlayer = JSON.parse(cachedPlayer);
              setPlayerState(parsedPlayer);
              console.warn('Loaded player from cache (offline mode)');
            }
          } catch (error) {
            console.error('Failed to parse cached player:', error);
          }
        }
      } catch (error) {
        console.error('Error loading player:', error);
      } finally {
        if (isMounted) {
          setIsLoadingPlayer(false);
        }
      }
    };

    loadPlayer();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadLeaderboard = async () => {
      setIsLoadingLeaderboard(true);
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
        setIsLoadingLeaderboard(false);
        return;
      }

      setLeaderboard(remoteLeaderboard);
      setIsLoadingLeaderboard(false);
    };

    loadLeaderboard();

    return () => {
      isMounted = false;
    };
  }, []);

  // Async setPlayer: Creates player in Supabase first, with optimistic updates
  const setPlayer = useCallback(async (newPlayer: Player) => {
    try {
      let savedPlayer: Player | null;

      if (newPlayer.id) {
        // Update existing player in Supabase
        // Use optimistic update for existing players (they already have a valid ID)
        setPlayerState(newPlayer);
        window.localStorage.setItem('player', JSON.stringify(newPlayer));

        savedPlayer = await updatePlayer(newPlayer);

        if (savedPlayer) {
          // Confirm with server response
          setPlayerState(savedPlayer);
          window.localStorage.setItem('player', JSON.stringify(savedPlayer));
        } else {
          // Rollback on failure
          addToast('Failed to update player data. Please try again.', 'error');
        }
      } else {
        // Create new player in Supabase
        // DO NOT use optimistic update - wait for DB confirmation with ID first
        savedPlayer = await createPlayer(newPlayer.name);

        if (!savedPlayer) {
          // Database save failed - do not set player state
          addToast('Failed to create account. Please try again.', 'error');
          throw new Error('Failed to create player in database');
        }

        // Now that we have a player with ID from database, set the state
        setPlayerState(savedPlayer);
        window.localStorage.setItem('playerId', savedPlayer.id!);
        window.localStorage.setItem('player', JSON.stringify(savedPlayer));
      }

      if (savedPlayer) {
        // Update leaderboard
        setLeaderboard(prev => {
          const existingIndex = prev.findIndex(p => p.id === savedPlayer!.id || p.name.toLowerCase() === savedPlayer!.name.toLowerCase());
          if (existingIndex >= 0) {
            // Update existing player
            const updated = [...prev];
            updated[existingIndex] = savedPlayer!;
            return updated.sort((a, b) => b.score - a.score);
          } else {
            // Add new player
            return [...prev, savedPlayer!].sort((a, b) => b.score - a.score);
          }
        });
      }
    } catch (error) {
      console.error('Error saving player:', error);
      addToast('Failed to create account. Please try again.', 'error');
      throw error; // Re-throw so NameModal can handle it
    }
  }, []);
  
  // Async updateScore: Optimistic update with rollback on failure
  const updateScore = useCallback(async (gameScore: number) => {
    if (!player || !player.id) {
      addToast('Player not loaded. Please refresh the page.', 'error');
      return;
    }

    const oldScore = player.score;
    const newScore = oldScore + gameScore;

    // Optimistic update
    const optimisticPlayer = { ...player, score: newScore };
    setPlayerState(optimisticPlayer);
    window.localStorage.setItem('player', JSON.stringify(optimisticPlayer));

    // Optimistic leaderboard update
    setLeaderboard(prev =>
      prev.map(p => p.id === player.id ? optimisticPlayer : p)
        .sort((a, b) => b.score - a.score)
    );

    try {
      // Update Supabase (source of truth)
      const savedPlayer = await updatePlayer(optimisticPlayer);

      if (savedPlayer) {
        // Confirm with server data
        setPlayerState(savedPlayer);
        window.localStorage.setItem('player', JSON.stringify(savedPlayer));

        // Update leaderboard with confirmed data
        setLeaderboard(prev =>
          prev.map(p => p.id === savedPlayer.id ? savedPlayer : p)
            .sort((a, b) => b.score - a.score)
        );
      } else {
        // Rollback on failure
        const rolledBackPlayer = { ...player, score: oldScore };
        setPlayerState(rolledBackPlayer);
        window.localStorage.setItem('player', JSON.stringify(rolledBackPlayer));
        setLeaderboard(prev =>
          prev.map(p => p.id === player.id ? rolledBackPlayer : p)
            .sort((a, b) => b.score - a.score)
        );
        addToast('Failed to update score. Please try again.', 'error');
      }
    } catch (error) {
      // Rollback on error
      const rolledBackPlayer = { ...player, score: oldScore };
      setPlayerState(rolledBackPlayer);
      window.localStorage.setItem('player', JSON.stringify(rolledBackPlayer));
      setLeaderboard(prev =>
        prev.map(p => p.id === player.id ? rolledBackPlayer : p)
          .sort((a, b) => b.score - a.score)
      );
      console.error('Error updating score:', error);
      addToast('Network error. Score update failed.', 'error');
    }
  }, [player]);

  const addToast = (message: string, type: ToastType) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
    };

  const unlockAchievement = useCallback((achievementId: string) => {
    setPlayerState(prevPlayer => {
      if (!prevPlayer) return null;

      // Check if achievement is already unlocked
      if (prevPlayer.achievements?.some(a => a.id === achievementId)) {
        return prevPlayer;
      }

      // Find the achievement definition
      const achievementDef = checkNewAchievements(prevPlayer).find(a => a.id === achievementId);
      if (!achievementDef) return prevPlayer;

      const newAchievement: Achievement = {
        id: achievementDef.id,
        name: achievementDef.name,
        description: achievementDef.description,
        icon: achievementDef.icon,
        category: achievementDef.category,
        unlockedAt: new Date().toISOString(),
      };

      const updatedAchievements = [...(prevPlayer.achievements || []), newAchievement];
      const updatedPlayer = { ...prevPlayer, achievements: updatedAchievements };

      // Sync to Supabase (async, non-blocking)
      if (updatedPlayer.id) {
        updatePlayer(updatedPlayer).then(savedPlayer => {
          if (savedPlayer) {
            window.localStorage.setItem('player', JSON.stringify(savedPlayer));
          }
        }).catch(error => {
          console.error('Failed to sync achievement to Supabase:', error);
        });
      }

      // Update localStorage immediately
      window.localStorage.setItem('player', JSON.stringify(updatedPlayer));
      return updatedPlayer;
    });
  }, []);

  const addAttempt = useCallback((attempt: Attempt) => {
    setPlayerState(prevPlayer => {
      if (!prevPlayer) return null;
      const updatedAttempts = [...(prevPlayer.attempts || []), attempt];
      const updatedPlayer = { ...prevPlayer, attempts: updatedAttempts };

      // Check for new achievements
      const newAchievements = checkNewAchievements(updatedPlayer);
      if (newAchievements.length > 0) {
        newAchievements.forEach(achievement => {
          addToast(`🎉 Achievement Unlocked: ${achievement.name}!`, 'success');

          // Unlock the achievement
          setTimeout(() => {
            unlockAchievement(achievement.id);
          }, 100);
        });
      }

      // Sync to Supabase (async, non-blocking)
      if (updatedPlayer.id) {
        updatePlayer(updatedPlayer).then(savedPlayer => {
          if (savedPlayer) {
            window.localStorage.setItem('player', JSON.stringify(savedPlayer));
          }
        }).catch(error => {
          console.error('Failed to sync attempt to Supabase:', error);
        });
      }

      // Update localStorage immediately
      window.localStorage.setItem('player', JSON.stringify(updatedPlayer));
      return updatedPlayer;
    });
  }, [unlockAchievement]);

  const getPlayerStats = useCallback((): PlayerStats => {
    if (!player || !player.attempts || player.attempts.length === 0) {
      return {
        totalGamesPlayed: 0,
        averageScore: 0,
        bestScore: 0,
        totalPoints: player?.score || 0,
        gameBreakdown: [],
      };
    }

    const attempts = player.attempts;
    const totalGamesPlayed = attempts.length;
    const totalScoreFromAttempts = attempts.reduce((sum, a) => sum + a.score, 0);
    const averageScore = Math.round(totalScoreFromAttempts / totalGamesPlayed);
    const bestScore = Math.max(...attempts.map(a => a.score));

    const gameMap = new Map<string, { gameId: string; gameTitle: string; attempts: number; bestScore: number }>();

    attempts.forEach(attempt => {
      const existing = gameMap.get(attempt.gameId);
      if (existing) {
        existing.attempts += 1;
        existing.bestScore = Math.max(existing.bestScore, attempt.score);
      } else {
        gameMap.set(attempt.gameId, {
          gameId: attempt.gameId,
          gameTitle: attempt.gameTitle,
          attempts: 1,
          bestScore: attempt.score,
        });
      }
    });

    const gameBreakdown = Array.from(gameMap.values());

    return {
      totalGamesPlayed,
      averageScore,
      bestScore,
      totalPoints: player.score,
      gameBreakdown,
    };
  }, [player]);

  const value = { player, setPlayer, isLoadingPlayer, leaderboard, isLoadingLeaderboard, updateScore, currentPage, setCurrentPage, toasts, addToast, removeToast, addAttempt, getPlayerStats, unlockAchievement };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
    };

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
    };




















