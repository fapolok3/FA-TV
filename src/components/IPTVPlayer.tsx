import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { 
  Play, Pause, Volume2, VolumeX, Fullscreen, Maximize2, 
  RotateCw, AlertTriangle, Radio, Monitor, Settings, 
  Tv, Cpu, ShieldAlert, CheckCircle2, ChevronRight 
} from 'lucide-react';
import { Channel } from '../types';

interface IPTVPlayerProps {
  channel: Channel | null;
  onPrevChannel?: () => void;
  onNextChannel?: () => void;
}

type AspectRatioMode = 'fill' | 'contain' | '16-9' | '4-3';

export const IPTVPlayer: React.FC<IPTVPlayerProps> = ({ 
  channel,
  onPrevChannel,
  onNextChannel 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>('contain');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSpeedControls, setShowSpeedControls] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [qualityLevels, setQualityLevels] = useState<any[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 = Auto
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [streamStats, setStreamStats] = useState<{
    type: string;
    buffer: number;
    latency: number;
  }>({ type: 'N/A', buffer: 0, latency: 0 });

  // Load and play HLS (.m3u8) or direct MP4 stream
  useEffect(() => {
    if (!channel) return;
    
    setIsLoading(true);
    setErrorMsg(null);
    setIsPlaying(false);
    setQualityLevels([]);
    setCurrentQuality(-1);
    
    const video = videoRef.current;
    if (!video) return;

    // Clean up previous Hls instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const streamUrl = channel.url;
    const isHls = streamUrl.toLowerCase().includes('.m3u8') || streamUrl.includes('m3u8');

    if (isHls) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 60,
          maxMaxBufferLength: 30,
        });
        hlsRef.current = hls;

        hls.loadSource(streamUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          video.play().catch(() => {
            // Auto play failed (user interaction required)
            setIsPlaying(false);
          });
        });

        // Parse quality levels
        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          setIsLoading(false);
          setIsPlaying(true);
          setStreamStats(prev => ({ ...prev, type: 'HLS (JS Engine)' }));
          
          if (data.levels && data.levels.length > 1) {
            setQualityLevels(data.levels);
          }
        });

        // Error handling
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                setErrorMsg('Network error: Live stream server unreachable or CORS restricted.');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                setErrorMsg('Media error: Stream parsing failed.');
                hls.recoverMediaError();
                break;
              default:
                setErrorMsg('Stream failed to load due to security or offline source.');
                hls.destroy();
                break;
            }
            setIsLoading(false);
          }
        });

        // Monitor stream buffer
        const interval = setInterval(() => {
          if (hls && video) {
            const buffered = video.buffered;
            if (buffered.length > 0) {
              const duration = buffered.end(buffered.length - 1) - video.currentTime;
              setStreamStats(prev => ({
                ...prev,
                buffer: Math.round(duration * 10) / 10,
                latency: hls.latency || 0
              }));
            }
          }
        }, 2000);

        return () => {
          clearInterval(interval);
        };

      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        video.src = streamUrl;
        video.addEventListener('loadedmetadata', () => {
          setIsLoading(false);
          setIsPlaying(true);
          setStreamStats({ type: 'HLS (Native)', buffer: 0, latency: 0 });
          video.play().catch(() => {});
        });
        
        video.addEventListener('error', () => {
          setErrorMsg('Your browser was unable to load the HLS stream natively.');
          setIsLoading(false);
        });
      } else {
        setErrorMsg('HLS Streaming is not supported on this browser. Try Chrome, Brave or Firefox.');
        setIsLoading(false);
      }
    } else {
      // Non-HLS standard video link (MP4 etc)
      video.src = streamUrl;
      video.load();
      video.play()
        .then(() => {
          setIsLoading(false);
          setIsPlaying(true);
          setStreamStats({ type: 'MP4/Direct', buffer: 0, latency: 0 });
        })
        .catch((err) => {
          setErrorMsg('Failed to play standard digital video link.');
          setIsLoading(false);
        });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [channel]);

  // Synchronize playback rates
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Audio configuration updates
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          setErrorMsg('Click play icon to resume or refresh stream connection.');
        });
    }
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVol = parseFloat(e.target.value);
    setVolume(nextVol);
    if (nextVol > 0) {
      setIsMuted(false);
    }
  };

  const handleFullscreenToggle = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Monitor hardware fullscreen escape
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const handleRefreshStream = () => {
    if (!channel) return;
    setErrorMsg(null);
    setIsLoading(true);
    
    const hls = hlsRef.current;
    if (hls) {
      hls.destroy();
    }
    
    // Temporarily trigger reload sequence
    const video = videoRef.current;
    if (video) {
      video.src = '';
    }
    
    setTimeout(() => {
      const isHls = channel.url.toLowerCase().includes('.m3u8') || channel.url.includes('m3u8');
      if (isHls && video) {
        if (Hls.isSupported()) {
          const freshHls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
          });
          hlsRef.current = freshHls;
          freshHls.loadSource(channel.url);
          freshHls.attachMedia(video);
          freshHls.on(Hls.Events.MANIFEST_PARSED, () => {
            setIsLoading(false);
            setIsPlaying(true);
            video.play().catch(() => {});
          });
        } else {
          video.src = channel.url;
        }
      } else if (video) {
        video.src = channel.url;
        video.load();
      }
    }, 100);
  };

  const handleAspectRatioChange = () => {
    const order: AspectRatioMode[] = ['contain', 'fill', '16-9', '4-3'];
    const idx = order.indexOf(aspectRatio);
    const nextIdx = (idx + 1) % order.length;
    setAspectRatio(order[nextIdx]);
  };

  const selectQuality = (levelIndex: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
      setCurrentQuality(levelIndex);
      setShowQualityMenu(false);
    }
  };

  // Video aspect ratio Tailwind classes
  const getAspectClass = () => {
    switch (aspectRatio) {
      case 'fill':
        return 'w-full h-full object-fill';
      case '16-9':
        return 'aspect-video w-full h-auto object-cover';
      case '4-3':
        return 'aspect-[4/3] w-auto h-full mx-auto object-cover';
      case 'contain':
      default:
        return 'w-full h-full object-contain';
    }
  };

  return (
    <div 
      className="flex flex-col bg-[#121214] rounded-xl overflow-hidden shadow-xl border border-white/10 transition-all duration-300 group/player"
      id="iptv-player-container"
    >
      {/* Aspect Ratio Sized Screen Wrapper */}
      <div 
        ref={containerRef}
        className="relative bg-black flex items-center justify-center overflow-hidden aspect-video w-full group/controls cursor-pointer select-none"
        style={{ minHeight: '320px' }}
      >
        {channel ? (
          <video
            ref={videoRef}
            className={`transition-all duration-300 ${getAspectClass()} pointer-events-auto bg-black`}
            crossOrigin="anonymous"
            onClick={handlePlayPause}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            id="video-player-element"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500 space-y-4">
            <Tv className="w-16 h-16 stroke-[1.2] text-gray-650 animate-pulse" />
            <div className="space-y-1">
              <p className="text-gray-300 font-medium text-base">No Channel Selected</p>
              <p className="text-xs text-gray-500 max-w-sm">
                Select an IPTV category and click on a station in the side menu to begin smooth live streaming immediately.
              </p>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center space-y-4 backdrop-blur-md transition-all duration-305">
            <div className="relative">
              <div className="w-12 h-12 border-2 border-white/5 border-t-indigo-500 rounded-full animate-spin"></div>
              <Radio className="w-5 h-5 text-indigo-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-gray-300 font-medium text-xs animate-pulse">Syncing Live Audio & Video Feed...</p>
              {channel && (
                <p className="text-gray-500 text-[10px] mt-1">Connecting to {channel.name}</p>
              )}
            </div>
          </div>
        )}

        {/* Error Overlay with Troubleshooting Recommendations */}
        {errorMsg && (
          <div className="absolute inset-0 bg-[#0A0A0B]/95 flex flex-col justify-center p-6 text-gray-300 backdrop-blur-lg border border-white/5">
            <div className="flex items-start space-x-3 mb-4">
              <AlertTriangle className="w-10 h-10 text-rose-500 shrink-0 mt-1 animate-bounce" />
              <div className="space-y-1">
                <p className="text-gray-200 font-semibold text-sm">Streaming Connection Failed</p>
                <p className="text-xs text-rose-455">{errorMsg}</p>
              </div>
            </div>

            <div className="bg-[#121214] border border-white/5 px-4 py-3 rounded-lg space-y-2 text-xs text-gray-400 mb-4 max-w-md">
              <p className="font-medium text-gray-350 flex items-center gap-1.5 font-mono">
                <Cpu className="w-3.5 h-3.5 text-indigo-455" /> Troubleshooting Guide:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[11px]">
                <li>Server offline or bandwidth limit reached on their end.</li>
                <li><strong>CORS Policy Block:</strong> Browsers enforce tight security. Ask Gemini AI in the assistant tab to suggest working playlists or direct links!</li>
                <li>Make sure you use <strong>HTTPS</strong> streams; some browsers block insecure HTTP streams on a secure application.</li>
              </ul>
            </div>

            <div className="flex space-x-3">
              <button 
                onClick={handleRefreshStream}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs text-white rounded-lg flex items-center gap-2 transition-all active:scale-95 border border-indigo-500/30 font-semibold"
              >
                <RotateCw className="w-3.5 h-3.5" /> Reconnect
              </button>
              <button 
                onClick={() => setErrorMsg(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs text-gray-400 rounded-lg border border-white/10 transition-all font-semibold"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Controls Overlay (Visible on Hover/State changes) */}
        {channel && !errorMsg && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent p-4 flex flex-col justify-end space-y-3 opacity-0 group-controls:opacity-100 group-hover/player:opacity-100 transition-opacity duration-305 pointer-events-auto">
            {/* Upper Stats Row */}
            <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono tracking-wider bg-black/60 px-2 py-1.5 rounded-md border border-white/5">
              <div className="flex items-center space-x-3">
                <span className="flex items-center text-emerald-400 gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Live
                </span>
                <span>Type: <span className="text-[#E0E0E0] font-bold">{streamStats.type}</span></span>
                {streamStats.buffer > 0 && (
                  <span>Buf: <span className="text-[#E0E0E0] font-bold">{streamStats.buffer}s</span></span>
                )}
              </div>
              <div className="truncate max-w-[200px]" title={channel.url}>
                {channel.name} • {channel.group}
              </div>
            </div>

            {/* Main Interactive Controls Bar */}
            <div className="flex items-center justify-between">
              {/* Left Action Elements */}
              <div className="flex items-center space-x-3">
                <button 
                  onClick={handlePlayPause}
                  className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
                  title={isPlaying ? "Pause Stream" : "Play Stream"}
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                </button>

                <button 
                  onClick={handleRefreshStream}
                  className="p-2 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg transition-all"
                  title="Reconnect Raw Link"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                {/* Volume slider control */}
                <div className="flex items-center space-x-1.5 group/volume">
                  <button 
                    onClick={handleMuteToggle}
                    className="p-1.5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg transition-all"
                  >
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input 
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500 transition-all group-hover/volume:w-20"
                  />
                </div>
              </div>

              {/* Right Action Elements */}
              <div className="flex items-center space-x-2">
                {/* Speed Controls Toggle */}
                <div className="relative">
                  <button 
                    onClick={() => {
                      setShowSpeedControls(!showSpeedControls);
                      setShowQualityMenu(false);
                    }}
                    className={`px-2.5 py-1.5 text-xs font-mono rounded-lg transition-all border ${
                      playbackRate !== 1 
                        ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400 font-bold' 
                        : 'border-white/10 text-[#E0E0E0] hover:bg-white/5'
                    }`}
                    title="Playback Rate"
                  >
                    Speed: {playbackRate}x
                  </button>
                  
                  {showSpeedControls && (
                    <div className="absolute bottom-10 right-0 bg-[#121214] border border-white/10 p-1 rounded-lg shadow-xl flex flex-col space-y-1 min-w-[70px] z-[50]">
                      {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => {
                            setPlaybackRate(rate);
                            setShowSpeedControls(false);
                          }}
                          className={`px-2 py-1 text-left text-[11px] rounded transition-colors ${
                            playbackRate === rate ? 'bg-indigo-600/20 text-indigo-400 font-bold' : 'text-gray-450 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          {rate === 1 ? '1.0x (Live)' : `${rate}x`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Qualities Selector Menu */}
                {qualityLevels.length > 0 && (
                  <div className="relative">
                    <button 
                      onClick={() => {
                        setShowQualityMenu(!showQualityMenu);
                        setShowSpeedControls(false);
                      }}
                      className="p-1.5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg transition-all"
                      title="Quality Settings"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    
                    {showQualityMenu && (
                      <div className="absolute bottom-10 right-0 bg-[#121214] border border-white/10 p-2 rounded-lg shadow-xl flex flex-col space-y-1 min-w-[120px] max-h-48 overflow-y-auto index-[50]">
                        <p className="text-[10px] font-mono text-gray-500 px-1 py-0.5 border-b border-white/5 mb-1">Quality</p>
                        <button
                          onClick={() => selectQuality(-1)}
                          className={`px-2 py-1 text-left text-xs rounded transition-colors ${
                            currentQuality === -1 ? 'bg-indigo-600/20 text-indigo-400 font-semibold' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          Auto Adaptive
                        </button>
                        {qualityLevels.slice().reverse().map((level, idx) => {
                          const levelRealIndex = qualityLevels.length - 1 - idx;
                          return (
                            <button
                              key={levelRealIndex}
                              onClick={() => selectQuality(levelRealIndex)}
                              className={`px-2 py-1 text-left text-xs rounded transition-colors truncate ${
                                currentQuality === levelRealIndex ? 'bg-indigo-600/20 text-indigo-400 font-semibold' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              {level.height}p ({Math.round(level.bitrate / 1000)}k)
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Aspect ratio control */}
                <button 
                  onClick={handleAspectRatioChange}
                  className="p-1.5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg transition-all flex items-center gap-1"
                  title="Cycle Aspect Ratio"
                >
                  <Monitor className="w-4 h-4" />
                  <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-gray-300 uppercase font-mono">
                    {aspectRatio}
                  </span>
                </button>

                {/* Fullscreen control */}
                <button 
                  onClick={handleFullscreenToggle}
                  className="p-1.5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg transition-all"
                  title="Toggle Fullscreen"
                >
                  <Fullscreen className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Meta Bar */}
      {channel && (
        <div className="bg-[#121214] p-4 flex items-center justify-between border-t border-white/5 transition-all">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-black/60 flex items-center justify-center border border-white/10 text-gray-450 overflow-hidden shrink-0">
              {channel.logoUrl ? (
                <img 
                  src={channel.logoUrl} 
                  alt={channel.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    // Fail back
                    (e.target as HTMLElement).setAttribute('style', 'display: none;');
                  }}
                />
              ) : (
                <Tv className="w-5 h-5 text-indigo-400" />
              )}
            </div>
            <div>
              <h2 className="text-[#E0E0E0] font-bold text-sm tracking-tight">{channel.name}</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] uppercase font-mono tracking-wider bg-black/50 text-[#E0E0E0] px-1.5 py-0.5 rounded border border-white/5">
                  {channel.group}
                </span>
                <span className="text-[10.5px] text-gray-500 truncate max-w-[280px]" title={channel.url}>
                  {channel.url}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10.5px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> READY
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
