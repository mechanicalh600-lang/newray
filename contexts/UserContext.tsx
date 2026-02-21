import React, { createContext, useContext } from 'react';
import { User } from '../types';

const UserContext = createContext<User | null>(null);

export const UserProvider = UserContext.Provider;

export function useUser(): User | null {
  return useContext(UserContext);
}
