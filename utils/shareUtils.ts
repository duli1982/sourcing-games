/**
 * Social Sharing Utilities
 * Generate share URLs and text templates for LinkedIn, Twitter, and other platforms
 */

export interface ShareData {
    type: 'profile' | 'achievement' | 'game_score' | 'challenge';
    playerName: string;
    score?: number;
    gameTitle?: string;
    achievementName?: string;
    url: string;
}

/**
 * Generate LinkedIn share URL
 */
export function getLinkedInShareUrl(data: ShareData): string {
    const text = generateShareText(data, 'linkedin');
    const url = encodeURIComponent(data.url);

    return `https://www.linkedin.com/sharing/share-offsite/?url=${url}&summary=${encodeURIComponent(text)}`;
}

/**
 * Generate Twitter/X share URL
 */
export function getTwitterShareUrl(data: ShareData): string {
    const text = generateShareText(data, 'twitter');
    const url = encodeURIComponent(data.url);

    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${url}`;
}

/**
 * Generate share text based on content type and platform
 */
export function generateShareText(data: ShareData, platform: 'linkedin' | 'twitter'): string {
    const { type, playerName, score, gameTitle, achievementName } = data;

    if (platform === 'linkedin') {
        switch (type) {
            case 'profile':
                return `Check out ${playerName}'s profile on Sourcing AI Games - a platform for mastering sourcing skills through AI-powered challenges! 🎯`;

            case 'achievement':
                return `🎉 Just unlocked "${achievementName}" on Sourcing AI Games! \n\nContinuing to sharpen my sourcing skills with interactive challenges. Join me in the quest for sourcing excellence! 💼\n\n#Sourcing #TalentAcquisition #Recruiting #AI`;

            case 'game_score':
                return `📊 Just scored ${score}/100 on "${gameTitle}" in Sourcing AI Games! \n\nLeveling up my sourcing skills one challenge at a time. Want to test your skills? 🎯\n\n#Sourcing #TalentAcquisition #SkillDevelopment`;

            case 'challenge':
                return `🏆 Challenge accepted! Competing in Sourcing AI Games to prove my sourcing prowess. \n\nThink you can beat my score? Join the challenge! 💪\n\n#Sourcing #Competition #TalentAcquisition`;

            default:
                return `Improving my sourcing skills on Sourcing AI Games! 🚀 #Sourcing #TalentAcquisition`;
        }
    } else { // Twitter
        switch (type) {
            case 'profile':
                return `Check out ${playerName}'s profile on @SourcingAIGames - mastering sourcing skills with AI! 🎯`;

            case 'achievement':
                return `🎉 Unlocked "${achievementName}" on Sourcing AI Games! Sharpening my sourcing skills 💼 #Sourcing #TalentAcquisition`;

            case 'game_score':
                return `📊 Scored ${score}/100 on "${gameTitle}"! Leveling up my sourcing skills 🎯 #Sourcing #Recruiting`;

            case 'challenge':
                return `🏆 Challenge me in Sourcing AI Games! Think you can beat my score? 💪 #Sourcing #Competition`;

            default:
                return `Improving my sourcing skills on Sourcing AI Games! 🚀 #Sourcing`;
        }
    }
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        // Fallback for older browsers
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        } catch (fallbackErr) {
            console.error('Failed to copy to clipboard:', fallbackErr);
            return false;
        }
    }
}

/**
 * Generate current page URL (for sharing)
 */
export function getCurrentUrl(): string {
    if (typeof window !== 'undefined') {
        return window.location.href;
    }
    return '';
}

/**
 * Generate player profile URL
 */
export function getPlayerProfileUrl(playerName: string): string {
    if (typeof window !== 'undefined') {
        const baseUrl = window.location.origin;
        return `${baseUrl}/player/${encodeURIComponent(playerName)}`;
    }
    return '';
}

/**
 * Generate Open Graph meta tags data
 */
export function generateOgMetaTags(data: ShareData) {
    const baseTitle = 'Sourcing AI Games';
    const baseDescription = 'Master sourcing skills through AI-powered challenges';

    let title = baseTitle;
    let description = baseDescription;
    let image = '/og-image.png'; // Default OG image

    switch (data.type) {
        case 'profile':
            title = `${data.playerName} - ${baseTitle}`;
            description = `Check out ${data.playerName}'s sourcing skills and achievements`;
            break;

        case 'achievement':
            title = `${data.achievementName} - ${baseTitle}`;
            description = `${data.playerName} unlocked ${data.achievementName}!`;
            break;

        case 'game_score':
            title = `${data.score}/100 on ${data.gameTitle} - ${baseTitle}`;
            description = `${data.playerName} scored ${data.score}/100 on ${data.gameTitle}`;
            break;

        case 'challenge':
            title = `Challenge - ${baseTitle}`;
            description = `${data.playerName} challenges you to beat their score!`;
            break;
    }

    return {
        title,
        description,
        image,
        url: data.url
    };
}
