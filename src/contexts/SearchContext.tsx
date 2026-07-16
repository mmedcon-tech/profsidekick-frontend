'use client';

import { createContext, useContext, useState, useRef, useCallback, ReactNode } from 'react';

interface SearchContextValue {
  query: string;
  placeholder: string;
  isSearchActive: boolean;
  handleInput: (q: string) => void;
  register: (placeholder: string, onChange: (q: string) => void) => void;
  unregister: () => void;
}

const SearchContext = createContext<SearchContextValue>({
  query: '',
  placeholder: 'Search…',
  isSearchActive: false,
  handleInput: () => {},
  register: () => {},
  unregister: () => {},
});

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('');
  const [placeholder, setPlaceholder] = useState('Search…');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const onChangeRef = useRef<((q: string) => void) | null>(null);

  const handleInput = useCallback((q: string) => {
    setQuery(q);
    onChangeRef.current?.(q);
  }, []);

  const register = useCallback((ph: string, onChange: (q: string) => void) => {
    setPlaceholder(ph);
    setIsSearchActive(true);
    setQuery('');
    onChangeRef.current = onChange;
  }, []);

  const unregister = useCallback(() => {
    setIsSearchActive(false);
    setQuery('');
    onChangeRef.current = null;
  }, []);

  return (
    <SearchContext.Provider
      value={{ query, placeholder, isSearchActive, handleInput, register, unregister }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  return useContext(SearchContext);
}
