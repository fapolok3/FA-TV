import React, { useState, useEffect } from 'react';
import { 
  Tv, Heart, Shield, Sparkles, HelpCircle, AlertCircle, 
  Trash2, Upload, Plus, Globe, ExternalLink, RefreshCw, 
  Search, PlayCircle, Minimize2, Check, ArrowDown, Database,
  Settings, Radio, ChevronRight, HelpCircle as HelpIcon, Play,
  Trophy, Calendar, X, Award
} from 'lucide-react';
import { Channel, Playlist } from './types';
import { DEFAULT_CHANNELS } from './defaultChannels';
import { IPTVPlayer } from './components/IPTVPlayer';
import { parseM3U } from './utils/m3uParser';

export default function App() {
  // --- Favorites management ---
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('iptv_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('iptv_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // --- Custom playlists management ---
  const [customPlaylists, setCustomPlaylists] = useState<Playlist[]>(() => {
    try {
      const saved = localStorage.getItem('iptv_custom_playlists');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('iptv_custom_playlists', JSON.stringify(customPlaylists));
  }, [customPlaylists]);

  // --- Pagination & Default Channels States ---
  const [defaultChannels, setDefaultChannels] = useState<Channel[]>(DEFAULT_CHANNELS);
  const [isLoadingDefault, setIsLoadingDefault] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 50;

  // --- Promo Popup State ---
  const [isPromoOpen, setIsPromoOpen] = useState<boolean>(true);
  const [promoTimeLeft, setPromoTimeLeft] = useState<number>(5);

  // Automatic countdown and closing of the Promo Popup
  useEffect(() => {
    if (!isPromoOpen) return;
    const interval = setInterval(() => {
      setPromoTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsPromoOpen(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPromoOpen]);

  // --- Active playlist ---
  const [activePlaylistId, setActivePlaylistId] = useState<string>('default');

  // Load appropriate channel set based on active playlist
  const activeChannels = React.useMemo(() => {
    if (activePlaylistId === 'default') {
      return defaultChannels;
    }
    const found = customPlaylists.find(p => p.id === activePlaylistId);
    return found ? found.channels : [];
  }, [activePlaylistId, defaultChannels, customPlaylists]);

  // Find T Sports initially from local channel list to render on startup
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(() => {
    const tSports = DEFAULT_CHANNELS.find(c => 
      c.name.toLowerCase().replace(/\s+/g, '').includes('tsports') || 
      c.name.toLowerCase().includes('t sports')
    );
    return tSports || DEFAULT_CHANNELS[0] || null;
  });

  // Fetch the primary playlist from the GitHub repository on mount
  useEffect(() => {
    const fetchMainPlaylist = async () => {
      setIsLoadingDefault(true);
      setLoadError(null);
      try {
        const primaryUrl = 'https://raw.githubusercontent.com/SHAJON-404/iptv/refs/heads/main/app/data/channels.m3u';
        const proxyUrl = `/api/proxy-m3u?url=${encodeURIComponent(primaryUrl)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) {
          throw new Error(`Failed to load default playlist: ${res.statusText}`);
        }
        const m3uText = await res.text();
        const parsed = parseM3U(m3uText, 'FA TV');
        if (parsed.length > 0) {
          setDefaultChannels(parsed);
          
          // Set T Sports as default channel on load if found
          const tSports = parsed.find(c => 
            c.name.toLowerCase().replace(/\s+/g, '').includes('tsports') || 
            c.name.toLowerCase().includes('t sports')
          );
          
          if (tSports) {
            setSelectedChannel(tSports);
          } else {
            setSelectedChannel(parsed[0]);
          }
        } else {
          throw new Error('No valid streams found in the remote M3U playlist.');
        }
      } catch (err: any) {
        console.error('Error fetching main m3u, falling back to local list:', err);
        setLoadError(err.message || 'Error fetching remote channels');
        // fall back is already defaulting to state DEFAULT_CHANNELS
      } finally {
        setIsLoadingDefault(false);
      }
    };

    fetchMainPlaylist();
  }, []);

  // Automatically update selected channel if active playlist changes
  useEffect(() => {
    if (activeChannels.length > 0) {
      const exists = activeChannels.find(c => c.url === selectedChannel?.url || c.id === selectedChannel?.id);
      if (!exists) {
        const tSports = activeChannels.find(c => 
          c.name.toLowerCase().replace(/\s+/g, '').includes('tsports') || 
          c.name.toLowerCase().includes('t sports')
        );
        setSelectedChannel(tSports || activeChannels[0]);
      }
    } else {
      setSelectedChannel(null);
    }
  }, [activePlaylistId, activeChannels]);

  // --- UI Interactivity States ---
  const [activeImportTab, setActiveImportTab] = useState<'none' | 'remote' | 'local' | 'single'>('none');
  
  // Custom inputs state
  const [remoteUrlInput, setRemoteUrlInput] = useState('');
  const [remotePlaylistNameInput, setRemotePlaylistNameInput] = useState('');
  const [isImportingUrl, setIsImportingUrl] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Single Direct Channel fields
  const [singleChannelName, setSingleChannelName] = useState('');
  const [singleChannelUrl, setSingleChannelUrl] = useState('');
  const [singleChannelGroup, setSingleChannelGroup] = useState('My Custom Channels');

  // Search & Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('All');

  // Parse all loaded groups dynamically based on available channels
  const groups = React.useMemo(() => {
    const set = new Set<string>();
    activeChannels.forEach(ch => {
      if (ch.group) set.add(ch.group);
    });
    const sorted = Array.from(set).sort();
    return ['All', 'Favorites', ...sorted];
  }, [activeChannels]);

  // Filter channels based on search and selected group tab
  const filteredChannels = React.useMemo(() => {
    return activeChannels.filter(ch => {
      // Group match
      if (selectedGroup === 'Favorites') {
        if (!favorites.includes(ch.id)) return false;
      } else if (selectedGroup !== 'All') {
        if (ch.group !== selectedGroup) return false;
      }

      // Search text match
      const query = searchTerm.toLowerCase().trim();
      if (!query) return true;
      return (
        ch.name.toLowerCase().includes(query) ||
        (ch.group && ch.group.toLowerCase().includes(query))
      );
    });
  }, [activeChannels, selectedGroup, searchTerm, favorites]);

  // Reset currentPage to 1 whenever filters change so we get full view of hits
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedGroup, activePlaylistId]);

  // --- Handlers ---
  const handleToggleFavorite = (channelId: string) => {
    setFavorites(prev => 
      prev.includes(channelId) 
        ? prev.filter(id => id !== channelId) 
        : [...prev, channelId]
    );
  };

  const handleSelectChannel = (channel: Channel) => {
    setSelectedChannel(channel);
    // Smooth scroll back to player on top when selecting a channel
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImportPlaylistText = (name: string, text: string) => {
    try {
      const playlistId = `playlist-${Date.now()}`;
      const parsedChannels = parseM3U(text, name);
      
      if (parsedChannels.length === 0) {
        throw new Error('This file did not contain any valid live streaming M3U entries.');
      }

      const newPlaylist: Playlist = {
        id: playlistId,
        name,
        channelsCount: parsedChannels.length,
        channels: parsedChannels,
        isCustom: true
      };

      setCustomPlaylists(prev => [...prev, newPlaylist]);
      setActivePlaylistId(playlistId);
      setImportStatus({ type: 'success', text: `Successfully loaded "${name}" with ${parsedChannels.length} channels!` });
      setActiveImportTab('none');
      setSearchTerm('');
    } catch (err: any) {
      setImportStatus({ type: 'error', text: err.message || 'M3U parsing failed.' });
    }
  };

  const handleImportPlaylistUrl = async (name: string, url: string): Promise<void> => {
    setIsImportingUrl(true);
    setImportStatus(null);
    try {
      const proxyUrl = `/api/proxy-m3u?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to download remote file.');
      }

      const m3uText = await res.text();
      handleImportPlaylistText(name, m3uText);
    } catch (err: any) {
      setImportStatus({ 
        type: 'error', 
        text: err.message || 'Could not fetch remote playlist. Make sure the link is a valid public M3U URL.' 
      });
      throw err;
    } finally {
      setIsImportingUrl(false);
    }
  };

  const handleUrlImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remoteUrlInput) return;
    const name = remotePlaylistNameInput.trim() || `Playlist-${Math.floor(Math.random() * 900) + 100}`;
    try {
      await handleImportPlaylistUrl(name, remoteUrlInput);
      setRemoteUrlInput('');
      setRemotePlaylistNameInput('');
    } catch {
      // Error is already set in handleImportPlaylistUrl
    }
  };

  const handleAddCustomChannel = (newChannel: Omit<Channel, 'id'>) => {
    const channelWithId: Channel = {
      ...newChannel,
      id: `custom-single-${Date.now()}`
    };

    const myCustomPlaylistId = 'playlist-manual-custom';
    const foundIdx = customPlaylists.findIndex(p => p.id === myCustomPlaylistId);

    if (foundIdx !== -1) {
      const updated = [...customPlaylists];
      updated[foundIdx] = {
        ...updated[foundIdx],
        channels: [channelWithId, ...updated[foundIdx].channels],
        channelsCount: updated[foundIdx].channelsCount + 1
      };
      setCustomPlaylists(updated);
    } else {
      const newPlaylist: Playlist = {
        id: myCustomPlaylistId,
        name: 'My Custom Direct Links',
        channelsCount: 1,
        channels: [channelWithId],
        isCustom: true
      };
      setCustomPlaylists(prev => [...prev, newPlaylist]);
    }

    setActivePlaylistId(myCustomPlaylistId);
    setSelectedChannel(channelWithId);
    setImportStatus({ type: 'success', text: `Injected custom channel "${newChannel.name}" successfully!` });
    setActiveImportTab('none');
  };

  const handleClearCustomPlaylists = () => {
    if (confirm('Are you sure you want to clear all imported M3U playlists?')) {
      setCustomPlaylists([]);
      setActivePlaylistId('default');
      setImportStatus(null);
    }
  };

  const handlePrevChannel = () => {
    if (filteredChannels.length <= 1 || !selectedChannel) return;
    const idx = filteredChannels.findIndex(c => c.url === selectedChannel.url);
    if (idx !== -1) {
      const prevIdx = (idx - 1 + filteredChannels.length) % filteredChannels.length;
      setSelectedChannel(filteredChannels[prevIdx]);
    }
  };

  const handleNextChannel = () => {
    if (filteredChannels.length <= 1 || !selectedChannel) return;
    const idx = filteredChannels.findIndex(c => c.url === selectedChannel.url);
    if (idx !== -1) {
      const nextIdx = (idx + 1) % filteredChannels.length;
      setSelectedChannel(filteredChannels[nextIdx]);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E0E0E0] font-sans selection:bg-indigo-650 selection:text-white pb-12">
      
      {/* Cinematic Promo Modal Popup */}
      {isPromoOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md transition-all duration-300">
          {/* Backdrop Overlay Click to close */}
          <div className="absolute inset-0 bg-[#070709]/10" onClick={() => setIsPromoOpen(false)}></div>
          
          {/* Main Card Container */}
          <div 
            className="relative w-full max-w-lg bg-[#0F0F12] border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(99,102,241,0.25)] md:max-w-xl transition-all transform duration-300 scale-100 flex flex-col"
            style={{
              backgroundImage: "radial-gradient(circle at center, rgba(15, 15, 20, 0.85) 0%, rgba(9, 9, 11, 0.98) 100%), url('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=800')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundBlendMode: 'multiply'
            }}
          >
            {/* Top Glossy Gradient Accent bar */}
            <div className="h-1.5 bg-gradient-to-r from-red-500 via-indigo-500 to-purple-650 w-full"></div>

            {/* Close Button top-right */}
            <button 
              onClick={() => setIsPromoOpen(false)}
              className="absolute top-4 right-4 z-25 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-all cursor-pointer shadow-lg outline-none active:scale-95"
              title="Close advertisement"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Inner promotional card */}
            <div className="p-6 md:p-8 flex flex-col items-center text-center relative z-10 selection:bg-rose-600">
              
              {/* Live Badge / Floating Elements */}
              <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-600/10 border border-rose-500/30 text-rose-400 text-[10px] font-mono tracking-widest uppercase rounded-full mb-5 font-black animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                <span>Exclusive Broadcast</span>
              </div>

              {/* Main Headline */}
              <div className="mb-2">
                <span className="text-[11px] md:text-xs font-bold text-amber-400 tracking-[0.2em] font-mono uppercase">
                  T SPORTS • BTV • FA TV
                </span>
                <h2 className="text-3xl md:text-4.2xl font-extrabold tracking-tight text-white mt-1 uppercase leading-none drop-shadow-xl">
                  WORLD CUP <span className="bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-500 bg-clip-text text-transparent italic font-black">2026</span>
                </h2>
              </div>

              {/* Sub-Headline LIVE ON card */}
              <div className="w-full py-1.5 px-4 bg-gradient-to-r from-red-600/30 via-indigo-600/20 to-purple-650/30 border-y border-white/5 my-4 flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                <span className="font-extrabold text-white text-xs md:text-sm tracking-wide uppercase">
                  LIVE & EXCLUSIVE STREAMING ON
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              </div>

              {/* STUNNING CHANNELS GRID (Match the User's Image perfectly!) */}
              <div className="grid grid-cols-3 gap-3 md:gap-4 w-full max-w-sm my-4">
                
                {/* T Sports Logo Block */}
                <div className="bg-black/65 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center shadow-lg hover:border-red-500/30 transition-all group">
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    {/* T Sports stylized icon */}
                    <div className="w-11 h-11 bg-red-600 rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg shadow-red-600/40 relative">
                      T
                      <span className="absolute -bottom-1 -right-1 text-[7px] bg-black text-white border border-red-500 px-0.5 rounded font-mono font-bold scale-90">LIVE</span>
                    </div>
                  </div>
                  <span className="text-[10px] md:text-[11px] font-bold text-gray-300 mt-2 font-sans tracking-wide uppercase group-hover:text-red-400 transition-colors">T SPORTS</span>
                </div>

                {/* BTV Logo Block */}
                <div className="bg-black/65 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center shadow-lg hover:border-green-500/30 transition-all group">
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    {/* BTV Screen with national flag red dot */}
                    <div className="w-11 h-8 bg-green-700/90 border border-green-500 rounded-lg flex items-center justify-center text-white relative shadow-lg">
                      {/* Red circle of Bangladesh flag */}
                      <div className="w-4 h-4 bg-red-600 rounded-full flex items-center justify-center"></div>
                      <span className="absolute -bottom-1 right-1 text-[6px] bg-black text-green-300 px-1 rounded font-mono font-bold scale-75 border border-green-700">HD</span>
                    </div>
                  </div>
                  <span className="text-[10px] md:text-[11px] font-bold text-gray-300 mt-3 font-sans tracking-wide uppercase group-hover:text-green-400 transition-colors">비টিবি (BTV)</span>
                </div>

                {/* FA TV Custom Styled Logo Block */}
                <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-3 flex flex-col items-center justify-center shadow-lg hover:border-indigo-500/50 transition-all group relative overflow-hidden">
                  <span className="absolute top-1 right-1 flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                  </span>
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    {/* FA TV Custom dynamic badge */}
                    <div className="w-11 h-11 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                      <Tv className="w-5 h-5 stroke-[2.5]" />
                    </div>
                  </div>
                  <span className="text-[10px] md:text-[11px] font-extrabold text-indigo-300 mt-2 font-mono tracking-wider group-hover:text-indigo-200 transition-colors">FA &nbsp;TV</span>
                </div>

              </div>

              {/* Subtitle / Details bullet list */}
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 text-[10px] md:text-xs text-gray-400 font-medium font-sans my-4">
                <div className="flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  <span>ALL MATCHES LIVE</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>FEB - MAR 2026</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-purple-400" />
                  <span>EXPERT ANALYSIS</span>
                </div>
              </div>

              {/* Action Big Pulsive Button CTA */}
              <div className="w-full mt-5">
                <button
                  onClick={() => {
                    setIsPromoOpen(false);
                    // Select T Sports and scroll catalog into view
                    const tSports = defaultChannels.find(c => 
                      c.name.toLowerCase().replace(/\s+/g, '').includes('tsports') || 
                      c.name.toLowerCase().includes('t sports')
                    );
                    if (tSports) setSelectedChannel(tSports);
                    document.getElementById('catalog-header')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl transition-all shadow-lg shadow-indigo-600/30 cursor-pointer hover:shadow-indigo-500/40 text-center flex items-center justify-center gap-2 outline-none group active:scale-[0.98]"
                >
                  <PlayCircle className="w-4 h-4 animate-bounce [animation-duration:2.5s]" />
                  <span>Watch Free Live Feed on FA TV Website</span>
                </button>
              </div>

              {/* Countdown Progress Indicator */}
              <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-gray-500 tracking-wider uppercase font-mono selection:bg-transparent">
                <span>Closing automatically in</span>
                <span className="text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded animate-pulse">
                  {promoTimeLeft}S
                </span>
              </div>

            </div>

            {/* Smart horizontal automated countdown progress line */}
            <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-red-500 via-indigo-500 to-purple-600 transition-all duration-1000 ease-linear" style={{ width: `${(promoTimeLeft / 5) * 100}%` }}></div>
          </div>
        </div>
      )}

      {/* Visual background ambient blur globes */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[125px] pointer-events-none"></div>
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-indigo-900/5 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 py-5 md:py-6 relative z-10 flex flex-col min-h-screen">
        
        {/* Modern App Header Bar */}
        <header className="h-16 border border-white/10 bg-[#121214]/90 backdrop-blur-md flex items-center justify-between px-6 shrink-0 mb-6 rounded-xl shadow-xl">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5">
              {/* Animated Live Logo */}
              <div className="relative w-10 h-10 flex items-center justify-center">
                {/* Wave rings */}
                <span className="absolute inline-flex h-full w-full rounded-xl bg-indigo-500/30 animate-pulse"></span>
                <span className="absolute inline-flex h-12 w-12 rounded-full border border-indigo-500/20 animate-ping opacity-75"></span>
                
                {/* Core badge */}
                <div className="relative w-9 h-9 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-500/40">
                  <Tv className="w-5 h-5 stroke-[2.5] animate-bounce [animation-duration:3s]" />
                  
                  {/* Glowing live indicator dot */}
                  <span className="absolute top-1 right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                </div>
              </div>

              <span className="font-extrabold text-2xl tracking-tight text-white flex items-center">
                FA&nbsp;<span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent font-mono tracking-widest uppercase font-black">TV</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {/* Server Status Code LED */}
            <div className="hidden sm:flex items-center space-x-2 bg-black/60 border border-white/5 px-3 py-1.5 rounded-lg text-[11px] text-gray-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-gray-500">SSL Proxy:</span>
              <span className="text-emerald-450 font-bold">ONLINE</span>
            </div>

            {/* Quick Actions */}
            <div className="lg:flex gap-2">
              <a 
                href="https://github.com/iptv-org/iptv" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-gray-300 rounded-lg transition-all border border-white/10 hover:text-white"
              >
                <span>Free Playlists</span>
                <ExternalLink className="w-3 h-3 text-indigo-400" />
              </a>
            </div>
            
            <div className="w-8 h-8 rounded-full bg-indigo-950 border border-indigo-500/30 flex items-center justify-center text-[10px] font-mono font-bold text-indigo-300">
              FA
            </div>
          </div>
        </header>

        {/* TOP CINEMATIC AREA: Player on top! */}
        <section className="mb-8">
          <div className="flex flex-col gap-4">
            
            <div className="bg-[#121214] border border-white/10 rounded-xl overflow-hidden shadow-2xl relative">
              
              {/* Overlay controller bar on top of the player area */}
              <div className="p-3 bg-black/60 border-b border-white/5 flex items-center justify-between text-xs px-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                  <span className="font-semibold text-gray-200">
                    {selectedChannel ? `Playing: ${selectedChannel.name}` : 'Select a Live Feed'}
                  </span>
                  {selectedChannel?.group && (
                    <span className="text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                      {selectedChannel.group}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 px-2.5 py-0.5 rounded font-mono font-semibold">
                    AUTO STREAM LATENCY
                  </span>
                </div>
              </div>

              <IPTVPlayer 
                channel={selectedChannel}
                onPrevChannel={handlePrevChannel}
                onNextChannel={handleNextChannel}
              />
            </div>

            {/* Minimal Stream Info under the player */}
            {selectedChannel && (
              <div className="bg-[#121214]/40 border border-white/5 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                <div className="flex items-center gap-3">
                  {selectedChannel.logoUrl ? (
                    <img 
                      src={selectedChannel.logoUrl} 
                      alt="logo" 
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 object-contain p-1.5 bg-black/40 rounded-lg border border-white/5"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-10 h-10 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-lg flex items-center justify-center font-mono font-bold text-sm">
                      {selectedChannel.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-white text-sm">{selectedChannel.name}</h3>
                    <p className="text-gray-400 text-[11px] flex items-center gap-1.5 font-mono mt-0.5">
                      <span>Source Link:</span>
                      <span className="text-indigo-400 truncate max-w-[280px] sm:max-w-md">{selectedChannel.url}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleFavorite(selectedChannel.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    favorites.includes(selectedChannel.id)
                      ? 'bg-rose-600/15 border-rose-500/30 text-rose-400'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${favorites.includes(selectedChannel.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span>{favorites.includes(selectedChannel.id) ? 'Favorited' : 'Add Favorite'}</span>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* BOTTOM DIRECTORY GRID OF 4 COLUMNS */}
        {/* BOTTOM DIRECTORY GRID OF 50 CHANNELS PER PAGE */}
        <section id="catalog-header" className="bg-[#121214] border border-white/10 rounded-xl overflow-hidden shadow-xl p-5 md:p-6 mb-8">
          
          {/* Section title, headers & Stats Badge */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                <Tv className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">✨ IPTV Live Channel Catalog</h2>
                <p className="text-gray-400 text-xs mt-0.5 font-sans">Choose your stream node to begin live broadcast playbacks instantly.</p>
              </div>
            </div>

            {/* Total count badge (This satisfies user's request: "TOTAL KOTO GULA CHANEL ASE SHOW KORBE") */}
            <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
              <span className="text-[10px] uppercase font-mono tracking-wider text-gray-500 font-bold">SOURCE CHANNELS:</span>
              <div className="bg-indigo-600/15 border border-indigo-500/30 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg shadow-indigo-600/5">
                <Radio className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span className="text-xs font-bold text-white font-mono">
                  Total: {activeChannels.length} Channels
                </span>
              </div>
            </div>
          </div>

          {/* Search bar & Category filters */}
          <div className="space-y-4 mb-6">
            
            {/* Real Search bar */}
            <div className="relative">
              <Search className="w-4 h-5 text-gray-400 absolute left-4 top-3.5" />
              <input 
                type="text"
                placeholder="Search TV stations, channels, genres, or keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0A0A0B] border border-white/10 pl-11 pr-5 py-3 rounded-xl text-xs text-[#E0E0E0] placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all font-medium"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="absolute right-4 top-3.5 text-[10px] font-bold text-gray-500 hover:text-white"
                >
                  CLEAR
                </button>
              )}
            </div>

            {/* Horizontal scrolls of groups filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
              {groups.map(group => {
                const isSelected = selectedGroup === group;
                return (
                  <button
                    key={group}
                    onClick={() => setSelectedGroup(group)}
                    className={`px-3.5 py-2 text-[11px] font-bold rounded-lg shrink-0 transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-650 border-indigo-500 text-white shadow-md'
                        : 'bg-[#0A0A0B]/40 border-white/5 text-gray-400 hover:text-gray-200 hover:bg-neutral-900/60'
                    }`}
                  >
                    {group === 'Favorites' ? (
                      <span className="flex items-center gap-1.5 text-rose-450 font-bold">
                        <Heart className="w-3.5 h-3.5 fill-rose-500 stroke-rose-500" /> 
                        <span>Favorites ({favorites.length})</span>
                      </span>
                    ) : group}
                  </button>
                );
              })}
            </div>
          </div>

          {/* CHANNELS GRID ENGINE: 4 columns per line as requested! */}
          {isLoadingDefault ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4 border border-white/5 rounded-xl bg-black/10">
              <div className="relative w-14 h-14 mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-pulse"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin"></div>
              </div>
              <p className="text-gray-300 text-sm font-bold animate-pulse">Fetching FA TV Live Stream Directory...</p>
              <p className="text-xs text-gray-500 max-w-sm mt-1.5 leading-normal">
                Compiling online TV broadcasts and live satellite sources. This will take just a brief moment.
              </p>
            </div>
          ) : filteredChannels.length > 0 ? (
            <div className="space-y-6">
              <div 
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5"
                id="channel-grid-collection"
              >
                {filteredChannels.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((ch) => {
                  const isSelected = selectedChannel?.url === ch.url;
                  const isStarred = favorites.includes(ch.id);

                  return (
                    <div
                      key={ch.id}
                      onClick={() => handleSelectChannel(ch)}
                      className={`group relative p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-indigo-600/10 border-indigo-500 ring-1 ring-indigo-550/20 text-white shadow-lg' 
                          : 'bg-black/30 border-white/5 hover:border-white/20 hover:bg-white/5 text-gray-300'
                      }`}
                    >
                      {/* Active green pulsing dot indicator */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 flex items-center space-x-1 z-10">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 absolute"></span>
                        </div>
                      )}

                      {/* Card Content Row */}
                      <div className="flex items-start gap-3">
                        {/* Logo Box */}
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xs overflow-hidden shrink-0 transition-transform group-hover:scale-105 ${
                          isSelected ? 'bg-indigo-600/20 ring-1 ring-indigo-550/30' : 'bg-black/60 border border-white/5'
                        }`}>
                          {ch.logoUrl ? (
                            <img 
                              src={ch.logoUrl} 
                              alt="TV Logo" 
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-contain p-1"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement!.innerHTML = `<span class="font-bold text-gray-400 capitalize">${ch.name.charAt(0)}</span>`;
                              }}
                            />
                          ) : (
                            <span className="font-bold text-gray-500 capitalize">{ch.name.charAt(0)}</span>
                          )}
                        </div>

                        {/* Title of channel */}
                        <div className="min-w-0 flex-1">
                          <h4 className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-400' : 'text-gray-150 group-hover:text-white'}`}>
                            {ch.name}
                          </h4>
                          <p className="text-[10px] text-gray-500 font-mono mt-0.5 truncate uppercase tracking-wider">
                            {ch.group || 'Live Feed'}
                          </p>
                        </div>
                      </div>

                      {/* Bottom line of card with favorite trigger */}
                      <div className="flex items-center justify-between border-t border-white/5 mt-3 pt-2">
                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest font-semibold flex items-center gap-1">
                          {isSelected ? (
                            <span className="text-indigo-400 font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse inline-block"></span>
                              <span>PLAYING</span>
                            </span>
                          ) : (
                            <span>HLS Stream</span>
                          )}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Avoid selecting channel when favoriting
                            handleToggleFavorite(ch.id);
                          }}
                          className={`p-1.5 rounded-md hover:bg-white/10 transition-colors cursor-pointer ${
                            isStarred ? 'text-rose-500' : 'text-gray-500 hover:text-gray-300'
                          }`}
                          title={isStarred ? "Remove Favorite" : "Mark Favorite"}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isStarred ? 'fill-current' : ''}`} />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>

              {/* Dynamic Page Pagination controls */}
              {filteredChannels.length > PAGE_SIZE && (
                <div className="flex flex-col sm:flex-row items-center justify-between border-t border-white/5 pt-6 gap-4">
                  <span className="text-xs text-gray-400 font-medium">
                    Showing <span className="text-white font-bold">{Math.min(filteredChannels.length, (currentPage - 1) * PAGE_SIZE + 1)}</span> to{' '}
                    <span className="text-white font-bold">{Math.min(filteredChannels.length, currentPage * PAGE_SIZE)}</span> of{' '}
                    <span className="text-indigo-400 font-bold">{filteredChannels.length}</span> channels
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (currentPage > 1) {
                          setCurrentPage(currentPage - 1);
                          document.getElementById('catalog-header')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                      disabled={currentPage === 1}
                      className="px-3.5 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5 text-gray-300 hover:text-white disabled:text-gray-500 rounded-lg border border-white/10 disabled:border-white/5 text-xs font-bold transition-all disabled:cursor-not-allowed cursor-pointer active:scale-98"
                    >
                      ← Previous
                    </button>

                    <div className="flex items-center gap-1 font-mono text-xs">
                      {Array.from({ length: Math.min(5, Math.ceil(filteredChannels.length / PAGE_SIZE)) }, (_, idx) => {
                        const totalPg = Math.ceil(filteredChannels.length / PAGE_SIZE);
                        let pageNumber = currentPage;
                        if (currentPage <= 3) {
                          pageNumber = idx + 1;
                        } else if (currentPage >= totalPg - 2) {
                          pageNumber = totalPg - 4 + idx;
                        } else {
                          pageNumber = currentPage - 2 + idx;
                        }

                        if (pageNumber < 1 || pageNumber > totalPg) return null;

                        const isCurrent = pageNumber === currentPage;
                        return (
                          <button
                            key={pageNumber}
                            onClick={() => {
                              setCurrentPage(pageNumber);
                              document.getElementById('catalog-header')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            className={`w-8.5 h-8.5 flex items-center justify-center rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                              isCurrent
                                ? 'bg-indigo-650 border-indigo-500 text-white font-black'
                                : 'bg-[#0A0A0B]/40 hover:bg-white/5 border-white/5 text-gray-400 hover:text-gray-200'
                            }`}
                          >
                            {pageNumber}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => {
                        const totalPg = Math.ceil(filteredChannels.length / PAGE_SIZE);
                        if (currentPage < totalPg) {
                          setCurrentPage(currentPage + 1);
                          document.getElementById('catalog-header')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                      disabled={currentPage === Math.ceil(filteredChannels.length / PAGE_SIZE)}
                      className="px-3.5 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5 text-gray-300 hover:text-white disabled:text-gray-500 rounded-lg border border-white/10 disabled:border-white/5 text-xs font-bold transition-all disabled:cursor-not-allowed cursor-pointer active:scale-98"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4 border border-white/5 rounded-xl bg-black/10">
              <AlertCircle className="w-11 h-11 text-gray-600 mb-3" />
              <p className="text-gray-300 text-sm font-semibold">No channels match your active filters</p>
              <p className="text-xs text-gray-500 max-w-sm mt-1 leading-normal">
                Try clearing your search keyword, choosing a different playlist group above, or resetting to the default list.
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedGroup('All');
                }}
                className="mt-4 px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-xs rounded-lg shadow transition-all active:scale-98"
              >
                Clear Search & Group Filters
              </button>
            </div>
          )}

          {/* Bottom row summary meta count status */}
          <div className="mt-6 pt-4 border-t border-white/5 text-[10px] text-gray-500 flex justify-between items-center font-mono uppercase font-bold tracking-wider">
            <span>Result matching criteria: {filteredChannels.length} channels</span>
            <span>Active Section: {selectedGroup}</span>
          </div>

        </section>

        {/* PLAYLIST IMPORTER SLIDEDOWN TOOLS */}
        <section className="mb-8">
          <div className="bg-[#121214] border border-white/10 rounded-xl overflow-hidden shadow-xl p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-4.5 mb-4">
              <div>
                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-400" />
                  <span>Choose Playlist Source & Link Streamers</span>
                </h3>
                <p className="text-gray-400 text-xs mt-0.5 font-sans">Load pre-built channels or enrich lists from local files & remote web links.</p>
              </div>

              {/* Selector and Actions */}
              <div className="flex items-center flex-wrap gap-2.5 w-full sm:w-auto">
                <div className="flex items-center bg-black/40 border border-white/5 rounded-lg px-2 py-1.5 w-full sm:w-auto">
                  <span className="text-[10px] text-gray-500 font-mono font-bold uppercase tracking-wider mr-2 shrink-0">PLAYLIST:</span>
                  <select
                    value={activePlaylistId}
                    onChange={(e) => setActivePlaylistId(e.target.value)}
                    className="bg-transparent text-gray-200 text-xs font-bold font-sans outline-none pr-3 cursor-pointer"
                  >
                    <option value="default">✨ Default fa TV Playlists</option>
                    {customPlaylists.map(playlist => (
                      <option key={playlist.id} value={playlist.id}>
                        📦 {playlist.name} ({playlist.channelsCount} ch)
                      </option>
                    ))}
                  </select>
                </div>

                {customPlaylists.length > 0 && (
                  <button
                    onClick={handleClearCustomPlaylists}
                    className="p-2 bg-rose-600/10 hover:bg-rose-600 text-rose-450 hover:text-white rounded-lg transition-all border border-rose-500/20"
                    title="Clear Custom M3U Sources"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Action importing triggers */}
            <div className="flex flex-wrap gap-2.5 mb-4 border-b border-white/5 pb-4">
              <button
                onClick={() => setActiveImportTab(activeImportTab === 'remote' ? 'none' : 'remote')}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  activeImportTab === 'remote'
                    ? 'bg-indigo-650 border-indigo-500 text-white'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'
                }`}
              >
                <Globe className="w-3.5 h-3.5" /> Remote M3U URL
              </button>
              <button
                onClick={() => setActiveImportTab(activeImportTab === 'local' ? 'none' : 'local')}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  activeImportTab === 'local'
                    ? 'bg-indigo-650 border-indigo-500 text-white'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'
                }`}
              >
                <Upload className="w-3.5 h-3.5" /> Upload `.m3u` file
              </button>
              <button
                onClick={() => setActiveImportTab(activeImportTab === 'single' ? 'none' : 'single')}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  activeImportTab === 'single'
                    ? 'bg-indigo-650 border-indigo-500 text-white'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'
                }`}
              >
                <Plus className="w-3.5 h-3.5" /> Direct `.m3u8` link
              </button>
            </div>

            {/* Status alerts callback rendering */}
            {importStatus && (
              <div className={`p-3.5 rounded-lg mb-4 text-xs font-medium flex items-center justify-between border ${
                importStatus.type === 'success'
                  ? 'bg-emerald-600/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-600/10 border-rose-500/20 text-rose-450'
              }`}>
                <span>{importStatus.text}</span>
                <button onClick={() => setImportStatus(null)} className="text-gray-400 hover:text-white font-bold px-1 text-[11px]">✕</button>
              </div>
            )}

            {/* REMOTE IMPORT PANEL */}
            {activeImportTab === 'remote' && (
              <form onSubmit={handleUrlImportSubmit} className="space-y-4 bg-black/45 border border-white/5 p-4 rounded-xl mb-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 mb-1.5 uppercase tracking-wider font-semibold">Playlist Name</label>
                    <input
                      type="text"
                      placeholder="e.g. BD Streams, Sports Hub..."
                      value={remotePlaylistNameInput}
                      onChange={(e) => setRemotePlaylistNameInput(e.target.value)}
                      className="w-full bg-[#0A0A0B] border border-white/10 px-3.5 py-2.5 rounded-lg text-xs text-white outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 mb-1.5 uppercase tracking-wider font-semibold">Remote M3U URL *</label>
                    <input
                      type="url"
                      required
                      placeholder="https://example.com/playlist.m3u"
                      value={remoteUrlInput}
                      onChange={(e) => setRemoteUrlInput(e.target.value)}
                      className="w-full bg-[#0A0A0B] border border-white/10 px-3.5 py-2.5 rounded-lg text-xs text-white outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isImportingUrl || !remoteUrlInput}
                  className="px-5 py-2 bg-indigo-650 hover:bg-indigo-600 disabled:bg-indigo-650/40 text-white font-bold text-xs rounded-lg transition-transform active:scale-98 cursor-pointer flex items-center gap-1.5"
                >
                  {isImportingUrl ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Retrieving streaming feeds...</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4" />
                      <span>Download & Parse M3U Playlist</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* LOCAL FILE UPLOAD PANEL */}
            {activeImportTab === 'local' && (
              <div className="bg-black/45 border border-white/5 p-4 rounded-xl mb-2 text-center">
                <label className="flex flex-col items-center justify-center border border-dashed border-white/10 hover:border-indigo-500/40 rounded-xl h-28 cursor-pointer bg-neutral-900/20 transition-all hover:bg-black/50">
                  <Upload className="w-7 h-7 text-indigo-400 mb-2" />
                  <p className="text-xs text-gray-200 font-bold">Select or drag your .m3u / .m3u8 file here</p>
                  <p className="text-[10px] text-gray-500 mt-1 font-mono">Supports local M3U streams</p>
                  <input 
                    type="file" 
                    accept=".m3u,.m3u8,.txt" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const r = new FileReader();
                        r.onload = (ev) => {
                          const val = ev.target?.result as string;
                          if (val) handleImportPlaylistText(file.name.replace(/\.[^/.]+$/, ""), val);
                        };
                        r.readAsText(file);
                      }
                    }}
                    className="hidden" 
                  />
                </label>
              </div>
            )}

            {/* DIRECT STREAM LINK ADDITION */}
            {activeImportTab === 'single' && (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (singleChannelName && singleChannelUrl) {
                    handleAddCustomChannel({
                      name: singleChannelName,
                      url: singleChannelUrl,
                      group: singleChannelGroup || 'Custom Streams'
                    });
                    setSingleChannelName('');
                    setSingleChannelUrl('');
                  }
                }} 
                className="space-y-4 bg-black/45 border border-white/5 p-4 rounded-xl mb-2"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 mb-1.5 uppercase tracking-wider font-semibold">Channel Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. My Favorite News"
                      value={singleChannelName}
                      onChange={(e) => setSingleChannelName(e.target.value)}
                      className="w-full bg-[#0A0A0B] border border-white/10 px-3.5 py-2.5 rounded-lg text-xs text-white outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 mb-1.5 uppercase tracking-wider font-semibold">HLS Stream Player Link (.m3u8) *</label>
                    <input
                      type="url"
                      required
                      placeholder="https://example.com/live/index.m3u8"
                      value={singleChannelUrl}
                      onChange={(e) => setSingleChannelUrl(e.target.value)}
                      className="w-full bg-[#0A0A0B] border border-white/10 px-3.5 py-2.5 rounded-lg text-xs text-white outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 mb-1.5 uppercase tracking-wider font-semibold">Category Group (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. News, Bangla, Sports"
                      value={singleChannelGroup}
                      onChange={(e) => setSingleChannelGroup(e.target.value)}
                      className="w-full bg-[#0A0A0B] border border-white/10 px-3.5 py-2.5 rounded-lg text-xs text-white outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!singleChannelName || !singleChannelUrl}
                  className="px-5 py-2 bg-indigo-650 hover:bg-indigo-600 disabled:bg-indigo-650/40 text-white font-bold text-xs rounded-lg transition-all active:scale-98 cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Direct Stream Station</span>
                </button>
              </form>
            )}

          </div>
        </section>

      </div>
    </div>
  );
}
