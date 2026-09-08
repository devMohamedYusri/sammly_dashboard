'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type NavItem = 'overview' | 'users' | 'token-pricing' | 'support' | 'sourcing' | 'financials' | 'system';

interface NavigationContextType {
  activeNav: NavItem;
  setActiveNav: (nav: NavItem) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeNav, setActiveNav] = useState<NavItem>('overview');

  return (
    <NavigationContext.Provider value={{ activeNav, setActiveNav }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
