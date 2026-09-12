import React, { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { ProfileResponse } from '../types';

interface ProfileContextType {
  data: ProfileResponse | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data, isLoading, error, refetch } = useQuery<ProfileResponse>({
    queryKey: ['my-profile'],
    queryFn: async () => {
      const response = await api.get('/profile/me');
      return response.data;
    },
  });

  return (
    <ProfileContext.Provider value={{ data, isLoading, error: error as Error | null, refetch }}>
      {children}
    </ProfileContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components -- standard context pattern: provider + hook in one file
export const useProfileContext = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfileContext must be used within a ProfileProvider');
  }
  return context;
};
