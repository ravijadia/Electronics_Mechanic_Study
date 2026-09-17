import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

export interface VideoProps {
  /** YouTube video ID, e.g. "dQw4w9WgXcQ". Ignored if `url` is given. */
  id?: string;
  /**
   * Full video URL. Understands youtube.com/watch, youtu.be, youtube.com/embed,
   * youtube.com/shorts, and vimeo.com/<number>. Anything else is used as the
   * iframe src unchanged (must be an embeddable URL).
   */
  url?: string;
  /** Required. Used as the iframe title for screen readers. */
  title: string;
  /** Optional caption shown under the video. */
  caption?: React.ReactNode;
  /** Optional figure number, e.g. "8.2" → "Video 8.2 — <caption>". */
  number?: string | number;
  /** Start time in seconds (YouTube only). */
  start?: number;
  className?: string;
}

function toEmbedSrc(id?: string, url?: string, start?: number): string {
  const q = start && start > 0 ? `?start=${Math.floor(start)}` : '';
  if (id) {
    return `https://www.youtube-nocookie.com/embed/${id}${q}`;
  }
  if (!url) {
    return '';
  }
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}${q}`;
    }
    if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'm.youtube.com') {
      if (u.pathname === '/watch') {
        return `https://www.youtube-nocookie.com/embed/${u.searchParams.get('v') ?? ''}${q}`;
      }
      const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/);
      if (m) {
        return `https://www.youtube-nocookie.com/embed/${m[1]}${q}`;
      }
    }
    if (host === 'vimeo.com') {
      const num = u.pathname.split('/').filter(Boolean)[0];
      if (num) {
        return `https://player.vimeo.com/video/${num}`;
      }
    }
  } catch {
    // fall through
  }
  return url;
}

export default function Video({
  id,
  url,
  title,
  caption,
  number,
  start,
  className,
}: VideoProps): JSX.Element {
  const src = toEmbedSrc(id, url, start);

  return (
    <figure className={clsx(styles.figure, className)}>
      <div className={styles.frame}>
        <iframe
          className={styles.iframe}
          src={src}
          title={title}
          loading="lazy"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      {(caption != null || number != null) && (
        <figcaption className={styles.caption}>
          {number != null && (
            <strong className={styles.number}>Video {number}</strong>
          )}
          {number != null && caption != null ? ' — ' : null}
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
