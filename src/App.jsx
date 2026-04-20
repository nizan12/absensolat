import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy loading pages could be done here, but for simplicity we'll import them directly
import Login from './pages/Login';
import Register from './pages/Register';
import AbsenUser from './pages/AbsenUser';
import AdminDashboard from './pages/AdminDashboard';
import Quran from './pages/Quran';
import SurahDetail from './pages/SurahDetail';
import Doa from './pages/Doa';
import DoaDetail from './pages/DoaDetail';
import JadwalShalat from './pages/JadwalShalat';
import AkunUser from './pages/AkunUser';

// Wrapper to redirect authenticated users away from login/register
const AuthRoute = ({ children }) => {
  const { currentUser } = useAuth();
  if (currentUser) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
      <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />
      
      <Route element={<Layout />}>
        <Route path="/" element={
          <ProtectedRoute>
            <AbsenUser />
          </ProtectedRoute>
        } />

        <Route path="/akun" element={
          <ProtectedRoute>
            <AkunUser />
          </ProtectedRoute>
        } />
        
        <Route path="/quran" element={
          <ProtectedRoute>
            <Quran />
          </ProtectedRoute>
        } />
        
        <Route path="/quran/:surahId" element={
          <ProtectedRoute>
            <SurahDetail />
          </ProtectedRoute>
        } />

        <Route path="/doa" element={
          <ProtectedRoute>
            <Doa />
          </ProtectedRoute>
        } />

        <Route path="/doa/:id" element={
          <ProtectedRoute>
            <DoaDetail />
          </ProtectedRoute>
        } />

        <Route path="/jadwal" element={
          <ProtectedRoute>
            <JadwalShalat />
          </ProtectedRoute>
        } />
        
        <Route path="/admin" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
