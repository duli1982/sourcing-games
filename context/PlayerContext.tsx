import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { Player, Attempt, PlayerStats, Achievement } from '../types';
import { fetchPlayerById, fetchPlayerBySessionToken, createPlayer, updatePlayer } from '../services/supabaseService';
import { checkNewAchievements } from '../data/achievements';
import { requestSessionToken } from '../utils/sessionUtils';
import { useUIContext } from './UIContext';
import { useLeaderboardContext } from './LeaderboardContext';

interface PlayerContextType {
    player: Player | null;
    setPlayer: (player: Player) => Promise<void>;
    isLoadingPlayer: boolean;
    updateScore: (gameScore: number) => Promise<void>;
    addAttempt: (attempt: Attempt) => void;
    getPlayerStats: () => PlayerStats;
    unlockAchievement: (achievementId: string) => void;
    refreshPlayer: (player: Player) => void;
    updatePlayerProfile: (profileData: Partial<Pick<Player, 'bio' | 'avatarUrl' | 'profileVisibility' | 'socialLinks'>>) => Promise<void>;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [player, setPlayerState] = useState<Player | null>(null);
    const [isLoadingPlayer, setIsLoadingPlayer] = useState<boolean>(true);

    const { addToast } = useUIContext();
    const { updateLocalLeaderboard } = useLeaderboardContext();

    useEffect(() => {
        try {
            if (player) {
                window.localStorage.setItem('player', JSON.stringify(player));
            } else {
                window.localStorage.removeItem('player');
            }
        } catch (error) {
            console.error("Failed to save player to localStorage", error);
        }
    }, [player]);

    // Load player from Supabase on mount using httpOnly cookie
    useEffect(() => {
        let isMounted = true;

        const loadPlayer = async () => {
            setIsLoadingPlayer(true);

            try {
                // Security: Fetch player using httpOnly cookie (sent automatically)
                // No localStorage access for session token - prevents XSS attacks
                const response = await fetch('/api/player?action=me', {
                    method: 'GET',
                    credentials: 'include', // Send httpOnly cookie
                });

                if (response.ok) {
                    const playerData = await response.json();
                    if (isMounted && playerData) {
                        setPlayerState(playerData);
                        // Cache player data for offline use (but NOT session token)
                        window.localStorage.setItem('playerId', playerData.id);
                        window.localStorage.setItem('player', JSON.stringify(playerData));
                        return; // Exit early on success
                    }
                } else if (response.status === 401 || response.status === 404) {
                    // No valid session - try fallback to playerId (legacy support)
                    const storedPlayerId = window.localStorage.getItem('playerId');
                    if (storedPlayerId) {
                        const playerData = await fetchPlayerById(storedPlayerId);

                        if (isMounted && playerData) {
                            setPlayerState(playerData);
                            window.localStorage.setItem('player', JSON.stringify(playerData));
                            return; // Exit early on success
                        } else if (isMounted && !playerData) {
                            // Player not found in DB, clear localStorage
                            window.localStorage.removeItem('playerId');
                            window.localStorage.removeItem('player');
                        }
                    }

                    // Final fallback to localStorage cache only (for offline use)
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
                // Try offline cache as final fallback
                try {
                    const cachedPlayer = window.localStorage.getItem('player');
                    if (cachedPlayer && isMounted) {
                        const parsedPlayer = JSON.parse(cachedPlayer);
                        setPlayerState(parsedPlayer);
                        console.warn('Loaded player from cache (network error)');
                    }
                } catch (cacheError) {
                    console.error('Failed to load cached player:', cacheError);
                }
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

    // Async setPlayer: Creates player in Supabase first, with session token and optimistic updates
    const setPlayer = useCallback(async (newPlayer: Player) => {
        // Security: Generate session token if not present (sets httpOnly cookie automatically)
        const sessionToken = newPlayer.sessionToken || await requestSessionToken();
        const playerWithToken = { ...newPlayer, sessionToken };

        // Optimistic update (update UI immediately)
        setPlayerState(playerWithToken);
        window.localStorage.setItem('player', JSON.stringify(playerWithToken));

        try {
            let savedPlayer: Player | null;

            if (playerWithToken.id) {
                // Update existing player in Supabase
                savedPlayer = await updatePlayer(playerWithToken);
            } else {
                // Create new player in Supabase with session token
                savedPlayer = await createPlayer(playerWithToken.name, sessionToken, playerWithToken.pinHash || null);
            }

            if (savedPlayer) {
                // Update with server response (includes DB-generated ID)
                setPlayerState(savedPlayer);
                window.localStorage.setItem('playerId', savedPlayer.id!);
                // Security: Do NOT store sessionToken in localStorage - it's in httpOnly cookie
                window.localStorage.setItem('player', JSON.stringify(savedPlayer));

                // Update leaderboard
                updateLocalLeaderboard(savedPlayer);
            } else {
                // Supabase save failed - keep optimistic update but warn
                addToast('Failed to save player data. Changes saved locally only.', 'error');
            }
        } catch (error) {
            console.error('Error saving player:', error);
            addToast('Network error. Changes saved locally only.', 'error');
        }
    }, [addToast, updateLocalLeaderboard]);

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
        updateLocalLeaderboard(optimisticPlayer);

        try {
            // Update Supabase (source of truth)
            const savedPlayer = await updatePlayer(optimisticPlayer);

            if (savedPlayer) {
                // Confirm with server data
                setPlayerState(savedPlayer);
                window.localStorage.setItem('player', JSON.stringify(savedPlayer));

                // Update leaderboard with confirmed data
                updateLocalLeaderboard(savedPlayer);
            } else {
                // Rollback on failure
                const rolledBackPlayer = { ...player, score: oldScore };
                setPlayerState(rolledBackPlayer);
                window.localStorage.setItem('player', JSON.stringify(rolledBackPlayer));
                updateLocalLeaderboard(rolledBackPlayer);
                addToast('Failed to update score. Please try again.', 'error');
            }
        } catch (error) {
            // Rollback on error
            const rolledBackPlayer = { ...player, score: oldScore };
            setPlayerState(rolledBackPlayer);
            window.localStorage.setItem('player', JSON.stringify(rolledBackPlayer));
            updateLocalLeaderboard(rolledBackPlayer);
            console.error('Error updating score:', error);
            addToast('Network error. Score update failed.', 'error');
        }
    }, [player, addToast, updateLocalLeaderboard]);

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
    }, [unlockAchievement, addToast]);

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

    const updatePlayerProfile = useCallback(async (profileData: Partial<Pick<Player, 'bio' | 'avatarUrl' | 'profileVisibility' | 'socialLinks'>>) => {
        if (!player || !player.id) {
            throw new Error('No player to update');
        }

        // Optimistically update local state
        const updatedPlayer = {
            ...player,
            ...profileData,
        };

        setPlayerState(updatedPlayer);
        window.localStorage.setItem('player', JSON.stringify(updatedPlayer));

        // Sync to Supabase
        try {
            const savedPlayer = await updatePlayer(updatedPlayer);
            if (savedPlayer) {
                setPlayerState(savedPlayer);
                window.localStorage.setItem('player', JSON.stringify(savedPlayer));
                updateLocalLeaderboard(savedPlayer);
            }
        } catch (error) {
            // Rollback on failure
            setPlayerState(player);
            window.localStorage.setItem('player', JSON.stringify(player));
            console.error('Error updating player profile:', error);
            throw error;
        }
    }, [player, updateLocalLeaderboard]);

    const refreshPlayer = useCallback((updatedPlayer: Player) => {
        setPlayerState(updatedPlayer);
        window.localStorage.setItem('player', JSON.stringify(updatedPlayer));

        if (updatedPlayer.id) {
            updateLocalLeaderboard(updatedPlayer);
        }
    }, [updateLocalLeaderboard]);

    const value = { player, setPlayer, isLoadingPlayer, updateScore, addAttempt, getPlayerStats, unlockAchievement, refreshPlayer, updatePlayerProfile };

    return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
};

export const usePlayerContext = (): PlayerContextType => {
    const context = useContext(PlayerContext);
    if (context === undefined) {
        throw new Error('usePlayerContext must be used within a PlayerProvider');
    }
    return context;
};
