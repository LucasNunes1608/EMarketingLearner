import type { VideoSource } from '../schemas';

/**
 * Video URL construction.
 *
 * Pure string builders, separated from the Astro components so the privacy and
 * locale guarantees below are covered by unit tests rather than by hoping nobody
 * edits a template.
 */

/**
 * The no-cookie YouTube origin.
 *
 * `youtube-nocookie.com` sets no tracking cookies until the learner actually
 * starts playback. Combined with the click-to-load facade this means a learner
 * who never presses play is never tracked, and the page needs no cookie consent
 * banner under the LGPD. Never change this to `www.youtube.com`.
 */
export const YOUTUBE_EMBED_ORIGIN = 'https://www.youtube-nocookie.com';

/** Thumbnail CDN. Serves posters without loading any YouTube JavaScript. */
export const YOUTUBE_THUMBNAIL_ORIGIN = 'https://i.ytimg.com';

export interface EmbedOptions {
  /** The facade only builds this URL after a click, so autoplay is the default. */
  autoplay?: boolean;
  /** BCP-47 tag used for YouTube's own UI and caption preference. */
  lang?: string;
}

export function youTubeEmbedUrl(id: string, options: EmbedOptions = {}): string {
  const { autoplay = true, lang = 'pt-BR' } = options;
  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    // iOS Safari otherwise hijacks the whole screen on play.
    playsinline: '1',
    // Keep end-screen suggestions within the same channel instead of sending a
    // learner off into unrelated recommendations mid-course.
    rel: '0',
    modestbranding: '1',
    // No annotation overlays on top of the lesson.
    iv_load_policy: '3',
    hl: lang,
    cc_lang_pref: lang.split('-')[0] ?? 'pt',
  });
  return `${YOUTUBE_EMBED_ORIGIN}/embed/${id}?${params.toString()}`;
}

/**
 * Poster image for the facade.
 *
 * `hqdefault.jpg` is the only derivative YouTube generates for every single
 * video — `maxresdefault` and `sddefault` 404 on plenty of uploads, which would
 * leave a broken poster. The facade paints a brand gradient behind this image,
 * so even a 404 degrades to something intentional-looking.
 */
export function youTubePosterUrl(id: string): string {
  return `${YOUTUBE_THUMBNAIL_ORIGIN}/vi/${id}/hqdefault.jpg`;
}

/** The URL that goes into the player once the learner opts in. */
export function embedUrlFor(source: VideoSource, options?: EmbedOptions): string {
  switch (source.provider) {
    case 'youtube':
      return youTubeEmbedUrl(source.id, options);
    case 'hls':
      return source.src;
  }
}

/** Poster to show before playback, or null when the provider has none. */
export function posterUrlFor(source: VideoSource): string | null {
  switch (source.provider) {
    case 'youtube':
      return youTubePosterUrl(source.id);
    case 'hls':
      return source.poster ?? null;
  }
}
