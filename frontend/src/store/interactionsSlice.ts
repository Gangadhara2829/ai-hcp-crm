import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = '/api';

export interface Interaction {
  id: number;
  doctor_id: number;
  doctor_name: string;
  user_id: number;
  user_name: string;
  product_id?: number;
  product_name?: string;
  date: string;
  interaction_type: string;
  notes?: string;
  summary?: string;
  sentiment: string;
  transcript?: string;
  next_action?: string;
  follow_up_date?: string;
  follow_up_title?: string;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  therapeutic_class: string;
  description?: string;
}

export interface InteractionsState {
  list: Interaction[];
  products: Product[];
  loading: boolean;
  error: string | null;
}

const initialState: InteractionsState = {
  list: [],
  products: [],
  loading: false,
  error: null,
};

export const fetchInteractions = createAsyncThunk('interactions/fetchInteractions', async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get(`${API_URL}/interactions`);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.detail || 'Failed to fetch interactions.');
  }
});

export const fetchProducts = createAsyncThunk('interactions/fetchProducts', async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get(`${API_URL}/products`);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.detail || 'Failed to fetch products.');
  }
});

export const logInteraction = createAsyncThunk(
  'interactions/logInteraction', 
  async (interactionData: Omit<Interaction, 'id' | 'doctor_name' | 'user_name' | 'created_at'>, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/interactions`, interactionData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to log interaction.');
    }
  }
);

export const editInteraction = createAsyncThunk(
  'interactions/editInteraction',
  async ({ id, updateData }: { id: number; updateData: Partial<Interaction> }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_URL}/interactions/${id}`, updateData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to update interaction.');
    }
  }
);

const interactionsSlice = createSlice({
  name: 'interactions',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetchInteractions
      .addCase(fetchInteractions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInteractions.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchInteractions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // fetchProducts
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.products = action.payload;
      })
      // logInteraction
      .addCase(logInteraction.fulfilled, (state, action) => {
        state.list.unshift(action.payload);
      })
      // editInteraction
      .addCase(editInteraction.fulfilled, (state, action) => {
        const index = state.list.findIndex((i) => i.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
      });
  },
});

export default interactionsSlice.reducer;
