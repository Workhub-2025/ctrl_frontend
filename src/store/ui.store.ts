import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UIState {
    sidebarOpen: boolean;
    globalLoading: boolean;
    activeModal: string | null;
    setSidebarOpen: (open: boolean) => void;
    toggleSidebar: () => void;
    setGlobalLoading: (loading: boolean) => void;
    openModal: (modalId: string) => void;
    closeModal: () => void;
}

export const useUIStore = create<UIState>()(
    devtools((set) => ({
        sidebarOpen: false,
        globalLoading: false,
        activeModal: null,
        setSidebarOpen: (open) =>
            set({ sidebarOpen: open }, false, 'ui/setSidebarOpen'),
        toggleSidebar: () =>
            set((state) => ({ sidebarOpen: !state.sidebarOpen }), false, 'ui/toggleSidebar'),
        setGlobalLoading: (loading) =>
            set({ globalLoading: loading }, false, 'ui/setGlobalLoading'),
        openModal: (modalId) =>
            set({ activeModal: modalId }, false, 'ui/openModal'),
        closeModal: () =>
            set({ activeModal: null }, false, 'ui/closeModal'),
    }))
);
