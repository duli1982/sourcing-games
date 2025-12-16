import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Player } from '../types';
import { fetchLeaderboard } from '../services/supabaseService';

interface LeaderboardContextType {
    leaderboard: Player[];
    isLoadingLeaderboard: boolean;
    refreshLeaderboard: () => Promise<void>;
    updateLocalLeaderboard: (player: Player) => void;
}

const LeaderboardContext = createContext<LeaderboardContextType | undefined>(undefined);

const initialLeaderboard: Player[] = [];

export const LeaderboardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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

    useEffect(() => {
        try {
            window.localStorage.setItem('leaderboard', JSON.stringify(leaderboard));
        } catch (error) {
            console.error("Failed to save leaderboard to localStorage", error);
        }
    }, [leaderboard]);

    const refreshLeaderboard = async () => {
        setIsLoadingLeaderboard(true);
        const remoteLeaderboard = await fetchLeaderboard();
        if (remoteLeaderboard) {
            setLeaderboard(remoteLeaderboard);
        }
        setIsLoadingLeaderboard(false);
    };

    const updateLocalLeaderboard = (updatedPlayer: Player) => {
        setLeaderboard(prev => {
            const index = prev.findIndex(p => p.id === updatedPlayer.id);
            if (index === -1) {
                return [...prev, updatedPlayer].sort((a, b) => b.score - a.score);
            }
            const copy = [...prev];
            copy[index] = { ...copy[index], ...updatedPlayer };
            return copy.sort((a, b) => b.score - a.score);
        });
    };

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

    return (
        <LeaderboardContext.Provider value={{ leaderboard, isLoadingLeaderboard, refreshLeaderboard, updateLocalLeaderboard }}>
            {children}
        </LeaderboardContext.Provider>
    );
};

export const useLeaderboardContext = (): LeaderboardContextType => {
    const context = useContext(LeaderboardContext);
    if (context === undefined) {
        throw new Error('useLeaderboardContext must be used within a LeaderboardProvider');
    }
    return context;
};
