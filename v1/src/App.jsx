import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';

export default function TonePhase() {
  const [bpm, setBpm] = useState(60);
  const [rootFreq, setRootFreq] = useState(440);
  const [isPlaying, setIsPlaying] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0.3);
  const [volumes, setVolumes] = useState([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
  const [muted, setMuted] = useState([false, false, false, false, false, false, false]);
  const [timeScale, setTimeScale] = useState(3.0);
  const [frozen, setFrozen] = useState(false);

  const oscillatorsRef = useRef([]);
  const gainsRef = useRef([]);
  const masterGainRef = useRef(null);
  const analyserRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const scrollOffsetRef = useRef(0);

  const beatRatios = [0, 1, 2, 4, 8, 16, 32];

  const calculateFrequencies = () => {
    const beatHz = bpm / 60;
    return beatRatios.map((ratio, idx) => {
      if (idx === 0) return rootFreq;
      return rootFreq + (beatHz * ratio);
    });
  };

  const frequencies = calculateFrequencies();

  useEffect(() => {
    // Create analyzer
    analyserRef.current = new Tone.Analyser('waveform', 2048);

    // Create master gain and connect to analyzer, then to destination
    masterGainRef.current = new Tone.Gain(masterVolume);
    masterGainRef.current.connect(analyserRef.current);
    masterGainRef.current.toDestination();

    frequencies.forEach((freq, idx) => {
      const osc = new Tone.Oscillator(freq, 'sine').start();
      const gain = new Tone.Gain(0).connect(masterGainRef.current);
      osc.connect(gain);

      oscillatorsRef.current[idx] = osc;
      gainsRef.current[idx] = gain;
    });

    return () => {
      oscillatorsRef.current.forEach(osc => osc.dispose());
      gainsRef.current.forEach(gain => gain.dispose());
      if (masterGainRef.current) masterGainRef.current.dispose();
      if (analyserRef.current) analyserRef.current.dispose();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  useEffect(() => {
    frequencies.forEach((freq, idx) => {
      if (oscillatorsRef.current[idx]) {
        oscillatorsRef.current[idx].frequency.rampTo(freq, 0.1);
      }
    });
  }, [bpm, rootFreq]);

  // Randomize volumes on initial load
  useEffect(() => {
    randomizeVolumes();
  }, []);

  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.rampTo(masterVolume, 0.05);
    }
  }, [masterVolume]);

  useEffect(() => {
    volumes.forEach((vol, idx) => {
      if (gainsRef.current[idx]) {
        const actualGain = (isPlaying && !muted[idx]) ? vol : 0;
        gainsRef.current[idx].gain.rampTo(actualGain, 0.05);
      }
    });
  }, [volumes, isPlaying, muted]);

  // Oscilloscope visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserRef.current) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      const data = analyserRef.current.getValue();

      // Check for clipping (values near ±1.0)
      let isClipping = false;
      for (let i = 0; i < data.length; i++) {
        if (Math.abs(data[i]) > 0.95) {
          isClipping = true;
          break;
        }
      }

      // Auto-reduce master volume if clipping detected
      if (isClipping && masterVolume > 0.1) {
        setMasterVolume(prev => Math.max(0.1, prev * 0.95));
      }

      // Clear canvas
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, width, height);

      // Draw waveform
      ctx.strokeStyle = isClipping ? '#dc2626' : '#d1d5db'; // Red if clipping
      ctx.lineWidth = 2;
      ctx.beginPath();

      // Calculate how many samples to display based on time scale (zoom)
      const samplesToShow = Math.min(
        Math.floor(data.length / timeScale),
        data.length
      );
      const sliceWidth = width / samplesToShow;
      let x = 0;

      for (let i = 0; i < samplesToShow; i++) {
        const v = (data[i] + 1) / 2; // Normalize from [-1, 1] to [0, 1]
        const y = v * height;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.stroke();
    };

    if (isPlaying) {
      if (!frozen) {
        draw();
      } else {
        // Draw one static frame when frozen
        const data = analyserRef.current.getValue();
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = '#d1d5db';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const samplesToShow = Math.min(Math.floor(data.length / timeScale), data.length);
        const sliceWidth = width / samplesToShow;
        let x = 0;
        for (let i = 0; i < samplesToShow; i++) {
          const v = (data[i] + 1) / 2;
          const y = v * height;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();
      }
    } else {
      // Draw flat line when not playing
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = '#404040';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, timeScale, frozen]);

  const togglePlay = async () => {
    if (!isPlaying) {
      await Tone.start();
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

  const handleVolumeChange = (idx, value) => {
    const newVolumes = [...volumes];
    newVolumes[idx] = parseFloat(value);
    setVolumes(newVolumes);
  };

  const toggleMute = (idx) => {
    const newMuted = [...muted];
    newMuted[idx] = !newMuted[idx];
    setMuted(newMuted);
  };

  const randomizeVolumes = () => {
    const newVolumes = [...volumes];
    // Randomize oscillators 1-5 (×1 through ×16) with max 75%
    for (let i = 1; i <= 5; i++) {
      newVolumes[i] = Math.random() * 0.75;
    }
    // Set ×32 (index 6) to 0
    newVolumes[6] = 0;
    setVolumes(newVolumes);
  };

  const getOscillatorLabel = (idx) => {
    if (idx === 0) return 'Root';
    return `×${beatRatios[idx]}`;
  };

  const getBeatFrequency = (idx) => {
    if (idx === 0) return 0;
    return (bpm / 60) * beatRatios[idx];
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #000000, #1a1a1a, #000000)',
      color: 'white',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    maxWidth: {
      maxWidth: '56rem',
      margin: '0 auto',
    },
    header: {
      textAlign: 'center',
      marginBottom: '2rem',
    },
    title: {
      fontSize: '3rem',
      fontWeight: 'bold',
      marginBottom: '0.5rem',
      background: 'linear-gradient(to right, #ffffff, #d1d5db)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    subtitle: {
      color: '#9ca3af',
      fontSize: '1rem',
    },
    card: {
      background: 'rgba(30, 30, 30, 0.8)',
      backdropFilter: 'blur(8px)',
      borderRadius: '0.5rem',
      padding: '1.5rem',
      marginBottom: '1.5rem',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
      border: '1px solid #2a2a2a',
    },
    inputGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '1.5rem',
      marginBottom: '1.5rem',
    },
    inputGroup: {
      display: 'flex',
      flexDirection: 'column',
    },
    label: {
      fontSize: '0.875rem',
      fontWeight: '500',
      marginBottom: '0.5rem',
      color: '#e5e7eb',
    },
    input: {
      width: '100%',
      background: '#1a1a1a',
      border: '1px solid #404040',
      borderRadius: '0.375rem',
      padding: '0.5rem 1rem',
      color: 'white',
      fontSize: '1rem',
    },
    button: {
      width: '100%',
      padding: '0.75rem',
      borderRadius: '0.5rem',
      fontWeight: '600',
      fontSize: '1.125rem',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    buttonPlaying: {
      background: 'linear-gradient(to right, #4a4a4a, #2a2a2a)',
    },
    buttonStopped: {
      background: 'linear-gradient(to right, #6b7280, #4b5563)',
    },
    randomButton: {
      background: 'linear-gradient(to right, #525252, #404040)',
      marginTop: '1rem',
    },
    rangeContainer: {
      width: '100%',
    },
    range: {
      width: '100%',
      height: '0.5rem',
      background: '#334155',
      borderRadius: '0.5rem',
      outline: 'none',
      cursor: 'pointer',
    },
    volumeText: {
      textAlign: 'right',
      fontSize: '0.875rem',
      color: '#9ca3af',
      marginTop: '0.25rem',
    },
    canvas: {
      width: '100%',
      height: '120px',
      borderRadius: '0.375rem',
      background: '#1a1a1a',
      border: '1px solid #404040',
    },
    oscillatorList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    },
    oscillator: {
      background: 'rgba(51, 65, 85, 0.5)',
      borderRadius: '0.5rem',
      padding: '1rem',
    },
    oscillatorContent: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
    },
    muteButton: {
      width: '2.5rem',
      height: '2.5rem',
      borderRadius: '0.375rem',
      border: 'none',
      cursor: 'pointer',
      fontSize: '1rem',
      flexShrink: 0,
      transition: 'all 0.2s',
    },
    muteButtonActive: {
      background: '#dc2626',
      color: 'white',
    },
    muteButtonInactive: {
      background: '#475569',
      color: '#d1d5db',
    },
    sliderSection: {
      flex: 1,
    },
    oscillatorHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '0.5rem',
    },
    oscillatorInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
    },
    oscillatorLabel: {
      fontWeight: '600',
      fontSize: '1.125rem',
      color: '#f3f4f6',
      width: '3rem',
    },
    frequencyText: {
      fontSize: '0.875rem',
      color: '#d1d5db',
    },
    beatText: {
      fontSize: '0.75rem',
      color: '#9ca3af',
    },
    footer: {
      marginTop: '1.5rem',
      textAlign: 'center',
      fontSize: '0.875rem',
      color: '#9ca3af',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.maxWidth}>
        <div style={styles.header}>
          <h1 style={styles.title}>TonePhase</h1>
          <p style={styles.subtitle}>Binaural Beat Generator</p>
        </div>

        <div style={styles.card}>
          <div style={styles.inputGrid}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>BPM (Beats Per Minute)</label>
              <input
                type="number"
                value={bpm}
                onChange={(e) => setBpm(parseFloat(e.target.value) || 0)}
                style={styles.input}
                min="1"
                max="300"
              />
              <input
                type="range"
                min="1"
                max="300"
                step="1"
                value={bpm}
                onChange={(e) => setBpm(parseFloat(e.target.value))}
                style={{ ...styles.range, marginTop: '0.5rem' }}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Root Frequency (Hz)</label>
              <input
                type="number"
                value={rootFreq}
                onChange={(e) => setRootFreq(parseFloat(e.target.value) || 0)}
                style={styles.input}
                min="20"
                max="2000"
                step="0.01"
              />
              <input
                type="range"
                min="20"
                max="2000"
                step="0.1"
                value={rootFreq}
                onChange={(e) => setRootFreq(parseFloat(e.target.value))}
                style={{ ...styles.range, marginTop: '0.5rem' }}
              />
            </div>
          </div>

          <button
            onClick={togglePlay}
            style={{
              ...styles.button,
              ...(isPlaying ? styles.buttonPlaying : styles.buttonStopped),
            }}
          >
            {isPlaying ? '⏸ Stop' : '▶ Play'}
          </button>
        </div>

        <div style={styles.card}>
          <label style={styles.label}>Waveform</label>
          <canvas
            ref={canvasRef}
            width={800}
            height={120}
            style={styles.canvas}
          />

          {/* Time Scale Control */}
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <label style={{ ...styles.label, margin: 0, fontSize: '0.75rem' }}>Time Scale</label>
                <button
                  onClick={() => setFrozen(!frozen)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    background: frozen ? '#dc2626' : '#404040',
                    color: 'white',
                    transition: 'all 0.2s',
                  }}
                  title={frozen ? 'Unfreeze' : 'Freeze'}
                >
                  {frozen ? '❄️ Frozen' : '▶️ Live'}
                </button>
              </div>
              <span style={styles.beatText}>
                {timeScale < 1.0 ? 'Zoomed In' : timeScale === 1.0 ? 'Normal' : 'Zoomed Out'}
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="10.0"
              step="0.5"
              value={timeScale}
              onChange={(e) => setTimeScale(parseFloat(e.target.value))}
              style={styles.range}
            />
          </div>
        </div>

        <div style={styles.card}>
          <label style={styles.label}>Master Volume</label>
          <div style={styles.rangeContainer}>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={masterVolume}
              onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
              style={styles.range}
            />
            <div style={styles.volumeText}>{Math.round(masterVolume * 100)}%</div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ ...styles.label, fontSize: '1.25rem', margin: 0 }}>
              Oscillators
            </h2>
            <button
              onClick={randomizeVolumes}
              style={{ ...styles.button, ...styles.randomButton, width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
            >
              🎲 Randomize
            </button>
          </div>
          <div style={styles.oscillatorList}>
            {frequencies.map((freq, idx) => (
              <div key={idx} style={styles.oscillator}>
                <div style={styles.oscillatorContent}>
                  <button
                    onClick={() => toggleMute(idx)}
                    style={{
                      ...styles.muteButton,
                      ...(muted[idx] ? styles.muteButtonActive : styles.muteButtonInactive),
                    }}
                    title={muted[idx] ? 'Unmute' : 'Mute'}
                  >
                    {muted[idx] ? '🔇' : '🔊'}
                  </button>
                  <div style={styles.sliderSection}>
                    <div style={styles.oscillatorHeader}>
                      <div style={styles.oscillatorInfo}>
                        <span style={styles.oscillatorLabel}>
                          {getOscillatorLabel(idx)}
                        </span>
                        <span style={styles.frequencyText}>
                          {freq.toFixed(2)} Hz
                        </span>
                        {idx > 0 && (
                          <span style={styles.beatText}>
                            (beat: {getBeatFrequency(idx).toFixed(2)} Hz)
                          </span>
                        )}
                      </div>
                      <span style={styles.beatText}>
                        {Math.round(volumes[idx] * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volumes[idx]}
                      onChange={(e) => handleVolumeChange(idx, e.target.value)}
                      style={styles.range}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.footer}>
          <p>Beat frequency formula: beat_hz = |freq₁ - freq₂|</p>
          <p style={{ marginTop: '0.25rem' }}>
            Adjust individual oscillator volumes to create your desired beating patterns
          </p>
        </div>
      </div>
    </div>
  );
}
