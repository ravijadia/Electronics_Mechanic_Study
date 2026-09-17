import React from 'react';
import clsx from 'clsx';
import useBaseUrl from '@docusaurus/useBaseUrl';
import ThemedImage from '@theme/ThemedImage';
import styles from './styles.module.css';

export interface FigureProps {
  /**
   * Site-absolute path to the image, starting with `/img/figures/...`.
   * Example: "/img/figures/module-07-active-passive-components/inductors-capacitors/capacitor-symbol.svg"
   */
  src: string;
  /** Optional separate image for dark mode. If given, `src` is used for light mode only. */
  darkSrc?: string;
  /** Required. Describe the figure for screen readers and when the image fails to load. */
  alt: string;
  /** Caption text shown under the image. */
  caption?: React.ReactNode;
  /** Figure number, e.g. "7.1". Rendered as "Figure 7.1 — <caption>". */
  number?: string | number;
  /** Fixed display width: a number (px) or any CSS width value. Defaults to the image's natural size, capped by CSS. */
  width?: number | string;
  /**
   * For dark line-art (black-on-transparent schematics) with no dark variant:
   * invert the colours in dark mode instead of showing a white plate.
   */
  invertInDark?: boolean;
  /** Drop the white plate / border / padding — use for photographs. */
  bare?: boolean;
  /** Optional link opened when the figure is clicked (source file, simulation, datasheet). */
  href?: string;
  className?: string;
}

export default function Figure({
  src,
  darkSrc,
  alt,
  caption,
  number,
  width,
  invertInDark,
  bare,
  href,
  className,
}: FigureProps): JSX.Element {
  const light = useBaseUrl(src);
  const dark = useBaseUrl(darkSrc ?? src);
  const style = width
    ? {width: typeof width === 'number' ? `${width}px` : width}
    : undefined;

  const imgClass = clsx(
    styles.img,
    !bare && styles.plate,
    invertInDark && !darkSrc && styles.invertInDark,
  );

  const image = darkSrc ? (
    <ThemedImage
      className={imgClass}
      alt={alt}
      sources={{light, dark}}
      style={style}
    />
  ) : (
    <img
      className={imgClass}
      src={light}
      alt={alt}
      loading="lazy"
      style={style}
    />
  );

  return (
    <figure className={clsx(styles.figure, className)}>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {image}
        </a>
      ) : (
        image
      )}
      {(caption != null || number != null) && (
        <figcaption className={styles.caption}>
          {number != null && (
            <strong className={styles.number}>Figure {number}</strong>
          )}
          {number != null && caption != null ? ' — ' : null}
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
