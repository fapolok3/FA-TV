export interface Channel {
  id: string;
  name: string;
  url: string;
  group: string;
  logoUrl?: string;
  isFavorite?: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  url?: string;
  channelsCount: number;
  channels: Channel[];
  isCustom?: boolean;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
}
