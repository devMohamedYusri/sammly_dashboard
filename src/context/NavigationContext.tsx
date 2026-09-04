'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type NavItem = 'users' | 'token-pricing' | 'dashboard' | 'sourcing' | 'system';

interface NavigationContextType {
  activeNav: NavItem;
  setActiveNav: (nav: NavItem) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeNav, setActiveNav] = useState<NavItem>('users');

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
