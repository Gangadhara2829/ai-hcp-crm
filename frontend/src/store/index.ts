import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';

import themeReducer from './themeSlice';
import notificationsReducer from './notificationsSlice';
import authReducer from './authSlice';
import doctorsReducer from './doctorsSlice';
import interactionsReducer from './interactionsSlice';
import dashboardReducer from './dashboardSlice';
import chatReducer from './chatSlice';

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    notifications: notificationsReducer,
    auth: authReducer,
    doctors: doctorsReducer,
    interactions: interactionsReducer,
    dashboard: dashboardReducer,
    chat: chatReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
