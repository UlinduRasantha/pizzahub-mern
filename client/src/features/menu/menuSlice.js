import { createSlice } from '@reduxjs/toolkit'

const menuSlice = createSlice({
  name: 'menu',
  initialState: {
    activeCategory: 'all',
    searchQuery: '',
    sortBy: 'default',
  },
  reducers: {
    setCategory:    (state, { payload }) => { state.activeCategory = payload },
    setSearchQuery: (state, { payload }) => { state.searchQuery    = payload },
    setSortBy:      (state, { payload }) => { state.sortBy         = payload },
  },
})

export const { setCategory, setSearchQuery, setSortBy } = menuSlice.actions
export default menuSlice.reducer

export const selectActiveCategory = (state) => state.menu.activeCategory
export const selectSearchQuery    = (state) => state.menu.searchQuery
export const selectSortBy         = (state) => state.menu.sortBy
