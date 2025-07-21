'use client';

import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@/store';
import { initializeFromEnv } from '@/store/configSlice';
import { useEffect } from 'react';

interface ReduxProviderProps {
  children: React.ReactNode;
}

function StoreInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize from environment variables if store is empty
    const state = store.getState();
    if (state.config.webhooks.length === 0) {
      store.dispatch(initializeFromEnv());
    }
  }, []);

  return <>{children}</>;
}

export function ReduxProvider({ children }: ReduxProviderProps) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <StoreInitializer>
          {children}
        </StoreInitializer>
      </PersistGate>
    </Provider>
  );
}