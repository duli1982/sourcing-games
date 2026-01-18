
import React, { useEffect, useState } from 'react';
import { useUIContext } from '../context/UIContext';
import { ToastType } from '../types';

interface ToastProps {
    id: number;
    message: string;
    type: ToastType;
}

const toastConfig = {
    success: {
        icon: (
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
        ),
        barClass: 'bg-green-500',
    },
    error: {
        icon: (
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
        ),
        barClass: 'bg-red-500',
    },
    info: {
        icon: (
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
        ),
        barClass: 'bg-blue-500',
    }
};

const Toast: React.FC<ToastProps> = ({ id, message, type }) => {
    const { removeToast } = useUIContext();
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            const removeTimer = setTimeout(() => removeToast(id), 300); // Wait for animation
            return () => clearTimeout(removeTimer);
        }, 5000); // 5 seconds

        return () => {
            clearTimeout(timer);
        };
    }, [id, removeToast]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => removeToast(id), 300);
    };

    const config = toastConfig[type];

    return (
        <div
            role="alert"
            className={`flex items-center bg-gray-800 p-4 rounded-lg shadow-lg w-full max-w-sm border border-gray-700 ${isExiting ? 'toast-out' : 'toast-in'}`}
        >
            <div className="flex-shrink-0">{config.icon}</div>
            <div className="ml-3 text-sm font-medium text-gray-300">
                {message}
            </div>
            <button
                onClick={handleClose}
                className="ml-auto -mx-1.5 -my-1.5 bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg focus:ring-2 focus:ring-gray-600 p-1.5 inline-flex h-8 w-8"
                aria-label="Close"
            >
                <span className="sr-only">Close</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
                </svg>
            </button>
        </div>
    );
};

export default Toast;
