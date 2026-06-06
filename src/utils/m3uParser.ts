import { Channel } from '../types';

/**
 * Parses raw M3U text content into a clean list of Channel objects.
 */
export function parseM3U(m3uText: string, playlistName: string): Channel[] {
  const channels: Channel[] = [];
  const lines = m3uText.split(/\r?\n/);
  
  let currentInfo: {
    name: string;
    group: string;
    logoUrl?: string;
  } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTM3U')) {
      continue;
    }

    if (line.startsWith('#EXTINF:')) {
      // Parse EXTINF line
      // Example: #EXTINF:-1 tvg-id="SkyNews" tvg-name="Sky News" tvg-logo="https://logo.com" group-title="News",Sky News UK
      
      // Extract group-title
      let group = 'Uncategorized';
      const groupMatch = line.match(/group-title="([^"]+)"/) || line.match(/group-title='([^']+)'/);
      if (groupMatch && groupMatch[1]) {
        group = groupMatch[1];
      }

      // Extract tvg-logo
      let logoUrl = '';
      const logoMatch = line.match(/tvg-logo="([^"]+)"/) || line.match(/tvg-logo='([^']+)'/) || line.match(/logo="([^"]+)"/);
      if (logoMatch && logoMatch[1]) {
        logoUrl = logoMatch[1];
      }

      // Extract TV name
      // Usually after the last comma
      let name = 'Unknown Channel';
      const lastCommaIndex = line.lastIndexOf(',');
      if (lastCommaIndex !== -1) {
        name = line.substring(lastCommaIndex + 1).trim();
      } else {
        // Fallback to tvg-name attribute
        const nameMatch = line.match(/tvg-name="([^"]+)"/) || line.match(/tvg-name='([^']+)'/);
        if (nameMatch && nameMatch[1]) {
          name = nameMatch[1];
        }
      }

      currentInfo = {
        name,
        group,
        logoUrl: logoUrl || undefined
      };
    } else if (line.startsWith('#')) {
      // Other metadata line (e.g., #EXTGRP or comments), skip for now
      if (line.startsWith('#EXTGRP:')) {
        if (currentInfo) {
          currentInfo.group = line.replace('#EXTGRP:', '').trim();
        }
      }
    } else {
      // It's a stream URL
      if (currentInfo) {
        // Simple security & sanity check on URLs
        if (line.startsWith('http://') || line.startsWith('https://')) {
          channels.push({
            id: `${playlistName}-${channels.length}-${Math.random().toString(36).substr(2, 5)}`,
            name: currentInfo.name,
            url: line,
            group: currentInfo.group,
            logoUrl: currentInfo.logoUrl
          });
        }
        currentInfo = null;
      }
    }
  }

  return channels;
}
