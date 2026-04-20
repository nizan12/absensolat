import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { User, Calendar, BookOpen, Trash2, ChevronRight, Activity, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AkunUser = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [attendanceStats, setAttendanceStats] = useState({ total: 0, thisMonth: 0, history: [] });

  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        // Fetch Attendance (Removed orderBy to prevent missing composite index error)
        const attQuery = query(
          collection(db, 'attendance'),
          where('userId', '==', currentUser.uid)
        );
        const attSnap = await getDocs(attQuery);
        
        // Convert to array and sort manually
        const docsArray = [];
        attSnap.forEach(doc => docsArray.push({ id: doc.id, ...doc.data() }));
        docsArray.sort((a, b) => (b.timestamp?.toDate() || 0) - (a.timestamp?.toDate() || 0));
        
        let total = 0;
        let thisMonth = 0;
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const historyData = [];

        docsArray.forEach((data) => {
          total++;
          const date = data.timestamp?.toDate();
          if (date) {
            if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
              thisMonth++;
            }
            if (historyData.length < 5) {
              historyData.push({ id: data.id, date, distance: data.distanceMeters, prayerName: data.prayerName });
            }
          }
        });
        setAttendanceStats({ total, thisMonth, history: historyData });

      } catch (error) {
        console.error("Error fetching user stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [currentUser]);

  if (loading) return <div className="text-center py-8 text-secondary">Memuat data akun...</div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '4rem' }}>
      
      {/* Profile Header */}
      <div className="flex-col-mobile" style={{
        background: '#0a0f16', border: '1px solid rgba(16, 185, 129, 0.2)',
        borderRadius: '16px', padding: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981'
        }}>
          <User size={32} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.5rem', color: '#fff', margin: '0 0 0.5rem 0' }}>{currentUser.name || 'Hamba Allah'}</h2>
          <div style={{ color: '#94a3b8', fontSize: '0.95rem' }}>{currentUser.email}</div>
        </div>
      </div>

      <div className="flex-col-mobile" style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
        
        {/* Attendance Stats Column */}
        <div className="full-width-mobile" style={{ flex: '1 1 300px' }}>
          <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} color="#10b981" /> Statistik Absensi Solat
          </h3>
          
          <div className="grid-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#0a0f16', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', color: '#10b981', fontWeight: 'bold' }}>{attendanceStats.total}</div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Total Kehadiran</div>
            </div>
            <div style={{ background: '#0a0f16', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', color: '#e2e8f0', fontWeight: 'bold' }}>{attendanceStats.thisMonth}</div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Bulan Ini</div>
            </div>
          </div>

          <div style={{ background: '#0a0f16', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ fontSize: '0.9rem', color: '#fff', marginBottom: '1rem', fontWeight: '500' }}>5 Riwayat Terakhir</div>
            {attendanceStats.history.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: '#64748b', textAlign: 'center', padding: '1rem' }}>Belum ada histori absensi</div>
            ) : (
              attendanceStats.history.map((hist, i) => (
                <div key={i} className="flex-col-mobile" style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 0',
                  borderBottom: i < attendanceStats.history.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e2e8f0', fontSize: '0.9rem' }}>
                    <Calendar size={14} color="#94a3b8" style={{ flexShrink: 0 }} /> 
                    <div>
                      {hist.date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
                      {hist.prayerName && <span style={{ marginLeft: '0.5rem', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem' }}>{hist.prayerName}</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                    {Math.round(hist.distance)}m dari titik
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AkunUser;
