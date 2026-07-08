import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../store';
import { removeToast, ToastMessage } from '../store/notificationsSlice';

const ToastItem: React.FC<{ toast: ToastMessage }> = ({ toast }) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const duration = {
      info: 3000,
      success: 3000,
      warning: 4000,
      error: 5000
    }[toast.type];

    const timer = setTimeout(() => {
      dispatch(removeToast(toast.id));
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.type, dispatch]);

  let Icon = Info;
  let bgColor = 'bg-white dark:bg-slate-800 border-blue-500';
  let textColor = 'text-blue-500';
  
  if (toast.type === 'success') {
    Icon = CheckCircle;
    bgColor = 'bg-white dark:bg-slate-850 border-emerald-500';
    textColor = 'text-emerald-500';
  } else if (toast.type === 'error') {
    Icon = XCircle;
    bgColor = 'bg-white dark:bg-slate-850 border-red-500';
    textColor = 'text-red-500';
  } else if (toast.type === 'warning') {
    Icon = AlertTriangle;
    bgColor = 'bg-white dark:bg-slate-850 border-amber-500';
    textColor = 'text-amber-500';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.25 } }}
      layout
      className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg glass-card ${bgColor}`}
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${textColor}`} />
      <div className="flex-1 text-xs font-semibold text-slate-850 dark:text-slate-100">
        {toast.message}
      </div>
      <button
        onClick={() => dispatch(removeToast(toast.id))}
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

export const ToastContainer: React.FC = () => {
  const toasts = useAppSelector((state) => state.notifications.toasts);

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
};
