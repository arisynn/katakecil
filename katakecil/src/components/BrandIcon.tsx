import type { CSSProperties, HTMLAttributes } from 'react';

/** V7 iconography: bundled SVG assets, rendered as a CSS mask so both themes inherit currentColor. */
export const brandIconNames = ['alert', 'align-justify', 'align-left', 'arrow-down', 'arrow-left', 'arrow-right', 'arrow-up', 'bell', 'bold', 'book-open', 'book-text', 'bookmark', 'bookmark-check', 'books', 'calendar', 'calendar-clock', 'chart', 'check', 'check-circle', 'chevron-down', 'chevron-left', 'chevron-right', 'chevron-up', 'clock', 'close', 'columns', 'compass', 'dashboard', 'database', 'delete', 'download', 'eye', 'file', 'file-pen', 'file-plus', 'filter', 'focus', 'folder', 'fullscreen', 'heading', 'heart', 'history', 'home', 'image-plus', 'info', 'italic', 'layers', 'list', 'lock', 'logout', 'megaphone', 'menu', 'merge', 'minimize', 'minus', 'moon', 'more', 'pen', 'plus', 'quote', 'refresh', 'restore', 'rotate', 'save', 'scissors', 'search', 'send', 'settings', 'shield', 'sliders', 'sparkle', 'square', 'sun', 'type', 'undo', 'upload'] as const;
export type BrandIconName = (typeof brandIconNames)[number];

type Props = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  name: BrandIconName;
  size?: number;
  label?: string;
};
export default function BrandIcon({ name, size = 20, label, className = '', style, ...rest }: Props) {
  const asset = `/assets/v7/icons/${name}.svg`;
  const maskStyle: CSSProperties = {
    width: size,
    height: size,
    maskImage: `url("${asset}")`,
    WebkitMaskImage: `url("${asset}")`,
    ...style,
  };
  return <span className={`kk-brand-icon ${className}`.trim()} style={maskStyle}
    role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} {...rest}/>;
}
