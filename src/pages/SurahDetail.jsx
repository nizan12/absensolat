import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Search, Copy, Bookmark, Share2, ArrowRight, Languages, Type, Volume2, SkipBack, SkipForward, Repeat, X, Maximize2, CheckCircle } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const SurahDetail = () => {
  const { currentUser } = useAuth();
  const { surahId } = useParams();
  const navigate = useNavigate();
  
  const [allSurahs, setAllSurahs] = useState([]);
  const [filteredSidebar, setFilteredSidebar] = useState([]);
  const [surah, setSurah] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarSearch, setSidebarSearch] = useState('');
  
  // Controls
  const [showTransliteration, setShowTransliteration] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [selectedAyatFilter, setSelectedAyatFilter] = useState('Semua');
  const [selectedQari, setSelectedQari] = useState('05'); // 05 is Misyari Rasyid
  
  // Ayat Audio state
  const [playingAyat, setPlayingAyat] = useState(null);
  const audioRef = useRef(new Audio());

  // Full Audio Player state
  const [showFullPlayer, setShowFullPlayer] = useState(false);
  const [fullAudioPlaying, setFullAudioPlaying] = useState(false);
  const [fullAudioProgress, setFullAudioProgress] = useState(0);
  const [fullAudioCurrentTime, setFullAudioCurrentTime] = useState(0);
  const [fullAudioDuration, setFullAudioDuration] = useState(0);
  const [playingAudioSurah, setPlayingAudioSurah] = useState(null);
  const fullAudioRef = useRef(new Audio());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const allRes = await fetch('https://equran.id/api/v2/surat');
        const allJson = await allRes.json();
        setAllSurahs(allJson.data);
        setFilteredSidebar(allJson.data);

        const detailRes = await fetch(`https://equran.id/api/v2/surat/${surahId}`);
        if (!detailRes.ok) throw new Error('Gagal mengambil detail surat');
        const detailJson = await detailRes.json();
        setSurah(detailJson.data);
        setSelectedAyatFilter('Semua');
        
        // Reset full player if switching surahs and it wasn't explicitly started, or just update the UI identity.
        setPlayingAudioSurah(detailJson.data); // Always default UI player to current surah
        if (showFullPlayer && fullAudioPlaying) {
          fullAudioRef.current.pause();
          setFullAudioPlaying(false);
        }

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    window.scrollTo(0, 0);
    
    return () => {
      audioRef.current.pause();
      audioRef.current.src = '';
      fullAudioRef.current.pause();
      fullAudioRef.current.src = '';
    };
  }, [surahId]);

  useEffect(() => {
    if (allSurahs.length > 0) {
      setFilteredSidebar(allSurahs.filter(s => 
        s.namaLatin.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
        s.arti.toLowerCase().includes(sidebarSearch.toLowerCase())
      ));
    }
  }, [sidebarSearch, allSurahs]);

  // Full Audio Event Listeners
  useEffect(() => {
    const fullAudio = fullAudioRef.current;
    
    const updateTime = () => {
      setFullAudioCurrentTime(fullAudio.currentTime);
      if (fullAudio.duration) {
        setFullAudioProgress((fullAudio.currentTime / fullAudio.duration) * 100);
      }
    };
    
    const updateDuration = () => setFullAudioDuration(fullAudio.duration);
    const handleEnded = () => { setFullAudioPlaying(false); setFullAudioProgress(0); setFullAudioCurrentTime(0); };

    fullAudio.addEventListener('timeupdate', updateTime);
    fullAudio.addEventListener('loadedmetadata', updateDuration);
    fullAudio.addEventListener('ended', handleEnded);

    return () => {
      fullAudio.removeEventListener('timeupdate', updateTime);
      fullAudio.removeEventListener('loadedmetadata', updateDuration);
      fullAudio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * fullAudioDuration;
    fullAudioRef.current.currentTime = newTime;
    setFullAudioCurrentTime(newTime);
    setFullAudioProgress(percent * 100);
  };

  const handlePagePlayToggle = () => {
    if (!surah) return;
    
    // If player is on a different surah track, switch it to current page's surah
    if (playingAudioSurah?.nomor !== surah.nomor) {
      setPlayingAudioSurah(surah);
      fullAudioRef.current.src = surah.audioFull[selectedQari];
      fullAudioRef.current.play();
      setFullAudioPlaying(true);
      setShowFullPlayer(true);
      return;
    }

    if (fullAudioPlaying) {
      fullAudioRef.current.pause();
      setFullAudioPlaying(false);
    } else {
      if (playingAyat) {
        audioRef.current.pause();
        setPlayingAyat(null);
      }
      if (fullAudioRef.current.src !== surah.audioFull[selectedQari]) {
        fullAudioRef.current.src = surah.audioFull[selectedQari];
      }
      fullAudioRef.current.play();
      setFullAudioPlaying(true);
    }
    setShowFullPlayer(true);
  };

  const playNextTrack = () => {
    if (!playingAudioSurah) return;
    const currentNum = playingAudioSurah.nomor;
    if (currentNum >= 114) return;
    
    const nextS = allSurahs.find(s => s.nomor === currentNum + 1);
    if (nextS) {
      setPlayingAudioSurah(nextS);
      fullAudioRef.current.src = nextS.audioFull[selectedQari];
      fullAudioRef.current.play();
      setFullAudioPlaying(true);
    }
  };

  const playPrevTrack = () => {
    if (!playingAudioSurah) return;
    const currentNum = playingAudioSurah.nomor;
    if (currentNum <= 1) return;
    
    const prevS = allSurahs.find(s => s.nomor === currentNum - 1);
    if (prevS) {
      setPlayingAudioSurah(prevS);
      fullAudioRef.current.src = prevS.audioFull[selectedQari];
      fullAudioRef.current.play();
      setFullAudioPlaying(true);
    }
  };

  const togglePlayerGlobalPlay = () => {
    if (!playingAudioSurah) return;
    
    if (fullAudioPlaying) {
      fullAudioRef.current.pause();
      setFullAudioPlaying(false);
    } else {
      if (playingAyat) {
        audioRef.current.pause();
        setPlayingAyat(null);
      }
      if (!fullAudioRef.current.src || fullAudioRef.current.src !== playingAudioSurah.audioFull[selectedQari]) {
        fullAudioRef.current.src = playingAudioSurah.audioFull[selectedQari];
      }
      fullAudioRef.current.play();
      setFullAudioPlaying(true);
    }
  };

  const [bookmarkedStr, setBookmarkedStr] = useState(null);

  const handleBookmark = async (ayat) => {
    if (!currentUser) {
      alert("Anda harus login untuk menyimpan progres bacaan.");
      return;
    }
    try {
      const historyId = `${currentUser.uid}_${surahId}`;
      await setDoc(doc(db, 'quran_history', historyId), {
        userId: currentUser.uid,
        surahId: surah.nomor,
        surahName: surah.namaLatin,
        ayatNumber: ayat.nomorAyat,
        timestamp: serverTimestamp() // will be converted on fetching
      });
      setBookmarkedStr(`Tersimpan: QS ${surah.nomor}:${ayat.nomorAyat}`);
      setTimeout(() => setBookmarkedStr(null), 3000);
    } catch (err) {
      console.error("Gagal menyimpan penanda:", err);
      alert("Gagal menandai halaman. Periksa koneksi Anda.");
    }
  };

  const handleAyatSelection = (value) => {
    setSelectedAyatFilter(value);
    if (value !== 'Semua') {
      const ayatNum = value.replace('Ayat ', '');
      const element = document.getElementById(`ayat-${ayatNum}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const toggleAudio = (ayatNumber, audioUrl) => {
    // Pause full audio if playing
    if (fullAudioPlaying) {
      fullAudioRef.current.pause();
      setFullAudioPlaying(false);
    }

    if (playingAyat === ayatNumber) {
      if (audioRef.current.paused) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
        setPlayingAyat(null);
      }
    } else {
      audioRef.current.pause();
      audioRef.current.src = audioUrl;
      audioRef.current.play();
      setPlayingAyat(ayatNumber);
      audioRef.current.onended = () => setPlayingAyat(null);
    }
  };

  const handleCopy = (ayat) => {
    const text = `${ayat.teksArab}\n\n${ayat.teksLatin}\n\nArtinya: ${ayat.teksIndonesia}`;
    navigator.clipboard.writeText(text);
    alert(`Ayat ${ayat.nomorAyat} disalin!`);
  };

  if (loading) return <div className="text-center py-8 text-secondary">Memuat data Al-Quran...</div>;
  if (error) return <div className="text-center text-danger py-8">{error}</div>;
  if (!surah) return null;

  const nextSurahId = Number(surahId) < 114 ? Number(surahId) + 1 : null;
  const ayatOptions = ['Semua', ...surah.ayat.map(a => `Ayat ${a.nomorAyat}`)];

  const qariOptions = [
    { value: '05', label: 'Misyari Rasyid Al-Afasi' },
    { value: '01', label: 'Abdullah Al-Juhany' },
    { value: '02', label: 'Abdul Muhsin Al-Qasim' },
    { value: '03', label: 'Abdurrahman as-Sudais' },
    { value: '04', label: 'Ibrahim Al-Dawsari' }
  ];

  const CustomToggle = ({ label, checked, onChange }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e2e8f0', fontSize: '0.9rem', fontWeight: '500' }}>
      <span>{label}</span>
      <div 
        onClick={onChange}
        style={{
          width: '36px', height: '20px', background: checked ? '#0ca46d' : '#1d232c', 
          borderRadius: '99px', position: 'relative', cursor: 'pointer',
          transition: 'background 0.2s'
        }}
      >
        <div style={{
          width: '16px', height: '16px', background: '#fff', borderRadius: '50%',
          position: 'absolute', top: '2px', left: checked ? '18px' : '2px',
          transition: 'left 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}></div>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in flex-col-mobile" style={{ 
      maxWidth: '1200px', margin: '0 auto', paddingBottom: showFullPlayer ? '8rem' : '4rem',
      display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start'
    }}>
      
      {/* SIDEBAR */}
      <div className="hide-mobile" style={{ 
        flex: '0 0 320px', 
        display: 'flex', flexDirection: 'column', gap: '1rem',
        height: '85vh', position: 'sticky', top: '20px'
      }}>
        <h3 style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '0.5rem' }}>Daftar Surat</h3>
        
        <div style={{ position: 'relative', zIndex: 90 }}>
          <input 
            type="text" 
            style={{ 
              width: '100%', padding: '0.8rem 1rem 0.8rem 2.5rem', 
              background: '#0a0f16', border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '12px', color: '#fff', outline: 'none'
            }}
            placeholder="Cari surat..."
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
          />
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)' }} />
        </div>

        <div style={{ 
          overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem',
          paddingRight: '0.5rem',
          scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent'
        }}>
          {filteredSidebar.map(s => {
            const isActive = s.nomor.toString() === surahId.toString();
            return (
              <div 
                key={s.nomor}
                onClick={() => navigate(`/quran/${s.nomor}`)}
                style={{
                  padding: '1rem', borderRadius: '12px', cursor: 'pointer',
                  background: isActive ? '#0a1a16' : 'transparent',
                  border: isActive ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid transparent',
                  borderLeft: isActive ? '4px solid #10b981' : '4px solid transparent',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  transition: 'all 0.2s',
                  color: isActive ? '#10b981' : '#e2e8f0'
                }}
                onMouseOver={(e) => !isActive && (e.currentTarget.style.background = '#0a0f16')}
                onMouseOut={(e) => !isActive && (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ 
                    width: '32px', height: '32px', borderRadius: '50%', 
                    border: isActive ? '1px solid #10b981' : '1px solid #b45309',
                    color: isActive ? '#10b981' : '#b45309',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.85rem', fontWeight: '600'
                  }}>
                    {s.nomor}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '0.95rem', color: isActive ? '#10b981' : '#fff' }}>
                      {s.namaLatin}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {s.tempatTurun} • {s.jumlahAyat}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '1.25rem', fontFamily: 'serif', color: isActive ? '#10b981' : '#10b981' }}>
                  {s.nama}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="full-width-mobile" style={{ flex: '1 1 600px', display: 'flex', flexDirection: 'column', gap: '1.5rem', zIndex: 10 }}>
        <button 
          onClick={() => navigate('/quran')} 
          style={{ 
            display: 'flex', alignItems: 'center', gap: '0.5rem', 
            background: 'none', border: 'none', color: '#e2e8f0', 
            cursor: 'pointer', fontSize: '0.9rem', marginBottom: '0.5rem', padding: 0
          }}
        >
          <ArrowLeft size={16} /> Kembali ke Kumpulan Surat
        </button>

        {/* Header Surah Box */}
        <div className="surah-header-mobile" style={{
          background: '#0a0f16', border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '16px', padding: '1.5rem', 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ 
              width: '40px', height: '40px', borderRadius: '50%', 
              border: '1px solid #b45309', color: '#b45309',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem', fontWeight: '600'
            }}>
              {surah.nomor}
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', color: '#fff', margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {surah.namaLatin} <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: '400' }}>• {surah.arti}</span>
              </h2>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                {surah.tempatTurun} • {surah.jumlahAyat} Ayat
              </div>
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontFamily: 'serif', color: '#10b981' }}>
            {surah.nama}
          </div>
        </div>

        {/* Controls Row */}
        <div style={{ 
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem',
          paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)',
          position: 'relative', zIndex: 100
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', color: '#e2e8f0' }}>Ayat:</span>
            <div style={{ minWidth: '100px' }}>
              <CustomSelect 
                options={ayatOptions} 
                value={selectedAyatFilter} 
                onChange={handleAyatSelection} 
                placeholder="Semua" 
              />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 230px' }}>
            <span style={{ fontSize: '0.9rem', color: '#e2e8f0' }}>Qari:</span>
            <div style={{ flex: 1, minWidth: '180px' }}>
              {/* Qari mapping */}
              <CustomSelect
                value={selectedQari}
                onChange={(val) => setSelectedQari(val)}
                options={qariOptions}
                placeholder="Pilih Qari"
              />
            </div>
          </div>
          
          <div style={{ flexGrow: 1 }} className="hide-mobile"></div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <CustomToggle 
              label={<span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Languages size={15} color="#94a3b8" /> Transliterasi</span>} 
              checked={showTransliteration} 
              onChange={() => setShowTransliteration(!showTransliteration)} 
            />
            <CustomToggle 
              label={<span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Type size={16} color="#94a3b8" /> Terjemahan</span>} 
              checked={showTranslation} 
              onChange={() => setShowTranslation(!showTranslation)} 
            />
            
            <button 
              onClick={handlePagePlayToggle}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '0.5rem', 
                background: 'transparent', border: 'none', color: '#10b981', 
                cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500',
                padding: 0
              }}
            >
              {(fullAudioPlaying && playingAudioSurah?.nomor === surah.nomor) ? <Pause size={16} /> : <Play size={16} />} 
              {(fullAudioPlaying && playingAudioSurah?.nomor === surah.nomor) ? ' Pause Audio Full' : ' Play Audio Full'}
            </button>
          </div>
        </div>

        {/* Bismillah Header */}
        {surah.nomor !== 1 && surah.nomor !== 9 && (
          <div style={{ fontSize: '2rem', fontFamily: 'serif', padding: '1rem 0', textAlign: 'center', color: '#fff' }}>
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </div>
        )}

        {/* Ayat List */}
        <div>
          {surah.ayat.map((ayat) => (
            <div key={ayat.nomorAyat} id={`ayat-${ayat.nomorAyat}`} style={{ 
              background: '#0d1117', border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '16px', padding: '1.5rem', marginBottom: '1rem',
              transition: 'all 0.3s',
              boxShadow: selectedAyatFilter === `Ayat ${ayat.nomorAyat}` ? '0 0 15px rgba(16, 185, 129, 0.2)' : 'none',
              borderColor: selectedAyatFilter === `Ayat ${ayat.nomorAyat}` ? 'rgba(16, 185, 129, 0.5)' : 'rgba(255,255,255,0.05)'
            }}>
              {/* Action Buttons Row */}
              <div className="surah-ayat-action-mobile" style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ 
                  width: '32px', height: '32px', borderRadius: '50%', 
                  border: '1px solid #b45309', color: '#b45309',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.85rem', fontWeight: '600'
                }}>
                  {ayat.nomorAyat}
                </div>
                
                <button 
                  onClick={() => toggleAudio(ayat.nomorAyat, ayat.audio[selectedQari])}
                  style={{ background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer', padding: 0 }}
                >
                  {playingAyat === ayat.nomorAyat ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <button style={{ background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer', padding: 0 }}>
                  <ArrowRight size={18} />
                </button>
                <button onClick={() => handleCopy(ayat)} style={{ background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer', padding: 0 }}>
                  <Copy size={16} />
                </button>
                <button onClick={() => handleBookmark(ayat)} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', padding: 0 }} title="Tandai Terakhir Dibaca">
                  <Bookmark size={16} />
                </button>
                <button style={{ background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer', padding: 0 }}>
                  <Share2 size={16} />
                </button>
                
                {bookmarkedStr === `Tersimpan: QS ${surah.nomor}:${ayat.nomorAyat}` && (
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#10b981', fontSize: '0.8rem' }}>
                    <CheckCircle size={14} /> Tersimpan
                  </div>
                )}
              </div>

              {/* Text rendering */}
              <div style={{ fontSize: '2.5rem', fontFamily: 'serif', textAlign: 'right', direction: 'rtl', lineHeight: '2', color: '#fff', marginBottom: '1.5rem', wordWrap: 'break-word', whiteSpace: 'normal' }}>
                {ayat.teksArab}
              </div>

              {showTransliteration && (
                <div style={{ fontSize: '1rem', color: '#cbd5e1', marginBottom: '0.8rem', fontStyle: 'italic', lineHeight: '1.6' }}>
                  {ayat.teksLatin}
                </div>
              )}

              {showTranslation && (
                <div style={{ fontSize: '0.95rem', color: '#e2e8f0', lineHeight: '1.6' }}>
                  {ayat.teksIndonesia}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer Navigation */}
        {nextSurahId && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button 
              onClick={() => navigate(`/quran/${nextSurahId}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', 
                background: 'transparent', border: 'none', color: '#e2e8f0', 
                cursor: 'pointer', fontSize: '0.9rem'
              }}
            >
              Surat Selanjutnya <ArrowRight size={16} />
            </button>
          </div>
        )}

      </div>

      {/* FULL AUDIO PLAYER FOOTER via Portal */}
      {showFullPlayer && playingAudioSurah && createPortal(
        <div className="audio-player-mobile" style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
          background: '#0a0f16', borderTop: '1px solid rgba(255,255,255,0.05)',
          padding: '1rem 2rem', display: 'flex', alignItems: 'center', gap: '2rem',
          boxShadow: '0 -10px 30px rgba(0,0,0,0.5)'
        }}>
          
          {/* Player Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '250px' }}>
            <div style={{ 
              width: '40px', height: '40px', borderRadius: '50%', background: '#10b981',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0a0f16'
            }}>
              <Volume2 size={20} />
            </div>
            <div>
              <div style={{ fontWeight: '600', color: '#fff', fontSize: '0.95rem' }}>{playingAudioSurah.namaLatin}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                {selectedQari === '05' ? 'Misyari Rasyid Al-Afasi' : 
                 selectedQari === '01' ? 'Abdullah Al-Juhany' : 
                 selectedQari === '02' ? 'Abdul Muhsin Al-Qasim' : 
                 selectedQari === '03' ? 'Abdurrahman as-Sudais' : 'Ibrahim Al-Dawsari'}
              </div>
            </div>
          </div>

          {/* Player Controls & Progress */}
          <div className="full-width-mobile" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <button 
                onClick={playPrevTrack}
                style={{ background: 'none', border: 'none', color: playingAudioSurah.nomor > 1 ? '#cbd5e1' : '#334155', cursor: playingAudioSurah.nomor > 1 ? 'pointer' : 'default', padding: 0 }} 
              >
                <SkipBack size={20} />
              </button>
              <button style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: 0 }}>
                <Repeat size={18} />
              </button>
              
              <button 
                onClick={togglePlayerGlobalPlay}
                style={{ 
                  width: '44px', height: '44px', borderRadius: '12px', background: '#10b981', 
                  color: '#0a0f16', border: 'none', cursor: 'pointer', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                {fullAudioPlaying ? <Pause size={24} /> : <Play size={24} style={{ marginLeft: '2px' }} />}
              </button>
              
              <button 
                onClick={playNextTrack}
                style={{ background: 'none', border: 'none', color: playingAudioSurah.nomor < 114 ? '#cbd5e1' : '#334155', cursor: playingAudioSurah.nomor < 114 ? 'pointer' : 'default', padding: 0 }} 
              >
                <SkipForward size={20} />
              </button>
              <button style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: 0 }}>
                <Volume2 size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', maxWidth: '600px' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', minWidth: '35px', textAlign: 'right' }}>
                {formatTime(fullAudioCurrentTime)}
              </span>
              
              <div 
                style={{ flex: 1, height: '4px', background: '#1d232c', borderRadius: '4px', cursor: 'pointer', position: 'relative' }}
                onClick={handleSeek}
              >
                <div style={{ 
                  position: 'absolute', top: 0, left: 0, bottom: 0, 
                  background: '#10b981', borderRadius: '4px', width: `${fullAudioProgress}%`
                }}>
                  <div style={{
                    width: '12px', height: '12px', background: '#10b981', borderRadius: '50%',
                    position: 'absolute', right: '-6px', top: '50%', transform: 'translateY(-50%)',
                    boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)'
                  }}></div>
                </div>
              </div>

              <span style={{ fontSize: '0.75rem', color: '#94a3b8', minWidth: '35px' }}>
                {formatTime(fullAudioDuration)}
              </span>
            </div>
          </div>

          {/* Player Actions */}
          <div className="player-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '100px', justifyContent: 'flex-end' }}>
            <button style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}>
              <Maximize2 size={18} />
            </button>
            <button 
              onClick={() => { setShowFullPlayer(false); fullAudioRef.current.pause(); setFullAudioPlaying(false); }}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
            >
              <X size={20} />
            </button>
          </div>
          
        </div>
      , document.body)}

    </div>
  );
};

export default SurahDetail;
