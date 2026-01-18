import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Team, TeamMember, CreateTeamData } from '../types';
import { usePlayerContext } from './PlayerContext';

interface TeamContextType {
  currentTeam: Team | null;
  userTeams: Team[];
  isLoading: boolean;
  error: string | null;
  createTeam: (teamData: CreateTeamData) => Promise<Team>;
  joinTeam: (inviteCode: string) => Promise<Team>;
  leaveTeam: (teamId: string) => Promise<void>;
  fetchUserTeams: () => Promise<void>;
  fetchTeamDetails: (teamId: string) => Promise<Team>;
  setCurrentTeam: (team: Team | null) => void;
  clearError: () => void;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export const useTeamContext = (): TeamContextType => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeamContext must be used within a TeamProvider');
  }
  return context;
};

interface TeamProviderProps {
  children: ReactNode;
}

export const TeamProvider: React.FC<TeamProviderProps> = ({ children }) => {
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { player } = usePlayerContext();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Create a new team
   */
  const createTeam = useCallback(async (teamData: CreateTeamData): Promise<Team> => {
    if (!player) {
      throw new Error('You must be logged in to create a team');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/teams?action=create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...teamData,
          playerName: player.name,
          playerId: player.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create team');
      }

      const newTeam: Team = await response.json();

      // Add to user teams
      setUserTeams((prev) => [...prev, newTeam]);
      setCurrentTeam(newTeam);

      return newTeam;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create team';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [player]);

  /**
   * Join a team with invite code
   */
  const joinTeam = useCallback(async (inviteCode: string): Promise<Team> => {
    if (!player) {
      throw new Error('You must be logged in to join a team');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/teams?action=join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          inviteCode,
          playerName: player.name,
          playerId: player.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to join team');
      }

      const team: Team = await response.json();

      // Add to user teams
      setUserTeams((prev) => [...prev, team]);
      setCurrentTeam(team);

      return team;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join team';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [player]);

  /**
   * Leave a team
   */
  const leaveTeam = useCallback(async (teamId: string): Promise<void> => {
    if (!player) {
      throw new Error('You must be logged in to leave a team');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/teams?action=leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          teamId,
          playerId: player.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to leave team');
      }

      // Remove from user teams
      setUserTeams((prev) => prev.filter((team) => team.id !== teamId));

      // Clear current team if it's the one we left
      if (currentTeam?.id === teamId) {
        setCurrentTeam(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to leave team';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [player, currentTeam]);

  /**
   * Fetch all teams the user is a member of
   */
  const fetchUserTeams = useCallback(async (): Promise<void> => {
    if (!player) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/teams?action=my-teams&playerId=' + player.id, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user teams');
      }

      const teams: Team[] = await response.json();
      setUserTeams(teams);

      // Set current team to first team if none selected
      if (teams.length > 0 && !currentTeam) {
        setCurrentTeam(teams[0]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch teams';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [player, currentTeam]);

  /**
   * Fetch detailed information about a specific team
   */
  const fetchTeamDetails = useCallback(async (teamId: string): Promise<Team> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/teams?action=details&teamId=${teamId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch team details');
      }

      const team: Team = await response.json();
      return team;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch team details';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value: TeamContextType = {
    currentTeam,
    userTeams,
    isLoading,
    error,
    createTeam,
    joinTeam,
    leaveTeam,
    fetchUserTeams,
    fetchTeamDetails,
    setCurrentTeam,
    clearError,
  };

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
};
