import { createSlice } from '@reduxjs/toolkit';

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: {
    id: 1,
    name: "Alex Mercer",
    email: "alex.mercer@biopharma.com",
    role: "Senior Medical Representative"
  },
  isAuthenticated: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    }
  }
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
