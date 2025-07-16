import React, { createContext, useContext } from 'react';

export const LocationContext = createContext({
  location: null,
  updateLocation: async () => {},
});

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};