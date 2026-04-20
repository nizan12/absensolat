import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Copy, BookOpen, Info, ChevronRight } from 'lucide-react';

const DoaDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [allDoas, setAllDoas] = useState([]);
  const [doa, setDoa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDoas = async () => {
      setLoading(true);
      try {
        const response = await fetch(`https://equran.id/api/doa`);
        if (!response.ok) throw new Error('Gagal mengambil data doa');
        const json = await response.json();
        const doaData = json.data || json;
        const doasList = Array.isArray(doaData) ? doaData : [];
        setAllDoas(doasList);
        
        const currentDoa = doasList.find(d => d.id.toString() === id.toString());
        if (currentDoa) {
          setDoa(currentDoa);
        } else {
          setError('Doa tidak ditemukan');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDoas();
    window.scrollTo(0, 0);
  }, [id]);

  const handleCopy = () => {
    if (!doa) return;
    const text = `${doa.nama}\n\n${doa.ar}\n\n${doa.tr}\n\nArtinya: ${doa.idn}`;
    navigator.clipboard.writeText(text);
    alert('Doa berhasil disalin!');
  };

  const handleShare = () => {
    if (!doa) return;
    const text = `${doa.nama}\n\n${doa.ar}\n\nArtinya: ${doa.idn}`;
    if (navigator.share) {
      navigator.share({ title: doa.nama, text }).catch(console.error);
    } else {
      handleCopy();
    }
  };

  if (loading) return <div className="text-center py-8 text-secondary">Memuat detail doa...</div>;
  if (error) return <div className="text-center py-8 text-danger">{error}</div>;
  if (!doa) return null;

  const currentIndex = allDoas.findIndex(d => d.id.toString() === doa.id.toString());
  const nextDoa = currentIndex < allDoas.length - 1 ? allDoas[currentIndex + 1] : null;
  const relatedDoas = allDoas.filter(d => d.grup === doa.grup && d.id.toString() !== doa.id.toString()).slice(0, 4);

  // Reusable Section Component
  const SectionBox = ({ title, icon: Icon, children }) => (
    <div className="mb-6">
      <h4 style={{ 
        color: '#10b981', 
        fontSize: '1rem', 
        marginBottom: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontWeight: '600'
      }}>
        {Icon && <Icon size={16} />}
        {title}
      </h4>
      <div style={{
        background: '#131922',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '12px',
        padding: '1.5rem',
        color: '#e2e8f0'
      }}>
        {children}
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ maxWidth: '850px', margin: '0 auto', paddingBottom: '4rem' }}>
      <button 
        onClick={() => navigate('/doa')} 
        style={{ 
          display: 'flex', alignItems: 'center', gap: '0.5rem', 
          background: 'none', border: 'none', color: '#e2e8f0', 
          cursor: 'pointer', marginBottom: '1.5rem', fontSize: '0.9rem',
          padding: 0
        }}
        onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
        onMouseOut={(e) => e.currentTarget.style.color = '#e2e8f0'}
      >
        <ArrowLeft size={16} /> Kembali ke Daftar Doa
      </button>

      {/* Main Container */}
      <div className="card-mobile" style={{ 
        padding: '2rem', 
        background: '#0a0f16',
        border: '1px solid rgba(255,255,255,0.08)', 
        borderRadius: '16px',
        marginBottom: '2rem'
      }}>
        
        {/* Header */}
        <div className="flex-col-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ 
              width: '42px', height: '42px', borderRadius: '50%', 
              background: 'rgba(16, 185, 129, 0.1)', color: '#10b981',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <BookOpen size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem', fontWeight: '600', color: '#fff' }}>
                {doa.nama}
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {doa.grup && (
                   <span style={{
                    padding: '0.25rem 0.8rem', borderRadius: '99px',
                    border: '1px solid rgba(16, 185, 129, 0.3)', 
                    background: 'rgba(16, 185, 129, 0.05)',
                    color: '#10b981', fontSize: '0.75rem', fontWeight: '500'
                  }}>{doa.grup}</span>
                )}
                {doa.tag && doa.tag.map((t, idx) => (
                  <span key={idx} style={{
                    padding: '0.25rem 0.8rem', borderRadius: '99px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    background: '#1d232c', color: '#cbd5e1', fontSize: '0.75rem', fontWeight: '500'
                  }}>{t}</span>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handleCopy} style={{ 
              display: 'flex', alignItems: 'center', gap: '0.4rem', 
              padding: '0.4rem 1rem', fontSize: '0.85rem', borderRadius: '99px',
              border: '1px solid #10b981', color: '#10b981', background: 'transparent',
              cursor: 'pointer', transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Copy size={14} /> Salin
            </button>
            <button onClick={handleShare} style={{ 
              display: 'flex', alignItems: 'center', gap: '0.4rem', 
              padding: '0.4rem 1rem', fontSize: '0.85rem', borderRadius: '99px',
              border: '1px solid #10b981', color: '#10b981', background: 'transparent',
              cursor: 'pointer', transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Share2 size={14} /> Bagikan
            </button>
          </div>
        </div>

        {/* Content Sections */}
        {doa.ar && (
          <SectionBox title="Teks Arab">
            <div style={{ fontSize: '2.25rem', fontFamily: 'serif', textAlign: 'right', direction: 'rtl', lineHeight: '1.8', wordWrap: 'break-word', whiteSpace: 'normal' }}>
              {doa.ar}
            </div>
          </SectionBox>
        )}

        {doa.tr && (
          <SectionBox title="Transliterasi">
            <div style={{ fontSize: '1rem', fontStyle: 'italic', color: '#cbd5e1', lineHeight: '1.7' }}>
              {doa.tr}
            </div>
          </SectionBox>
        )}

        {doa.idn && (
          <SectionBox title="Terjemahan">
            <div style={{ fontSize: '1rem', lineHeight: '1.7', color: '#e2e8f0' }}>
              {doa.idn}
            </div>
          </SectionBox>
        )}

        {doa.tentang && (
          <SectionBox title="Keterangan & Dalil" icon={Info}>
            <div style={{ fontSize: '0.95rem', lineHeight: '1.7', color: '#94a3b8' }}>
              {doa.tentang}
            </div>
          </SectionBox>
        )}
      </div>

      {/* Next Button */}
      {nextDoa && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4rem' }}>
          <button 
            style={{ 
              background: '#0a0f16',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '99px',
              padding: '0.75rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              color: '#fff',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onClick={() => navigate(`/doa/${nextDoa.id}`)}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseOut={(e) => e.currentTarget.style.background = '#0a0f16'}
          >
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.1rem' }}>Selanjutnya</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '500' }}>{nextDoa.nama.substring(0, 25)}{nextDoa.nama.length > 25 ? '...' : ''}</div>
            </div>
            <ChevronRight size={20} color="#10b981" />
          </button>
        </div>
      )}

      {/* Related Doa Section (Grid Layout) */}
      {relatedDoas.length > 0 && (
        <div className="mt-8">
          <h3 style={{ fontSize: '1.4rem', marginBottom: '1.5rem', fontWeight: '600' }}>
            Doa Lainnya dalam Kategori "{doa.grup}"
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
            gap: '1.25rem' 
          }}>
            {relatedDoas.map(related => (
              <div 
                key={related.id}
                onClick={() => navigate(`/doa/${related.id}`)}
                style={{
                  background: '#0d1117',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#151b23';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#0d1117';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                }}
              >
                <div style={{ 
                  background: 'rgba(16, 185, 129, 0.1)', color: '#10b981',
                  padding: '0.75rem', borderRadius: '12px', flexShrink: 0
                }}>
                  <BookOpen size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '1.05rem', margin: '0 0 0.4rem 0', color: '#fff', fontWeight: '500' }}>{related.nama}</h4>
                  <p style={{ 
                    fontSize: '0.85rem', color: '#94a3b8', margin: 0, 
                    display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.5'
                  }}>
                    {related.idn}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default DoaDetail;
