import React, { useState } from 'react';
import { usePlayerContext } from '../context/PlayerContext';

interface ChallengeButtonProps {
    playerName: string;
    playerId: string;
    onChallengeClick: () => void;
    size?: 'small' | 'medium' | 'large';
}

const ChallengeButton: React.FC<ChallengeButtonProps> = ({
    playerName,
    playerId,
    onChallengeClick,
    size = 'medium'
}) => {
    const { player } = usePlayerContext();
    const [isHovered, setIsHovered] = useState(false);

    // Don't show if viewing own profile
    if (!player || player.id === playerId) {
        return null;
    }

    const sizeClasses = {
        small: 'px-2 py-1 text-xs',
        medium: 'px-3 py-2 text-sm',
        large: 'px-4 py-3 text-base'
    };

    const iconSize = {
        small: 'text-sm',
        medium: 'text-base',
        large: 'text-lg'
    };

    return (
        <button
            onClick={onChallengeClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            aria-label={`Challenge ${playerName}`}
            className={`${sizeClasses[size]} rounded-lg font-medium transition-all flex items-center gap-2 ${
                isHovered
                    ? 'bg-purple-600 scale-105'
                    : 'bg-purple-700 hover:bg-purple-600'
            } text-white shadow-lg hover:shadow-xl active:scale-95`}
            title={`Challenge ${playerName} to a game`}
        >
            <svg
                className={iconSize[size]}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                width="1em"
                height="1em"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                />
            </svg>
            <span>Challenge</span>
        </button>
    );
};

export default ChallengeButton;
