import React from 'react';
import { useChallenges } from '../context/ChallengeContext';

interface ChallengeNotificationBadgeProps {
    onClick?: () => void;
}

const ChallengeNotificationBadge: React.FC<ChallengeNotificationBadgeProps> = ({ onClick }) => {
    const { pendingChallengesCount } = useChallenges();

    if (pendingChallengesCount === 0) {
        return null;
    }

    return (
        <button
            onClick={onClick}
            className="relative inline-flex items-center justify-center w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-700 transition-colors text-white shadow-lg hover:shadow-xl"
            title={`${pendingChallengesCount} pending challenge${pendingChallengesCount > 1 ? 's' : ''}`}
        >
            {/* Lightning icon */}
            <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                />
            </svg>

            {/* Notification badge */}
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full border-2 border-gray-900 animate-pulse">
                {pendingChallengesCount > 9 ? '9+' : pendingChallengesCount}
            </span>
        </button>
    );
};

export default ChallengeNotificationBadge;
