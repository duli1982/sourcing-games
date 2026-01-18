import React, { useState } from 'react';
import {
    ShareData,
    getLinkedInShareUrl,
    getTwitterShareUrl,
    copyToClipboard
} from '../utils/shareUtils';

interface ShareButtonsProps {
    shareData: ShareData;
    size?: 'small' | 'medium' | 'large';
    showLabels?: boolean;
}

const ShareButtons: React.FC<ShareButtonsProps> = ({
    shareData,
    size = 'medium',
    showLabels = true
}) => {
    const [copied, setCopied] = useState(false);

    const handleLinkedInShare = () => {
        const url = getLinkedInShareUrl(shareData);
        window.open(url, '_blank', 'width=600,height=600');
    };

    const handleTwitterShare = () => {
        const url = getTwitterShareUrl(shareData);
        window.open(url, '_blank', 'width=600,height=400');
    };

    const handleCopyLink = async () => {
        const success = await copyToClipboard(shareData.url);
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const sizeClasses = {
        small: 'px-2 py-1 text-xs',
        medium: 'px-3 py-2 text-sm',
        large: 'px-4 py-3 text-base'
    };

    const iconSizeClasses = {
        small: 'text-sm',
        medium: 'text-base',
        large: 'text-lg'
    };

    const buttonClass = `${sizeClasses[size]} rounded-lg font-medium transition-all hover:scale-105 active:scale-95 flex items-center gap-2`;

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {/* LinkedIn */}
            <button
                onClick={handleLinkedInShare}
                className={`${buttonClass} bg-[#0077B5] hover:bg-[#006399] text-white`}
                title="Share on LinkedIn"
            >
                <svg
                    className={iconSizeClasses[size]}
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    width="1em"
                    height="1em"
                >
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
                {showLabels && <span>LinkedIn</span>}
            </button>

            {/* Twitter/X */}
            <button
                onClick={handleTwitterShare}
                className={`${buttonClass} bg-black hover:bg-gray-800 text-white`}
                title="Share on Twitter/X"
            >
                <svg
                    className={iconSizeClasses[size]}
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    width="1em"
                    height="1em"
                >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                {showLabels && <span>Twitter</span>}
            </button>

            {/* Copy Link */}
            <button
                onClick={handleCopyLink}
                className={`${buttonClass} ${
                    copied
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-gray-700 hover:bg-gray-600'
                } text-white`}
                title="Copy link"
            >
                {copied ? (
                    <>
                        <svg
                            className={iconSizeClasses[size]}
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
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                        {showLabels && <span>Copied!</span>}
                    </>
                ) : (
                    <>
                        <svg
                            className={iconSizeClasses[size]}
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
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                        </svg>
                        {showLabels && <span>Copy Link</span>}
                    </>
                )}
            </button>
        </div>
    );
};

export default ShareButtons;
