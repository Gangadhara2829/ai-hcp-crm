import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

export interface RecentToast {
  message: string;
  timestamp: number;
}

export interface NotificationsState {
  toasts: ToastMessage[];
  recentToasts: RecentToast[];
}

const initialState: NotificationsState = {
  toasts: [],
  recentToasts: [],
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addToast: (state, action: PayloadAction<Omit<ToastMessage, 'id'>>) => {
      const now = Date.now();
      const { message, type } = action.payload;
      
      // 1. Prevent duplicate notifications currently visible
      const isVisible = state.toasts.some((t) => t.message === message);
      if (isVisible) {
        return;
      }

      // 2. Prevent duplicate notifications within 5 seconds
      const isRecentDuplicate = state.recentToasts.some(
        (t) => t.message === message && now - t.timestamp < 5000
      );
      if (isRecentDuplicate) {
        return;
      }
      
      // Save to recent list
      state.recentToasts.push({ message, timestamp: now });
      // Keep recent list clean (only keep items from last 10 seconds)
      state.recentToasts = state.recentToasts.filter((t) => now - t.timestamp < 10000);
      
      const id = Math.random().toString(36).substring(2, 9);
      const newToast = { message, type, id };
      
      // 3. Priority check: Errors > Warnings > Success > Info
      const priorityMap = {
        error: 4,
        warning: 3,
        success: 2,
        info: 1
      };
      
      const incomingPriority = priorityMap[type];
      
      // Limit to 2 visible notifications
      if (state.toasts.length >= 2) {
        // Find if incoming has higher priority than existing ones to replace
        const lowestPriorityIndex = state.toasts.reduce(
          (lowestIdx, currentToast, currentIdx, arr) => {
            const currentPriority = priorityMap[currentToast.type];
            const lowestPriority = priorityMap[arr[lowestIdx].type];
            return currentPriority < lowestPriority ? currentIdx : lowestIdx;
          },
          0
        );
        
        const lowestPriorityToast = state.toasts[lowestPriorityIndex];
        if (incomingPriority > priorityMap[lowestPriorityToast.type]) {
          state.toasts[lowestPriorityIndex] = newToast;
          return;
        }
        
        // Otherwise shift oldest if we're exceeding limit of 2
        state.toasts.shift();
      }
      
      state.toasts.push(newToast);
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
});

export const { addToast, removeToast } = notificationsSlice.actions;
export default notificationsSlice.reducer;
export const showToast = (message: string, type: ToastMessage['type'] = 'info') => addToast({ message, type });
