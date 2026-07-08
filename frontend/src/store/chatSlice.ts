import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = '/api';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  intent?: string;
  data?: any;
  confidence_score?: number;
  steps?: any[];
}

export interface ChatState {
  messages: ChatMessage[];
  lastExtraction: any | null; // structured data returned by LangGraph
  loading: boolean;
  error: string | null;
}

const initialState: ChatState = {
  messages: [
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello! I am your AI CRM Assistant. You can speak to me naturally about your interactions with doctors.\n\nFor example:\n*\"I met Dr. Sarah Jenkins today. Discussed CardioShield, she requested clinical trial data. Follow up in 14 days.\"*\n\nHow can I help you today?",
      timestamp: new Date().toISOString()
    }
  ],
  lastExtraction: null,
  loading: false,
  error: null,
};

export const sendChatMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ message, history }: { message: string; history: { role: string; content: string }[] }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/chat`, {
        message,
        user_id: 1,
        history
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to communicate with AI agent.');
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    clearChat: (state) => {
      state.messages = [initialState.messages[0]];
      state.lastExtraction = null;
      state.error = null;
    },
    addManualMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);
    },
    setLastExtraction: (state, action: PayloadAction<any>) => {
      state.lastExtraction = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendChatMessage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.loading = false;
        
        // Add assistant message
        state.messages.push({
          id: Math.random().toString(36).substring(2, 9),
          sender: 'assistant',
          text: action.payload.text,
          timestamp: new Date().toISOString(),
          intent: action.payload.intent,
          data: action.payload.data,
          confidence_score: action.payload.confidence_score,
          steps: action.payload.steps
        });
        
        // Update parsed card details
        if (action.payload.success && action.payload.data) {
          state.lastExtraction = {
            intent: action.payload.intent,
            ...action.payload.data
          };
        }
      })
      .addCase(sendChatMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        
        // Add error notification directly into chat for usability
        state.messages.push({
          id: Math.random().toString(36).substring(2, 9),
          sender: 'assistant',
          text: `⚠️ **Error:** ${action.payload as string || 'Connection issues. Please check if your backend is running.'}`,
          timestamp: new Date().toISOString()
        });
      });
  },
});

export const { clearChat, addManualMessage, setLastExtraction } = chatSlice.actions;
export default chatSlice.reducer;
