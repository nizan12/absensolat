import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { LogOut, MapPin, BookOpen, User, Settings, Heart, Calendar } from 'lucide-react';

const Layout = () => {
  const { currentUser, userRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const NavItem = ({ to, icon: Icon, label }) => {
    const isActive = location.pathname === to || (location.pathname.startsWith('/quran') && to === '/quran');
    return (
      <Link to={to} className={`nav-link flex items-center gap-2 ${isActive ? 'active' : ''}`}>
        <Icon size={18} />
        <span className="nav-mobile-text">{label}</span>
      </Link>
    );
  };

  return (
    <>
      <nav className="navbar">
        <div className="container nav-container border-b" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          <Link to="/" className="nav-brand">
            <MapPin size={24} className="text-primary" />
            <span>Absen</span>Solat
          </Link>
          
          {currentUser && (
            <div className="nav-links" style={{ overflowX: 'auto', paddingBottom: '4px' }}>
              <NavItem to="/" icon={MapPin} label="Absen" />
              <NavItem to="/quran" icon={BookOpen} label="Al-Quran" />
              <NavItem to="/doa" icon={Heart} label="Doa" />
              <NavItem to="/jadwal" icon={Calendar} label="Jadwal" />
              <NavItem to="/akun" icon={User} label="Profil" />
              
              {(userRole === 'admin' || userRole === 'super-admin') && (
                <NavItem to="/admin" icon={Settings} label="Admin" />
              )}
              
              <button 
                onClick={handleLogout} 
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.5rem 1rem', borderRadius: '99px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444', cursor: 'pointer', fontFamily: 'Outfit',
                  fontWeight: '500', transition: 'all 0.2s ease', marginLeft: '0.5rem'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                }}
              >
                <LogOut size={16} />
                <span className="nav-mobile-text">Keluar</span>
              </button>
            </div>
          )}
        </div>
      </nav>
      
      <main className="container mt-4 mb-4 animate-fade-in">
        <Outlet />
      </main>
    </>
  );
};

export default Layout;
