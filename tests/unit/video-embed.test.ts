import { describe, expect, it } from 'vitest';

import type { VideoSource } from '@/lib/schemas';
import {
  embedUrlFor,
  posterUrlFor,
  YOUTUBE_EMBED_ORIGIN,
  youTubeEmbedUrl,
  youTubePosterUrl,
} from '@/lib/video/embed';

const ID = 'AULA0000001';

describe('youTubeEmbedUrl', () => {
  it('always uses the no-cookie origin', () => {
    expect(youTubeEmbedUrl(ID).startsWith(YOUTUBE_EMBED_ORIGIN)).toBe(true);
  });

  /**
   * This is the load-bearing privacy assertion for the whole project: serving from
   * www.youtube.com would set tracking cookies and force a consent banner.
   */
  it('never emits a cookie-setting youtube.com origin', () => {
    const url = youTubeEmbedUrl(ID);
    expect(url).not.toMatch(/\/\/(www\.)?youtube\.com/);
    expect(new URL(url).hostname).toBe('www.youtube-nocookie.com');
  });

  it('embeds the id in the path rather than a query parameter', () => {
    expect(new URL(youTubeEmbedUrl(ID)).pathname).toBe(`/embed/${ID}`);
  });

  it('sets playsinline so iOS does not hijack the screen', () => {
    expect(new URL(youTubeEmbedUrl(ID)).searchParams.get('playsinline')).toBe('1');
  });

  it('keeps suggestions on the same channel', () => {
    expect(new URL(youTubeEmbedUrl(ID)).searchParams.get('rel')).toBe('0');
  });

  it('autoplays by default, because the facade only builds this after a click', () => {
    expect(new URL(youTubeEmbedUrl(ID)).searchParams.get('autoplay')).toBe('1');
  });

  it('can opt out of autoplay', () => {
    const url = new URL(youTubeEmbedUrl(ID, { autoplay: false }));
    expect(url.searchParams.get('autoplay')).toBe('0');
  });

  it('requests the Brazilian Portuguese interface and captions by default', () => {
    const params = new URL(youTubeEmbedUrl(ID)).searchParams;
    expect(params.get('hl')).toBe('pt-BR');
    expect(params.get('cc_lang_pref')).toBe('pt');
  });

  it('derives the caption language from a custom locale', () => {
    const params = new URL(youTubeEmbedUrl(ID, { lang: 'es-AR' })).searchParams;
    expect(params.get('hl')).toBe('es-AR');
    expect(params.get('cc_lang_pref')).toBe('es');
  });

  it('produces a parseable URL', () => {
    expect(() => new URL(youTubeEmbedUrl(ID))).not.toThrow();
  });
});

describe('youTubePosterUrl', () => {
  it('uses hqdefault, the only derivative that exists for every video', () => {
    expect(youTubePosterUrl(ID)).toBe(`https://i.ytimg.com/vi/${ID}/hqdefault.jpg`);
  });
});

describe('embedUrlFor', () => {
  it('dispatches a youtube source to the no-cookie embed', () => {
    const source: VideoSource = { provider: 'youtube', id: ID };
    expect(embedUrlFor(source)).toContain('youtube-nocookie.com');
  });

  it('passes an hls source through untouched, ready for a future self-hosted player', () => {
    const src = 'https://videos.example.com/aula-01/master.m3u8';
    expect(embedUrlFor({ provider: 'hls', src })).toBe(src);
  });
});

describe('posterUrlFor', () => {
  it('derives a poster for youtube sources', () => {
    expect(posterUrlFor({ provider: 'youtube', id: ID })).toContain(ID);
  });

  it('uses the declared poster for hls sources', () => {
    const poster = 'https://cdn.example.com/poster.jpg';
    expect(
      posterUrlFor({ provider: 'hls', src: 'https://x.example.com/a.m3u8', poster })
    ).toBe(poster);
  });

  it('returns null when an hls source declares no poster', () => {
    expect(posterUrlFor({ provider: 'hls', src: 'https://x.example.com/a.m3u8' })).toBeNull();
  });
});
