import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Page, Toast, ToastType } from '../types';

interface UIContextType {
    currentPage: Page;
    setCurrentPage: (page: Page) => void;
    toasts: Toast[];
    addToast: (message: string, type: ToastType) => void;
    removeToast: (id: number) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentPage, setCurrentPage] = useState<Page>('home');
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = (message: string, type: ToastType) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
    };

    const removeToast = (id: number) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    return (
        <UIContext.Provider value={{ currentPage, setCurrentPage, toasts, addToast, removeToast }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUIContext = (): UIContextType => {
    const context = useContext(UIContext);
    if (context === undefined) {
        throw new Error('useUIContext must be used within a UIProvider');
    }
    return context;
};
