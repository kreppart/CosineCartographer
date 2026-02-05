import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';

// Custom rotary knob component for LFO controls
// When commitOnRelease is true, onChange is only called when the user releases the knob
function Knob({ value, onChange, min, max, label, formatValue, size = 36, exponential = false, commitOnRelease = false }) {
  const knobRef = useRef(null);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startPositionRef = useRef(0); // Store normalized position (0-1)
  const onChangeRef = useRef(onChange);
  const [previewValue, setPreviewValue] = useState(null); // For visual preview during drag

  // Convert between linear position (0-1) and actual value
  const valueToPosition = (val) => {
    if (exponential && min > 0) {
      // Exponential: position = log(value/min) / log(max/min)
      return Math.log(val / min) / Math.log(max / min);
    }
    return (val - min) / (max - min);
  };

  const positionToValue = (pos) => {
    if (exponential && min > 0) {
      // Exponential: value = min * (max/min)^position
      return min * Math.pow(max / min, pos);
    }
    return min + pos * (max - min);
  };

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const handleMouseDown = (e) => {
    e.preventDefault();
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    startPositionRef.current = valueToPosition(value);
    if (commitOnRelease) {
      setPreviewValue(value);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingRef.current) return;

      const deltaY = startYRef.current - e.clientY;
      const sensitivity = 1 / 100; // 100px for full range
      let newPosition = startPositionRef.current + (deltaY * sensitivity);
      newPosition = Math.max(0, Math.min(1, newPosition));
      const newValue = positionToValue(newPosition);

      if (commitOnRelease) {
        setPreviewValue(newValue);
      } else {
        onChangeRef.current(newValue);
      }
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current && commitOnRelease && previewValue !== null) {
        onChangeRef.current(previewValue);
        setPreviewValue(null);
      }
      isDraggingRef.current = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [min, max, exponential, commitOnRelease, previewValue]);

  // Use preview value for display during drag, otherwise use actual value
  const displayValue = previewValue !== null ? previewValue : value;

  // Calculate rotation angle (from -135 to 135 degrees)
  const percentage = valueToPosition(displayValue);
  const rotation = -135 + (percentage * 270);

  const knobStyles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2px',
    },
    label: {
      fontSize: '0.5rem',
      color: '#9ca3af',
      textTransform: 'uppercase',
      letterSpacing: '0.025em',
    },
    knobOuter: {
      width: size,
      height: size,
      borderRadius: '50%',
      background: 'linear-gradient(145deg, #2a2a2a, #1a1a1a)',
      boxShadow: '0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      userSelect: 'none',
    },
    knobInner: {
      width: size - 8,
      height: size - 8,
      borderRadius: '50%',
      background: 'linear-gradient(145deg, #404040, #2a2a2a)',
      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transform: `rotate(${rotation}deg)`,
      transition: isDraggingRef.current ? 'none' : 'transform 0.05s',
    },
    indicator: {
      width: '2px',
      height: (size - 8) / 2 - 4,
      background: '#22d3ee',
      borderRadius: '1px',
      marginBottom: 'auto',
      marginTop: '3px',
      boxShadow: '0 0 4px #22d3ee',
    },
    value: {
      fontSize: '0.45rem',
      color: '#d1d5db',
      marginTop: '1px',
    },
  };

  return (
    <div style={knobStyles.container}>
      <div style={knobStyles.label}>{label}</div>
      <div
        ref={knobRef}
        style={knobStyles.knobOuter}
        onMouseDown={handleMouseDown}
      >
        <div style={knobStyles.knobInner}>
          <div style={knobStyles.indicator} />
        </div>
      </div>
      <div style={knobStyles.value}>{formatValue(displayValue)}</div>
    </div>
  );
}

// Custom vertical slider component with optional animated display value
function VerticalSlider({ value, displayValue, onChange, min = 0, max = 1, step = 0.01 }) {
  const sliderRef = useRef(null);
  const isDraggingRef = useRef(false);
  const onChangeRef = useRef(onChange);

  // Keep onChange ref up to date
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const updateValue = (e) => {
    if (!sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const percentage = 1 - (y / rect.height); // Inverted: top = max, bottom = min
    const clampedPercentage = Math.max(0, Math.min(1, percentage));

    const range = max - min;
    let newValue = min + (clampedPercentage * range);

    // Apply step
    if (step) {
      newValue = Math.round(newValue / step) * step;
    }

    onChangeRef.current(newValue);
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    isDraggingRef.current = true;
    updateValue(e);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      updateValue(e);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [min, max, step]);

  // Use displayValue for visual position if provided, otherwise use value
  const visualValue = displayValue !== undefined ? displayValue : value;
  const thumbPosition = ((visualValue - min) / (max - min)) * 100;
  const basePosition = ((value - min) / (max - min)) * 100;
  const showBaseMarker = displayValue !== undefined && Math.abs(displayValue - value) > 0.01;

  const sliderStyles = {
    track: {
      position: 'relative',
      width: '8px',
      height: '200px',
      background: '#1a1a1a',
      border: '1px solid #404040',
      borderRadius: '4px',
      cursor: 'pointer',
    },
    baseMarker: {
      position: 'absolute',
      left: '50%',
      bottom: `${basePosition}%`,
      transform: 'translate(-50%, 50%)',
      width: '20px',
      height: '3px',
      background: '#22d3ee',
      borderRadius: '1px',
      opacity: showBaseMarker ? 0.7 : 0,
      boxShadow: '0 0 4px #22d3ee',
      pointerEvents: 'none',
      transition: 'opacity 0.1s',
    },
    thumb: {
      position: 'absolute',
      left: '50%',
      bottom: `${thumbPosition}%`,
      transform: 'translate(-50%, 50%)',
      width: '26px',
      height: '40px',
      borderRadius: '4px',
      background: 'linear-gradient(to bottom, #f3f4f6 0%, #e5e7eb 30%, #d1d5db 60%, #9ca3af 100%)',
      cursor: 'grab',
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 2px rgba(0, 0, 0, 0.2)',
      border: '1px solid #6b7280',
      userSelect: 'none',
    },
  };

  return (
    <div
      ref={sliderRef}
      style={sliderStyles.track}
      onMouseDown={handleMouseDown}
    >
      <div style={sliderStyles.baseMarker} />
      <div
        style={sliderStyles.thumb}
        onMouseDown={(e) => {
          e.stopPropagation();
          handleMouseDown(e);
        }}
      />
    </div>
  );
}

export default function TonePhase() {
  const [bpm, setBpm] = useState(60);
  const [rootFreq, setRootFreq] = useState(440);
  const [isPlaying, setIsPlaying] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0.3);
  const [masterMuted, setMasterMuted] = useState(false);
  const [volumes, setVolumes] = useState([0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
  const [muted, setMuted] = useState([false, false, false, false, false, false]);

  // LFO state for each channel
  const [lfoRates, setLfoRates] = useState([0.5, 0.5, 0.5, 0.5, 0.5, 0.5]); // Hz
  const [lfoAmounts, setLfoAmounts] = useState([0, 0, 0, 0, 0, 0]); // 0-1 (percentage)
  const [modulatedVolumes, setModulatedVolumes] = useState([0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);

  const timeScale = 3.0; // Hard-coded time scale value
  const lfoAnimationRef = useRef(null);
  const lfoStartTimeRef = useRef(Date.now());

  const oscillatorsRef = useRef([]);
  const gainsRef = useRef([]);
  const masterGainRef = useRef(null);
  const analyserRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const scrollOffsetRef = useRef(0);

  const beatRatios = [0, 1, 2, 4, 8, 16];

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
      const actualVolume = masterMuted ? 0 : masterVolume;
      masterGainRef.current.gain.rampTo(actualVolume, 0.05);
    }
  }, [masterVolume, masterMuted]);

  // LFO animation loop - runs continuously to modulate volumes
  useEffect(() => {
    const animateLFO = () => {
      const now = Date.now();
      const elapsed = (now - lfoStartTimeRef.current) / 1000; // seconds

      const newModulatedVolumes = volumes.map((baseVol, idx) => {
        const rate = lfoRates[idx];
        const amount = lfoAmounts[idx];

        if (amount === 0) return baseVol;

        // Calculate LFO value using sine wave (-1 to 1)
        const lfoValue = Math.sin(elapsed * rate * 2 * Math.PI);

        // Calculate modulation range based on amount and base position
        // At 100% amount, the slider moves through its full possible range
        // centered on the base value
        const maxUp = 1 - baseVol; // How far up the slider can go
        const maxDown = baseVol; // How far down the slider can go
        const modulationRange = Math.min(maxUp, maxDown, 0.5) * 2 * amount;

        // Apply modulation
        const modulation = lfoValue * (modulationRange / 2);
        return Math.max(0, Math.min(1, baseVol + modulation));
      });

      setModulatedVolumes(newModulatedVolumes);

      // Update actual audio gains with modulated values
      newModulatedVolumes.forEach((vol, idx) => {
        if (gainsRef.current[idx]) {
          const actualGain = (isPlaying && !muted[idx]) ? vol : 0;
          gainsRef.current[idx].gain.value = actualGain;
        }
      });

      lfoAnimationRef.current = requestAnimationFrame(animateLFO);
    };

    lfoAnimationRef.current = requestAnimationFrame(animateLFO);

    return () => {
      if (lfoAnimationRef.current) {
        cancelAnimationFrame(lfoAnimationRef.current);
      }
    };
  }, [volumes, lfoRates, lfoAmounts, isPlaying, muted]);

  // Update gains when mute state changes (non-LFO related)
  useEffect(() => {
    if (!isPlaying) {
      volumes.forEach((vol, idx) => {
        if (gainsRef.current[idx]) {
          gainsRef.current[idx].gain.rampTo(0, 0.05);
        }
      });
    }
  }, [isPlaying]);

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
      draw();
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
  }, [isPlaying]);

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
    newVolumes[idx] = value;
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
    setVolumes(newVolumes);
  };

  const randomizeLFO = () => {
    // Random rates between 1 minute (1/60 Hz) and 1 second (1 Hz)
    const minRate = 1 / 60; // 1 minute period = 0.0167 Hz
    const maxRate = 1;      // 1 second period = 1 Hz
    const newRates = lfoRates.map(() => {
      // Use exponential distribution for more even spread across the range
      const t = Math.random();
      return minRate * Math.pow(maxRate / minRate, t);
    });

    // Random amounts between 0% and 50%
    const newAmounts = lfoAmounts.map(() => Math.random() * 0.5);

    setLfoRates(newRates);
    setLfoAmounts(newAmounts);
  };

  const handleLfoRateChange = (idx, value) => {
    const newRates = [...lfoRates];
    newRates[idx] = value;
    setLfoRates(newRates);
  };

  const handleLfoAmountChange = (idx, value) => {
    const newAmounts = [...lfoAmounts];
    newAmounts[idx] = value;
    setLfoAmounts(newAmounts);
  };

  const formatLfoRate = (rate) => {
    // Convert frequency to period (time for one wave)
    const period = 1 / rate; // in seconds
    if (period >= 60) return `${(period / 60).toFixed(1)}m`;
    if (period >= 1) return `${period.toFixed(1)}s`;
    return `${Math.round(period * 1000)}ms`;
  };

  const formatLfoAmount = (amount) => {
    return `${Math.round(amount * 100)}%`;
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
      padding: '0',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    headerImage: {
      width: '100%',
      height: '120px',
      backgroundImage: 'url(/CosineCartographer/banner.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      overflow: 'hidden',
      marginBottom: '1rem',
    },
    maxWidth: {
      maxWidth: '56rem',
      margin: '0 auto',
      padding: '1rem 1rem 1rem 1rem',
    },
    header: {
      textAlign: 'center',
      marginBottom: '1rem',
      marginTop: 0,
    },
    title: {
      fontSize: '2rem',
      fontWeight: 'bold',
      marginBottom: '0.25rem',
      background: 'linear-gradient(to right, #ffffff, #d1d5db)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    subtitle: {
      color: '#9ca3af',
      fontSize: '0.875rem',
    },
    card: {
      background: 'rgba(30, 30, 30, 0.8)',
      backdropFilter: 'blur(8px)',
      borderRadius: '0.5rem',
      padding: '1rem',
      marginBottom: '1rem',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
      border: '1px solid #2a2a2a',
    },
    inputGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '1rem',
      marginBottom: '1rem',
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
    verticalRange: {
      // Styling handled in index.css with transform approach
    },
    volumeText: {
      textAlign: 'right',
      fontSize: '0.875rem',
      color: '#9ca3af',
      marginTop: '0.25rem',
    },
    mixerContainer: {
      display: 'flex',
      gap: '0.25rem',
      justifyContent: 'center',
      alignItems: 'flex-start',
      flexWrap: 'nowrap',
    },
    faderChannel: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      background: 'rgba(51, 65, 85, 0.5)',
      borderRadius: '0.25rem',
      padding: '0.25rem',
      width: '113px',
      flex: '0 0 auto',
      overflow: 'visible',
      position: 'relative',
    },
    lfoSection: {
      display: 'flex',
      gap: '4px',
      marginBottom: '6px',
      padding: '4px',
      background: 'rgba(0, 0, 0, 0.3)',
      borderRadius: '4px',
    },
    masterFader: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      background: 'rgba(71, 85, 105, 0.7)',
      borderRadius: '0.25rem',
      padding: '0.25rem',
      width: '158px',
      flex: '0 0 auto',
      boxShadow: 'inset 0 0 0 2px #475569',
      overflow: 'visible',
      position: 'relative',
    },
    channelContent: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
      minHeight: '370px',
    },
    sliderArea: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.25rem',
    },
    dbScale: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      height: '200px',
      fontSize: '0.5rem',
      color: '#6b7280',
      lineHeight: '1',
    },
    faderLabel: {
      fontSize: '0.75rem',
      fontWeight: '600',
      color: '#f3f4f6',
      marginBottom: '0.35rem',
      textAlign: 'center',
    },
    faderFreq: {
      fontSize: '0.55rem',
      color: '#9ca3af',
      marginBottom: '0.35rem',
      textAlign: 'center',
      lineHeight: '1.2',
    },
    faderVolume: {
      fontSize: '0.65rem',
      color: '#d1d5db',
      marginTop: '0.35rem',
      fontWeight: '600',
    },
    canvas: {
      width: '100%',
      height: '156px',
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
      width: '100%',
      padding: '0.2rem',
      borderRadius: '0.2rem',
      cursor: 'pointer',
      fontSize: '0.55rem',
      fontWeight: '600',
      flexShrink: 0,
      transition: 'all 0.2s',
      textAlign: 'center',
      userSelect: 'none',
    },
    muteButtonActive: {
      background: '#dc2626',
      color: 'white',
      boxShadow: 'inset 0 0 0 1px #dc2626',
    },
    muteButtonInactive: {
      background: 'transparent',
      color: '#6b7280',
      boxShadow: 'inset 0 0 0 1px #374151',
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
      marginTop: '0.5rem',
      textAlign: 'center',
      fontSize: '0.75rem',
      color: '#9ca3af',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.maxWidth}>
        <div style={styles.header}>
          <h1 style={styles.title}>Cosine Cartographer</h1>
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

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={togglePlay}
              style={{
                ...styles.button,
                ...(isPlaying ? styles.buttonPlaying : styles.buttonStopped),
              }}
            >
              {isPlaying ? '⏸ Stop' : '▶ Play'}
            </button>
            <button
              onClick={randomizeVolumes}
              style={{ ...styles.button, ...styles.randomButton }}
            >
              🎚️ Randomize Sliders
            </button>
            <button
              onClick={randomizeLFO}
              style={{ ...styles.button, ...styles.randomButton }}
            >
              🎛️ Randomize LFO
            </button>
          </div>
        </div>

        <div style={styles.card}>
          <label style={styles.label}>Oscilloscope</label>
          <canvas
            ref={canvasRef}
            width={800}
            height={156}
            style={styles.canvas}
          />
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <div style={styles.mixerContainer}>
            {frequencies.map((freq, idx) => (
              <div key={idx} style={styles.faderChannel}>
                <div style={styles.channelContent}>
                  {/* LFO Controls */}
                  <div style={styles.lfoSection}>
                    <Knob
                      value={lfoRates[idx]}
                      onChange={(val) => handleLfoRateChange(idx, val)}
                      min={0.002}
                      max={5}
                      label="Rate"
                      formatValue={formatLfoRate}
                      size={32}
                      exponential={true}
                      commitOnRelease={true}
                    />
                    <Knob
                      value={lfoAmounts[idx]}
                      onChange={(val) => handleLfoAmountChange(idx, val)}
                      min={0}
                      max={1}
                      label="Amt"
                      formatValue={formatLfoAmount}
                      size={32}
                      commitOnRelease={true}
                    />
                  </div>
                  <div
                    onClick={() => toggleMute(idx)}
                    style={{
                      ...styles.muteButton,
                      ...(muted[idx] ? styles.muteButtonActive : styles.muteButtonInactive),
                    }}
                    title={muted[idx] ? 'Unmute' : 'Mute'}
                  >
                    MUTE
                  </div>
                  <div style={styles.faderLabel}>
                    {getOscillatorLabel(idx)}
                  </div>
                  <div style={styles.faderFreq}>
                    {freq.toFixed(1)} Hz
                    {idx > 0 ? (
                      <div>(±{getBeatFrequency(idx).toFixed(1)} Hz)</div>
                    ) : (
                      <div style={{ height: '1em' }}>&nbsp;</div>
                    )}
                  </div>
                  <div style={styles.sliderArea}>
                    <div style={styles.dbScale}>
                      <span>10</span>
                      <span>5</span>
                      <span>0</span>
                      <span>-5</span>
                      <span>-10</span>
                      <span>-20</span>
                      <span>-30</span>
                      <span>-50</span>
                    </div>
                    <VerticalSlider
                      value={volumes[idx]}
                      displayValue={lfoAmounts[idx] > 0 ? modulatedVolumes[idx] : undefined}
                      onChange={(newValue) => handleVolumeChange(idx, newValue)}
                      min={0}
                      max={1}
                      step={0.01}
                    />
                  </div>
                </div>
              </div>
            ))}
            <div style={styles.masterFader}>
              <div style={styles.channelContent}>
                <div
                  onClick={() => setMasterMuted(!masterMuted)}
                  style={{
                    ...styles.muteButton,
                    ...(masterMuted ? styles.muteButtonActive : styles.muteButtonInactive),
                  }}
                  title={masterMuted ? 'Unmute' : 'Mute'}
                >
                  MUTE
                </div>
                <div style={styles.faderLabel}>
                  MASTER
                </div>
                <div style={styles.faderFreq}>
                  Volume
                  <div style={{ height: '1em' }}>&nbsp;</div>
                </div>
                <div style={styles.sliderArea}>
                  <div style={styles.dbScale}>
                    <span>10</span>
                    <span>5</span>
                    <span>0</span>
                    <span>-5</span>
                    <span>-10</span>
                    <span>-20</span>
                    <span>-30</span>
                    <span>-50</span>
                  </div>
                  <VerticalSlider
                    value={masterVolume}
                    onChange={setMasterVolume}
                    min={0}
                    max={1}
                    step={0.01}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
