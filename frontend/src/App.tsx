import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store, useAppDispatch, useAppSelector } from './store';
import { initTheme } from './store/themeSlice';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ToastContainer } from './components/Toast';

import { Dashboard } from './pages/Dashboard';
import { LogInteraction } from './pages/LogInteraction';
import { Doctors } from './pages/Doctors';

const AppContent: React.FC = () => {
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector((state) => state.theme.mode);

  // Initialize theme class on html document
  useEffect(() => {
    dispatch(initTheme());
  }, [dispatch]);

  return (
    <Router>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
        {/* Sidebar Nav */}
        <Sidebar />
        
        {/* Main Work Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 overflow-hidden">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/log" element={<LogInteraction />} />
              <Route path="/doctors" element={<Doctors />} />
            </Routes>
          </main>
        </div>
      </div>
      
      {/* Toast Alert overlay */}
      <ToastContainer />
    </Router>
  );
};

export const App: React.FC = () => {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
};

export default App;
