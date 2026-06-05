import React, { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { ProfileResponse } from '../../../../types';

interface OnboardingContextType {
  data: ProfileResponse | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data, isLoading, error, refetch } = useQuery<ProfileResponse>({
    queryKey: ['my-onboarding-draft'],
    queryFn: async () => {
      const response = await api.get('/hrms/onboarding/me');
      return response.data;
    },
  });

  return (
    <OnboardingContext.Provider value={{ data, isLoading, error: error as Error | null, refetch }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboardingContext = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboardingContext must be used within an OnboardingProvider');
  }
  return context;
};
