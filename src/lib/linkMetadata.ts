import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

export interface LinkMetadata {
  title?: string;
  description?: string;
  author?: string;
  thumbnail?: string;
  provider?: string;
  loading?: boolean;
}

const metadataCache: Record<string, LinkMetadata> = {};
const listeners: Set<() => void> = new Set();

const notifyListeners = () => {
  listeners.forEach(cb => cb());
};

export const getDomain = (url: string): string => {
  if (!url || url === '#') return 'link';
  try {
    const raw = url.startsWith('http') ? url : `https://${url}`;
    const parsed = new URL(raw);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'link';
  }
};

export const getCachedLinkMetadata = (link: string): LinkMetadata | undefined => {
  return metadataCache[link];
};

export const fetchLinkMetadata = async (link: string): Promise<LinkMetadata> => {
  if (!link || link === '#') {
    return { title: 'No Link Assigned', description: 'No external URL bound to this item.', loading: false };
  }

  if (metadataCache[link] && !metadataCache[link].loading) {
    return metadataCache[link];
  }

  metadataCache[link] = { loading: true };
  notifyListeners();

  try {
    const isYouTube = /(?:youtube\.com|youtu\.be)/i.test(link);
    if (isYouTube) {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(link)}&format=json`;
      const res = await fetch(oembedUrl);
      if (res.ok) {
        const data = await res.json();
        const meta: LinkMetadata = {
          title: data.title || 'YouTube Video',
          author: data.author_name || 'YouTube Creator',
          provider: 'YouTube',
          thumbnail: data.thumbnail_url || undefined,
          description: `YouTube video content uploaded by ${data.author_name || 'YouTube Creator'}.`,
          loading: false
        };
        metadataCache[link] = meta;
        notifyListeners();
        return meta;
      }
    }

    let html = '';
    try {
      const response = await tauriFetch(link, { method: 'GET' });
      if (response.ok) {
        html = await response.text();
      }
    } catch {
      const response = await fetch(link, { method: 'GET' }).catch(() => null);
      if (response && response.ok) {
        html = await response.text();
      }
    }

    if (html) {
      const titleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i) ||
                         html.match(/<title[^>]*>([^<]+)<\/title>/i);
      
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i) ||
                        html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i);

      const imgMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                       html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);

      const domain = getDomain(link);
      const title = titleMatch ? titleMatch[1].trim() : `${domain} Page`;
      const description = descMatch ? descMatch[1].trim() : `Web page content hosted on ${domain}.`;
      const thumbnail = imgMatch ? imgMatch[1].trim() : undefined;

      const meta: LinkMetadata = {
        title,
        description,
        thumbnail,
        provider: domain,
        loading: false
      };
      metadataCache[link] = meta;
      notifyListeners();
      return meta;
    }

    throw new Error('Fallback preview');
  } catch {
    const domain = getDomain(link);
    let title = `${domain} Reference`;
    let description = `External website link pointing to ${domain}. Click to view full content.`;

    if (link.includes('drive.google.com')) {
      title = 'Google Drive Asset';
      description = 'Shared document or cloud storage folder hosted on Google Drive.';
    } else if (link.includes('github.com')) {
      title = 'GitHub Repository Reference';
      description = 'Source code repository or documentation hosted on GitHub.';
    } else if (link.includes('youtube.com') || link.includes('youtu.be')) {
      title = 'YouTube Video Stream';
      description = 'Online video reference hosted on YouTube.';
    }

    const meta: LinkMetadata = {
      title,
      description,
      provider: domain,
      loading: false
    };
    metadataCache[link] = meta;
    notifyListeners();
    return meta;
  }
};

export const subscribeLinkMetadata = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};
