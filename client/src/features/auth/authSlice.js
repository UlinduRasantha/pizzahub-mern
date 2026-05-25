import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { profileService } from '../../services/api'

// Fetch our DB profile (role, addresses) after Clerk signs the user in
export const fetchProfile = createAsyncThunk(
  'auth/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await profileService.getMe()
      return data.data.profile
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load profile')
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState: { profile: null, loading: false, error: null },
  reducers: {
    clearProfile: (state) => {
      state.profile = null
      state.error   = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.pending,   (state) => { state.loading = true; state.error = null })
      .addCase(fetchProfile.fulfilled, (state, { payload }) => {
        state.loading = false
        state.profile = payload
      })
      .addCase(fetchProfile.rejected,  (state, { payload }) => {
        state.loading = false
        state.error   = payload
      })
  },
})

export const { clearProfile } = authSlice.actions
export default authSlice.reducer

// Selectors
export const selectProfile  = (state) => state.auth.profile
export const selectIsAdmin  = (state) => state.auth.profile?.role === 'admin'
export const selectRole     = (state) => state.auth.profile?.role || 'customer'
