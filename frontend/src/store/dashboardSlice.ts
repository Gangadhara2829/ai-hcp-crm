import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = '/api';

export interface DashboardStats {
  stats: {
    doctors_visited: number;
    meetings_today: number;
    pending_followups: number;
    high_priority_count: number;
    positive_interactions_count: number;
    top_product: string;
    high_opportunity_count: number;
  };
  high_priority_doctors: any[];
  recent_activity: any[];
  upcoming_followups: any[];
  ai_recommendations: any[];
  sentiment_distribution: {
    Positive: number;
    Neutral: number;
    Negative: number;
  };
  product_distribution: any[];
  hospital_distribution: any[];
  followup_distribution: {
    Pending: number;
    Completed: number;
  };
  monthly_trend: any[];
}

export interface DashboardState {
  data: DashboardStats | null;
  loading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  data: null,
  loading: false,
  error: null,
};

export const fetchDashboardData = createAsyncThunk('dashboard/fetchData', async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get(`${API_URL}/dashboard/stats`);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.detail || 'Failed to fetch dashboard data.');
  }
});

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default dashboardSlice.reducer;
