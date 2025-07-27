'use client';

import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@/store';
import { initializeFromEnv } from '@/store/configSlice';
import { useEffect, useState } from 'react';

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

// Custom PersistGate that handles persistence failures gracefully
function SafePersistGate({ children }: { children: React.ReactNode }) {
  const [persistError, setPersistError] = useState(false);

  useEffect(() => {
    // Check if persistence is working
    const checkPersistence = async () => {
      try {
        await persistor.persist();
      } catch (error) {
        console.warn('Redux Persist failed to initialize, continuing without persistence:', error);
        setPersistError(true);
      }
    };
    
    checkPersistence();
  }, []);

  // If persistence failed, render children directly without PersistGate
  if (persistError) {
    return <>{children}</>;
  }

  return (
    <PersistGate loading={null} persistor={persistor}>
      {children}
    </PersistGate>
  );
}

export function ReduxProvider({ children }: ReduxProviderProps) {
  return (
    <Provider store={store}>
      <SafePersistGate>
        <StoreInitializer>
          {children}
        </StoreInitializer>
      </SafePersistGate>
    </Provider>
  );
}