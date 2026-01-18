import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Challenge } from '../types';
import { fetchPlayerChallenges } from '../services/supabaseService';
import { usePlayerContext } from './PlayerContext';
import { logger } from '../utils/clientLogger';

interface ChallengeContextType {
    challenges: Challenge[];
    loading: boolean;
    pendingChallengesCount: number;
    refreshChallenges: () => Promise<void>;
}

const ChallengeContext = createContext<ChallengeContextType | undefined>(undefined);

export const ChallengeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { player } = usePlayerContext();
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [loading, setLoading] = useState(false);

    const refreshChallenges = async () => {
        if (!player) {
            setChallenges([]);
            return;
        }

        setLoading(true);
        try {
            const data = await fetchPlayerChallenges(player.id);
            setChallenges(data || []);
        } catch (error) {
            logger.error('Error fetching challenges:', error);
            setChallenges([]);
        } finally {
            setLoading(false);
        }
    };

    // Calculate pending challenges count (challenges sent TO this player)
    const pendingChallengesCount = challenges.filter(
        c => c.challenged_id === player?.id && c.status === 'pending'
    ).length;

    // Fetch challenges when player changes
    useEffect(() => {
        if (player) {
            refreshChallenges();
        } else {
            setChallenges([]);
        }
    }, [player?.id]);

    return (
        <ChallengeContext.Provider
            value={{
                challenges,
                loading,
                pendingChallengesCount,
                refreshChallenges
            }}
        >
            {children}
        </ChallengeContext.Provider>
    );
};

export const useChallenges = (): ChallengeContextType => {
    const context = useContext(ChallengeContext);
    if (!context) {
        throw new Error('useChallenges must be used within a ChallengeProvider');
    }
    return context;
};
