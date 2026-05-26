import { create } from 'zustand'

interface UiStore {
  aboutOpen: boolean
  urlDialogOpen: boolean
  setAboutOpen: (open: boolean) => void
  setUrlDialogOpen: (open: boolean) => void
}

export const useUiStore = create<UiStore>((set) => ({
  aboutOpen: false,
  urlDialogOpen: false,
  setAboutOpen: (open) => set({ aboutOpen: open }),
  setUrlDialogOpen: (open) => set({ urlDialogOpen: open })
}))
