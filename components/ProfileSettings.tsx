import React, { useState, useEffect } from 'react';
import { usePlayerContext } from '../context/PlayerContext';
import type { Player } from '../types';

/**
 * ProfileSettings - Component for editing own profile
 * Allows users to set bio, avatar, visibility, and social links
 */
const ProfileSettings: React.FC = () => {
  const { player, updatePlayerProfile } = usePlayerContext();
  const [bio, setBio] = useState(player?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(player?.avatarUrl || '');
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'private' | 'friends'>(
    player?.profileVisibility || 'public'
  );
  const [linkedin, setLinkedin] = useState(player?.socialLinks?.linkedin || '');
  const [twitter, setTwitter] = useState(player?.socialLinks?.twitter || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Update local state when player data changes
  useEffect(() => {
    if (player) {
      setBio(player.bio || '');
      setAvatarUrl(player.avatarUrl || '');
      setProfileVisibility(player.profileVisibility || 'public');
      setLinkedin(player.socialLinks?.linkedin || '');
      setTwitter(player.socialLinks?.twitter || '');
    }
  }, [player]);

  const handleSave = async () => {
    if (!player) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Update player profile
      await updatePlayerProfile({
        bio: bio.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
        profileVisibility,
        socialLinks: {
          linkedin: linkedin.trim() || undefined,
          twitter: twitter.trim() || undefined,
        },
      });

      setSaveMessage('Profile updated successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Failed to update profile:', error);
      setSaveMessage('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Profile Settings</h2>

      <div className="space-y-4">
        {/* Bio */}
        <div>
          <label className="block text-gray-300 mb-2 font-semibold">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="Tell others about yourself..."
            className="w-full bg-gray-700 text-white border border-gray-600 rounded-md p-3 focus:outline-none focus:border-cyan-500"
          />
          <div className="text-sm text-gray-400 mt-1">{bio.length}/500 characters</div>
        </div>

        {/* Avatar URL */}
        <div>
          <label className="block text-gray-300 mb-2 font-semibold">Avatar URL</label>
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/avatar.jpg"
            className="w-full bg-gray-700 text-white border border-gray-600 rounded-md p-3 focus:outline-none focus:border-cyan-500"
          />
          <div className="text-sm text-gray-400 mt-1">
            Link to your profile picture (must be a public URL)
          </div>
          {avatarUrl && (
            <div className="mt-2">
              <img
                src={avatarUrl}
                alt="Avatar preview"
                className="w-20 h-20 rounded-full border-2 border-gray-600"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
        </div>

        {/* Profile Visibility */}
        <div>
          <label className="block text-gray-300 mb-2 font-semibold">Profile Visibility</label>
          <select
            value={profileVisibility}
            onChange={(e) => setProfileVisibility(e.target.value as 'public' | 'private' | 'friends')}
            className="w-full bg-gray-700 text-white border border-gray-600 rounded-md p-3 focus:outline-none focus:border-cyan-500"
          >
            <option value="public">Public - Anyone can view your profile</option>
            <option value="private">Private - Only you can view your profile</option>
            <option value="friends">Friends - Only friends can view (coming soon)</option>
          </select>
        </div>

        {/* Social Links */}
        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-lg font-semibold text-white mb-3">Social Links</h3>

          <div className="space-y-3">
            <div>
              <label className="block text-gray-300 mb-2">LinkedIn Profile</label>
              <input
                type="url"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/yourprofile"
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-md p-3 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">X Profile</label>
              <input
                type="url"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                placeholder="https://x.com/yourprofile"
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-md p-3 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-4 pt-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-6 rounded-md transition duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>

          {saveMessage && (
            <div className={`text-sm ${
              saveMessage.includes('success') ? 'text-green-400' : 'text-red-400'
            }`}>
              {saveMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
