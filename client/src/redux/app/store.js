import { configureStore } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage";

// Import base API
import { baseApi } from "../features/api/baseApi";

// Import auth slice
import authReducer from "../features/authSlice";

/**
 * Redux Store Configuration
 * Configured with Redux Toolkit and redux-persist for auth state
 * Includes RTK Query middleware for API caching
 *
 * Requirements: 24.1, 24.2
 */

// Persist configuration for auth slice
const authPersistConfig = {
  key: "auth",
  storage,
  whitelist: ["user", "isAuthenticated"], // Only persist these fields (token in httpOnly cookie)
};

// Create persisted auth reducer
const persistedAuthReducer = persistReducer(authPersistConfig, authReducer);

// Configure store
export const store = configureStore({
  reducer: {
    // Auth slice (persisted)
    auth: persistedAuthReducer,

    // RTK Query API slice
    [baseApi.reducerPath]: baseApi.reducer,
  },

  // Add RTK Query middleware
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore redux-persist actions
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(baseApi.middleware),

  // Enable Redux DevTools in development
  devTools: import.meta.env.DEV,
});

// Create persistor
export const persistor = persistStore(store);

// Export types for TypeScript (if needed in future)
export const RootState = store.getState;
export const AppDispatch = store.dispatch;

export default store;
