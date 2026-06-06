import React, { useState, useMemo } from 'react';
import { 
  Search, Heart, Plus, Globe, Upload, Tv, Trash2, 
  HelpCircle, AlertCircle, FileText, Check, Database, Play
} from 'lucide-react';
import { Channel, Playlist } from '../types';
import { parseM3U } from '../utils/m3uParser';

interface ChannelListProps {
  channels: Channel[];
  selectedChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
  favorites: string[];
  onToggleFavorite: (channelId: string) => void;
  
  // Custom list management
  onImportPlaylistText: (name: string, text: string) => void;
  onImportPlaylistUrl: (name: string, url: string) => Promise<void>;
  onAddCustomChannel: (channel: Omit<Channel, 'id'>) => void;
  onClearCustomPlaylists: () => void;
  customPlaylists: Playlist[];
  activePlaylistId: string;
  onSelectPlaylist: (playlistId: string) => void;
}

export const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  selectedChannel,
  onSelectChannel,
  favorites,
  onToggleFavorite,
  onImportPlaylistText,
  onImportPlaylistUrl,
  onAddCustomChannel,
  onClearCustomPlaylists,
  customPlaylists,
  activePlaylistId,
  onSelectPlaylist
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('All');
  
  // Import tabs & states
  const [activeTab, setActiveTab] = useState<'channels' | 'import-m3u' | 'add-single'>('channels');
  const [urlInput, setUrlInput] = useState('');
  const [playlistNameInput, setPlaylistNameInput] = useState('');
  const [isImportingUrl, setIsImportingUrl] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Single dynamic input fields
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelUrl, setNewChannelUrl] = useState('');
  const [newChannelGroup, setNewChannelGroup] = useState('My Custom Channels');

  // Parse all loaded groups dynamically
  const groups = useMemo(() => {
    const set = new Set<string>();
    channels.forEach(ch => {
      if (ch.group) set.add(ch.group);
    });
    const sorted = Array.from(set).sort();
    return ['All', 'Favorites', ...sorted];
  }, [channels]);

  // Handle local uploaded M3U text file parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      
      try {
        const title = file.name.replace('.m3u8', '').replace('.m3u', '');
        onImportPlaylistText(title, text);
        setImportSuccess(`Loaded local file "${file.name}" successfully!`);
        setActiveTab('channels');
        setSearchTerm('');
      } catch (err) {
        setImportError('Failed to parse file. Ensure it is a valid M3U file.');
      }
    };
    reader.readAsText(file);
  };

  // Handle Remote Playlist parsing via server proxy
  const handleUrlImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput) return;

    setImportError(null);
    setImportSuccess(null);
    setIsImportingUrl(true);

    const playlistName = playlistNameInput.trim() || `Playlist-${Math.floor(Math.random() * 900) + 100}`;

    try {
      await onImportPlaylistUrl(playlistName, urlInput);
      setImportSuccess(`Imported remote playlist "${playlistName}" successfully!`);
      setUrlInput('');
      setPlaylistNameInput('');
      setActiveTab('channels');
    } catch (err: any) {
      setImportError(err.message || 'Could not fetch or parse playlist. Check URL or verify if stream remains live.');
    } finally {
      setIsImportingUrl(false);
    }
  };

  // Save manual custom channel item
  const handleAddSingleChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName || !newChannelUrl) return;

    onAddCustomChannel({
      name: newChannelName,
      url: newChannelUrl,
      group: newChannelGroup || 'Custom Streams'
    });

    setNewChannelName('');
    setNewChannelUrl('');
    setImportSuccess(`Added custom stream "${newChannelName}" to list!`);
    setActiveTab('channels');
    setSelectedGroup('All');
  };

  // Filter channels based on search and selected group tab
  const filteredChannels = useMemo(() => {
    return channels.filter(ch => {
      // Group match
      if (selectedGroup === 'Favorites') {
        if (!favorites.includes(ch.id)) return false;
      } else if (selectedGroup !== 'All') {
        if (ch.group !== selectedGroup) return false;
      }

      // Search text match
      const query = searchTerm.toLowerCase();
      return (
        ch.name.toLowerCase().includes(query) ||
        (ch.group && ch.group.toLowerCase().includes(query))
      );
    });
  }, [channels, selectedGroup, searchTerm, favorites]);

  return (
    <div 
      className="flex flex-col bg-[#121214] border border-white/10 rounded-xl shadow-xl h-[610px] overflow-hidden"
      id="channels-sidebar-panel"
    >
      {/* Top Navbar tabs */}
      <div className="flex border-b border-white/5 bg-black/40 p-1.5 gap-1.5 shrink-0">
        <button
          onClick={() => setActiveTab('channels')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg tracking-tight transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'channels' 
              ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-650/10' 
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
          }`}
        >
          <Tv className="w-3.5 h-3.5" /> Channels
        </button>
        <button
          onClick={() => setActiveTab('import-m3u')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg tracking-tight transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'import-m3u' 
              ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-650/10' 
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
          }`}
        >
          <Upload className="w-3.5 h-3.5" /> Import M3U
        </button>
        <button
          onClick={() => setActiveTab('add-single')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg tracking-tight transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'add-single' 
              ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-650/10' 
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
          }`}
        >
          <Plus className="w-3.5 h-3.5" /> Direct URL
        </button>
      </div>

      {/* Primary tab views content container */}
      {activeTab === 'channels' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Active Playlist Selector Line */}
          {customPlaylists.length > 0 && (
            <div className="bg-[#0A0A0B]/75 border-b border-white/5 px-4 py-2 flex items-center justify-between shrink-0 text-xs">
              <span className="text-gray-500 flex items-center gap-1 font-mono text-[10px] font-bold">
                <Database className="w-3 h-3 text-gray-650" /> SOURCE PLAYLIST:
              </span>
              <div className="flex items-center gap-1.5">
                <select
                  value={activePlaylistId}
                  onChange={(e) => onSelectPlaylist(e.target.value)}
                  className="bg-[#121214] border border-white/10 text-gray-300 px-2 py-1.5 rounded-lg text-xs outline-none focus:border-indigo-500 max-w-[160px] font-semibold"
                >
                  <option value="default">✨ Default Playlist</option>
                  {customPlaylists.map(playlist => (
                    <option key={playlist.id} value={playlist.id}>
                      📁 {playlist.name} ({playlist.channelsCount})
                    </option>
                  ))}
                </select>
                
                <button
                  onClick={onClearCustomPlaylists}
                  className="p-1 hover:bg-rose-500/10 text-gray-500 hover:text-rose-450 rounded-md transition-colors"
                  title="Clear all playlists"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Quick Filter Inputs */}
          <div className="p-3 bg-black/25 border-b border-white/5 space-y-2.5 shrink-0">
            {/* Search filter bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-550 absolute left-3 top-3" />
              <input 
                type="text"
                placeholder="Search TV Channels or Groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0A0A0B] border border-white/10 pl-9 pr-4 py-2 rounded-xl text-xs text-[#E0E0E0] placeholder-gray-550 outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-all font-medium"
              />
            </div>

            {/* Horizontal list of Group tags */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/10">
              {groups.map(group => (
                <button
                  key={group}
                  onClick={() => setSelectedGroup(group)}
                  className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg shrink-0 transition-all border ${
                    selectedGroup === group
                      ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400 font-bold'
                      : 'bg-[#0A0A0B]/40 border-white/5 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {group === 'Favorites' ? (
                    <span className="flex items-center gap-1 text-rose-450">
                      <Heart className="w-3.5 h-3.5 fill-rose-500 stroke-rose-500" /> Favorites ({favorites.length})
                    </span>
                  ) : group}
                </button>
              ))}
            </div>
          </div>

          {/* Channels Scroll list */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1 bg-black/10">
            {filteredChannels.length > 0 ? (
              filteredChannels.map((ch) => {
                const isSelected = selectedChannel?.url === ch.url;
                const isFav = favorites.includes(ch.id);
                
                return (
                  <div
                    key={ch.id}
                    className={`flex items-center justify-between p-2 rounded-xl transition-all border ${
                      isSelected 
                        ? 'bg-indigo-600/10 border-indigo-500/25 text-white' 
                        : 'bg-black/25 border-white/5 hover:bg-white/5 text-gray-300'
                    }`}
                  >
                    {/* Select channel action area */}
                    <div 
                      onClick={() => onSelectChannel(ch)}
                      className="flex items-center space-x-2.5 cursor-pointer flex-1 min-w-0"
                    >
                      <div className={`w-8 h-8 rounded-lg outline-none flex items-center justify-center text-xs overflow-hidden shrink-0 transition-transform ${
                        isSelected ? 'bg-indigo-600/20 ring-1 ring-indigo-500/50 scale-102' : 'bg-[#0A0A0B] border border-white/10'
                      }`}>
                        {ch.logoUrl ? (
                          <img 
                            src={ch.logoUrl} 
                            alt={ch.name} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              // If image fails, revert to generic text fallback
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Tv className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-gray-500'}`} />
                        )}
                      </div>
                      <div className="truncate pr-1">
                        <p className={`text-xs font-semibold leading-snug truncate ${
                          isSelected ? 'text-indigo-400 font-bold' : 'text-gray-200'
                        }`}>
                          {ch.name}
                        </p>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5 uppercase truncate tracking-wider">
                          {ch.group}
                        </p>
                      </div>
                    </div>

                    {/* Left align play action and Right align Favorite Heart button */}
                    <div className="flex items-center space-x-1 shrink-0">
                      {isSelected && (
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse mr-2.5" title="Playing" />
                      )}
                      
                      <button
                        onClick={() => onToggleFavorite(ch.id)}
                        className={`p-1.5 rounded-lg hover:bg-white/5 transition-colors ${
                          isFav ? 'text-rose-550' : 'text-gray-500 hover:text-gray-300'
                        }`}
                        title={isFav ? "Remove from Favorites" : "Mark Favorite"}
                      >
                        <Heart className={`w-4 h-4 ${isFav ? 'text-rose-500 fill-current' : ''}`} />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <AlertCircle className="w-10 h-10 text-gray-655 mb-2.5" />
                <p className="text-gray-400 text-xs font-semibold">No Streams Found</p>
                <p className="text-[11px] text-gray-550 max-w-xs mt-1">
                  Try adjusting filters, clearing your search, importing an M3U play list or adding custom channel nodes.
                </p>
              </div>
            )}
          </div>
          
          <div className="px-4 py-2.5 shrink-0 bg-[#0A0A0B]/80 border-t border-white/5 text-[11px] text-gray-500 flex justify-between items-center font-mono font-semibold">
            <span>Total Shown: {filteredChannels.length}</span>
            <span>All Groups: {groups.length - 2}</span>
          </div>
        </div>
      )}

      {activeTab === 'import-m3u' && (
        <div className="flex-1 p-5 space-y-4 overflow-y-auto bg-black/10">
          <div className="space-y-1">
            <h3 className="text-[#E0E0E0] font-bold text-sm tracking-tight flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-indigo-400" /> Remote M3U Playlist URL
            </h3>
            <p className="text-gray-400 text-xs leading-normal">
              Input a remote IPTV playlist URL in <code className="bg-[#0A0A0B] border border-white/5 px-1 py-0.5 rounded text-[11px] text-indigo-400 bg-black/50 font-mono">.m3u</code> or <code className="bg-[#0A0A0B] border border-white/5 px-1 py-0.5 rounded text-[11px] text-indigo-400 bg-black/50 font-mono">.m3u8</code> format. Our server will safely fetch and parse streams bypass CORS policies smoothly.
            </p>
          </div>

          <form onSubmit={handleUrlImport} className="space-y-3">
            <div>
              <label className="block text-[11px] font-mono text-gray-400 mb-1 uppercase tracking-wider font-semibold">Playlist Name (Optional)</label>
              <input
                type="text"
                placeholder="Give this playlist a custom name..."
                value={playlistNameInput}
                onChange={(e) => setPlaylistNameInput(e.target.value)}
                className="w-full bg-[#0A0A0B] border border-white/10 px-3 py-2 rounded-lg text-xs text-[#E0E0E0] outline-none focus:border-indigo-500 transition-colors placeholder:text-gray-650"
              />
            </div>
            
            <div>
              <label className="block text-[11px] font-mono text-gray-400 mb-1 uppercase tracking-wider font-semibold font-bold">M3U List URL *</label>
              <input
                type="url"
                required
                placeholder="https://example.com/stream-list.m3u"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full bg-[#0A0A0B] border border-white/10 px-3 py-2.5 rounded-lg text-xs text-[#E0E0E0] outline-none focus:border-indigo-500 transition-colors placeholder:text-gray-650"
              />
            </div>

            <button
              type="submit"
              disabled={isImportingUrl || !urlInput}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/40 text-white font-bold text-xs rounded-lg shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isImportingUrl ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Fetching remote list...</span>
                </>
              ) : (
                <>
                  <Globe className="w-3.5 h-3.5" /> Parse Link Channels
                </>
              )}
            </button>
          </form>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-white/5"></div>
            <span className="flex-shrink mx-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest font-bold">OR</span>
            <div className="flex-grow border-t border-white/5"></div>
          </div>

          <div className="space-y-3 text-center">
            <div className="text-left">
              <h3 className="text-gray-200 font-bold text-sm tracking-tight flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-400" /> Upload Local Playlist
              </h3>
              <p className="text-gray-400 text-xs mt-1 leading-normal">
                Have a preloaded `.m3u` template on your system? Drag or click below to parse immediately in browser.
              </p>
            </div>

            <label className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 hover:border-indigo-500/40 rounded-xl h-24 cursor-pointer bg-[#0A0A0B]/20 transition-colors hover:bg-black/40">
              <Upload className="w-6 h-6 text-gray-550 mb-1.5" />
              <p className="text-xs text-gray-300 font-medium">Click to select .m3u file</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Supports UTF-8 metadata playlists</p>
              <input 
                type="file" 
                accept=".m3u,.m3u8,.txt" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </label>
          </div>

          {importError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{importError}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'add-single' && (
        <form onSubmit={handleAddSingleChannel} className="flex-1 p-5 space-y-4 overflow-y-auto bg-black/10">
          <div className="space-y-1">
            <h3 className="text-gray-250 font-bold text-sm tracking-tight flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-indigo-400" /> Add Custom Stream Link
            </h3>
            <p className="text-gray-400 text-xs leading-normal">
              Found a raw IPTV livestream online? Input its title and HLS `.m3u8` player URL directly to include in your channels lineup.
            </p>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-mono text-gray-400 mb-1 uppercase tracking-wider font-semibold">Channel Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. My Favorite News Feed"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                className="w-full bg-[#0A0A0B] border border-white/10 px-3 py-2.5 rounded-lg text-xs text-[#E0E0E0] outline-none focus:border-indigo-500 transition-colors placeholder:text-gray-650"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-gray-400 mb-1 uppercase tracking-wider font-semibold">M3U8 Stream URL *</label>
              <input
                type="url"
                required
                placeholder="https://server.com/live/stream.m3u8"
                value={newChannelUrl}
                onChange={(e) => setNewChannelUrl(e.target.value)}
                className="w-full bg-[#0A0A0B] border border-white/10 px-3 py-2.5 rounded-lg text-xs text-[#E0E0E0] outline-none focus:border-indigo-500 transition-colors placeholder:text-gray-650"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-gray-400 mb-1 uppercase tracking-wider">Category / Group</label>
              <input
                type="text"
                placeholder="e.g. Sports, Movies, Custom"
                value={newChannelGroup}
                onChange={(e) => setNewChannelGroup(e.target.value)}
                className="w-full bg-[#0A0A0B] border border-white/10 px-3 py-1.5 rounded-lg text-xs text-[#E0E0E0] outline-none focus:border-indigo-500 transition-colors placeholder:text-gray-650"
              />
            </div>

            <button
              type="submit"
              disabled={!newChannelName || !newChannelUrl}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Inject Custom Station
            </button>
          </div>
        </form>
      )}

      {/* Global Toast import alert notices inside drawer foot */}
      {importSuccess && (
        <div className="mx-4 my-2.5 p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-[11px] flex items-center justify-between">
          <span className="truncate">{importSuccess}</span>
          <button onClick={() => setImportSuccess(null)} className="text-emerald-400 font-bold hover:text-white px-1">✕</button>
        </div>
      )}
    </div>
  );
};
