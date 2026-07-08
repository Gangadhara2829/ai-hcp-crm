import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Ensure proper API prefix mapping
const API_URL = '/api';

export interface Doctor {
  id: number;
  name: string;
  specialty: string;
  hospital: string;
  email?: string;
  phone?: string;
  status: string;
  priority: string;
  created_at: string;
}

export interface DoctorsState {
  list: Doctor[];
  loading: boolean;
  error: string | null;
}

const initialState: DoctorsState = {
  list: [],
  loading: false,
  error: null,
};

export const fetchDoctors = createAsyncThunk('doctors/fetchDoctors', async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get(`${API_URL}/doctors`);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.detail || 'Failed to fetch doctors list.');
  }
});

export const createDoctor = createAsyncThunk('doctors/createDoctor', async (doctorData: Omit<Doctor, 'id' | 'created_at'>, { rejectWithValue }) => {
  try {
    const response = await axios.post(`${API_URL}/doctors`, doctorData);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.detail || 'Failed to create doctor profile.');
  }
});

const doctorsSlice = createSlice({
  name: 'doctors',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetchDoctors
      .addCase(fetchDoctors.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDoctors.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchDoctors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // createDoctor
      .addCase(createDoctor.fulfilled, (state, action) => {
        state.list.push(action.payload);
      });
  },
});

export default doctorsSlice.reducer;
