import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message?: string;
    autoDismiss?: boolean;
    duration?: number;
}

interface NotificationsState {
    notifications: Notification[];
    addNotification: (n: Omit<Notification, 'id'>) => void;
    removeNotification: (id: string) => void;
    clearAll: () => void;
}

export const useNotificationsStore = create<NotificationsState>()(
    devtools((set) => ({
        notifications: [],
        addNotification: (n) =>
            set(
                (state) => ({
                    notifications: [
                        ...state.notifications,
                        { autoDismiss: true, duration: 4000, ...n, id: crypto.randomUUID() },
                    ],
                }),
                false,
                'notifications/add'
            ),
        removeNotification: (id) =>
            set(
                (state) => ({
                    notifications: state.notifications.filter((n) => n.id !== id),
                }),
                false,
                'notifications/remove'
            ),
        clearAll: () => set({ notifications: [] }, false, 'notifications/clearAll'),
    }))
);
