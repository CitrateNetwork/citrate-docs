import React from "react";

/**
 * Citrate Almanac icons, ported from the design handoff (src/icons.jsx). Lucide-style, 1.5px stroke,
 * currentColor. No emoji anywhere in the product (brand rule). Plus the Citrate C-mark (the ✦ motif).
 */
const P: Record<string, React.ReactNode> = {
  search: <g><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5 L21 21"/></g>,
  spark: <path d="M12 3 C12 7 11 8 7 8 C11 8 12 9 12 13 C12 9 13 8 17 8 C13 8 12 7 12 3 Z M18 14 C18 16 17.5 16.5 15.5 16.5 C17.5 16.5 18 17 18 19 C18 17 18.5 16.5 20.5 16.5 C18.5 16.5 18 16 18 14 Z"/>,
  chevDown: <path d="M5 8.5 L12 15 L19 8.5"/>,
  chevRight: <path d="M8.5 5 L15 12 L8.5 19"/>,
  chevLeft: <path d="M15.5 5 L9 12 L15.5 19"/>,
  chevUp: <path d="M5 15.5 L12 9 L19 15.5"/>,
  arrowRight: <path d="M4 12 H20 M14 6 L20 12 L14 18"/>,
  arrowLeft: <path d="M20 12 H4 M10 6 L4 12 L10 18"/>,
  lock: <g><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5 V7 a4 4 0 0 1 8 0 V10.5"/></g>,
  lockOpen: <g><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5 V7 a4 4 0 0 1 7.5 -1.8"/></g>,
  key: <g><circle cx="8" cy="8" r="4.5"/><path d="M11.2 11.2 L20 20 M17 17 L19 15 M14.5 14.5 L16.5 12.5"/></g>,
  user: <g><circle cx="12" cy="8" r="4"/><path d="M4 21 a8 8 0 0 1 16 0"/></g>,
  users: <g><circle cx="9" cy="8" r="3.5"/><path d="M3 20 a6 6 0 0 1 12 0"/><path d="M16 5 a3.5 3.5 0 0 1 0 7 M17 14.5 a6 6 0 0 1 4 5.5"/></g>,
  building: <g><rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3"/></g>,
  shield: <path d="M12 2.5 L20 6 V11.5 C20 16.5 16.5 20 12 21.5 C7.5 20 4 16.5 4 11.5 V6 Z"/>,
  shieldCheck: <g><path d="M12 2.5 L20 6 V11.5 C20 16.5 16.5 20 12 21.5 C7.5 20 4 16.5 4 11.5 V6 Z"/><path d="M9 11.5 L11.2 13.7 L15.2 9.3"/></g>,
  book: <g><path d="M4 5 a2 2 0 0 1 2-2 h13 v16 H6 a2 2 0 0 0-2 2 Z"/><path d="M4 19 a2 2 0 0 1 2-2 h13"/></g>,
  layers: <g><path d="M12 3 L21 8 L12 13 L3 8 Z"/><path d="M3 13 L12 18 L21 13"/></g>,
  cpu: <g><rect x="6.5" y="6.5" width="11" height="11" rx="1.5"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 3v2.5M12 3v2.5M15 3v2.5M9 21v-2.5M12 21v-2.5M15 21v-2.5M3 9h2.5M3 12h2.5M3 15h2.5M21 9h-2.5M21 12h-2.5M21 15h-2.5"/></g>,
  box: <g><path d="M12 2.5 L20.5 7 V17 L12 21.5 L3.5 17 V7 Z"/><path d="M3.5 7 L12 11.5 L20.5 7 M12 11.5 V21.5"/></g>,
  code: <path d="M8.5 8 L4 12 L8.5 16 M15.5 8 L20 12 L15.5 16 M13.5 5 L10.5 19"/>,
  terminal: <g><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9 L10 12 L7 15 M12.5 15 H17"/></g>,
  beaker: <path d="M9 3 H15 M10 3 V9 L5 18 a1.6 1.6 0 0 0 1.4 2.5 H17.6 A1.6 1.6 0 0 0 19 18 L14 9 V3 M7.5 14 H16.5"/>,
  flask: <path d="M9 3 H15 M10 3 V9 L5 18 a1.6 1.6 0 0 0 1.4 2.5 H17.6 A1.6 1.6 0 0 0 19 18 L14 9 V3 M7.5 14 H16.5"/>,
  graph: <g><circle cx="6" cy="7" r="2.2"/><circle cx="18" cy="6" r="2.2"/><circle cx="16" cy="17" r="2.2"/><circle cx="7" cy="16" r="2.2"/><path d="M8 7.6 L16 6.4 M7.2 9 L7 13.8 M8.7 15.2 L14.3 16.3 M8 7.8 L15 16 M17.4 8 L16.4 15"/></g>,
  bolt: <path d="M13 2 L4 14 H11 L10 22 L20 9 H13 Z"/>,
  zap: <path d="M13 2 L4 14 H11 L10 22 L20 9 H13 Z"/>,
  relay: <g><circle cx="5" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><path d="M7 12 H17 M12 7 V17"/></g>,
  coins: <g><ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7 v5 c0 1.7 2.7 3 6 3 s6-1.3 6-3"/><ellipse cx="15" cy="15" rx="6" ry="3"/><path d="M9 15 v2 c0 1.7 2.7 3 6 3 s6-1.3 6-3 v-5"/></g>,
  message: <path d="M4 5 h16 v11 H9 l-4 4 v-4 H4 Z"/>,
  messages: <g><path d="M4 4 h13 v9 H9 l-4 3.5 V13 H4 Z"/><path d="M8 16.5 V18 a1 1 0 0 0 1 1 h7 l3 2.5 V19 a1 1 0 0 0 1-1 v-7 a1 1 0 0 0-1-1 h-1"/></g>,
  sliders: <path d="M4 7 H14 M18 7 H20 M4 17 H8 M12 17 H20 M16 5 v4 M10 15 v4"/>,
  settings: <g><circle cx="12" cy="12" r="3"/><path d="M12 2.5 v2.5 M12 19 v2.5 M21.5 12 h-2.5 M5 12 H2.5 M18.7 5.3 l-1.8 1.8 M7.1 16.9 l-1.8 1.8 M18.7 18.7 l-1.8-1.8 M7.1 7.1 L5.3 5.3"/></g>,
  bell: <g><path d="M18 16 V10.5 a6 6 0 0 0-12 0 V16 L4 18.5 H20 Z"/><path d="M9.5 18.5 a2.5 2.5 0 0 0 5 0"/></g>,
  sun: <g><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5 v2.2 M12 19.3 v2.2 M21.5 12 h-2.2 M4.7 12 h-2.2 M18.4 5.6 l-1.6 1.6 M6.8 17.2 l-1.6 1.6 M18.4 18.4 L16.8 16.8 M6.8 6.8 L5.2 5.2"/></g>,
  moon: <path d="M20 14.5 A8 8 0 1 1 9.5 4 A6.2 6.2 0 0 0 20 14.5 Z"/>,
  monitor: <g><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M9 20 H15 M12 16 V20"/></g>,
  copy: <g><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15 H4.5 A1.5 1.5 0 0 1 3 13.5 V4.5 A1.5 1.5 0 0 1 4.5 3 H13.5 A1.5 1.5 0 0 1 15 4.5 V5"/></g>,
  check: <path d="M5 12.5 L10 17.5 L19.5 7"/>,
  x: <path d="M6 6 L18 18 M18 6 L6 18"/>,
  plus: <path d="M12 4.5 V19.5 M4.5 12 H19.5"/>,
  external: <g><path d="M14 4 H20 V10 M20 4 L11 13"/><path d="M18 14 V19 a1 1 0 0 1-1 1 H5 a1 1 0 0 1-1-1 V7 a1 1 0 0 1 1-1 H10"/></g>,
  link: <g><path d="M10 14 a4 4 0 0 0 6 0 l2.5-2.5 a4 4 0 0 0-5.6-5.6 L11 7.8"/><path d="M14 10 a4 4 0 0 0-6 0 L5.5 12.5 a4 4 0 0 0 5.6 5.6 L13 16.2"/></g>,
  filter: <path d="M4 5 H20 L14 12.5 V19 L10 21 V12.5 Z"/>,
  doc: <g><path d="M14 3 H6.5 A1.5 1.5 0 0 0 5 4.5 V19.5 A1.5 1.5 0 0 0 6.5 21 H17.5 A1.5 1.5 0 0 0 19 19.5 V8 Z"/><path d="M14 3 V8 H19 M8.5 12 H15.5 M8.5 15.5 H15.5 M8.5 8.5 H11"/></g>,
  clock: <g><circle cx="12" cy="12" r="9"/><path d="M12 7 V12 L15.5 14"/></g>,
  globe: <g><circle cx="12" cy="12" r="9"/><path d="M3 12 H21 M12 3 c3.5 4 3.5 14 0 18 c-3.5-4-3.5-14 0-18"/></g>,
  warning: <g><path d="M12 3 L22 20 H2 Z"/><path d="M12 9.5 V14 M12 17 v.2"/></g>,
  info: <g><circle cx="12" cy="12" r="9"/><path d="M12 11 V16.5 M12 7.6 v.2"/></g>,
  refresh: <path d="M20 11 a8 8 0 1 0-1.5 5 M20 5 V11 H14"/>,
  play: <path d="M7 5 L19 12 L7 19 Z"/>,
  send: <path d="M5 12 L20 5 L13 20 L11 13 Z M11 13 L20 5"/>,
  menu: <path d="M4 7 H20 M4 12 H20 M4 17 H20"/>,
  dot: <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>,
  circle: <circle cx="12" cy="12" r="8"/>,
  node: <g><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8" opacity="0.4"/></g>,
  flag: <path d="M5 21 V4 M5 4 H17 L14 8 L17 12 H5"/>,
  database: <g><ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6 v12 c0 1.7 3 3 7 3 s7-1.3 7-3 V6 M5 12 c0 1.7 3 3 7 3 s7-1.3 7-3"/></g>,
  compass: <g><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5 L13.5 13.5 L8.5 15.5 L10.5 10.5 Z"/></g>,
  scroll: <g><path d="M6 4 h11 v13 a3 3 0 0 0 3 3 H8 a3 3 0 0 1-3-3 V6 a2 2 0 0 1 1-2 Z"/><path d="M9 8 H14 M9 11 H14"/></g>,
  signout: <path d="M14 5 H6 a1 1 0 0 0-1 1 v12 a1 1 0 0 0 1 1 h8 M16 8 L20 12 L16 16 M20 12 H9"/>,
  command: <path d="M9 6 a2 2 0 1 0-2 2 H17 a2 2 0 1 0-2-2 V17 a2 2 0 1 0 2-2 H7 a2 2 0 1 0 2 2 Z"/>,
  wallet: <g><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 9 H18 a1 1 0 0 1 1 1 v3 a1 1 0 0 1-1 1 H3"/></g>,
  mail: <g><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5 L12 13 L20.5 6.5"/></g>,
  passkey: <g><circle cx="9" cy="9" r="4"/><path d="M9 13 a5 5 0 0 0-5 5 h7 M15 13 a2.5 2.5 0 1 1 2.5 2.5 v5 l-1.2-1 l1.2-1 l-1.2-1"/></g>,
};

export type IconName = keyof typeof P;

export function Icon({ name, size = 16, strokeWidth = 1.5, style, className }: {
  name: IconName | string; size?: number; strokeWidth?: number; style?: React.CSSProperties; className?: string;
}) {
  const path = P[name as string];
  if (!path) return null;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className={className}
      style={{ flexShrink: 0, display: "block", ...style }}
      fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {path}
    </svg>
  );
}

/** The Citrate C-mark, the ✦ Almanac/agent motif. */
export function CitrateMark({ size = 22, color = "currentColor", style }: { size?: number; color?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="21.69 16.46 79.88 71.36" style={{ display: "block", flexShrink: 0, ...style }}>
      <g fill={color} stroke={color} strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M40.05,65c2.21-.14,4.02-.63,5.3-1.1-1.94-2.21-3.88-4.41-5.82-6.62l-4.27,7.4c1.23.24,2.87.43,4.79.31Z"/>
        <path d="M41.7,73.61c4.34-.04,7.98-.72,10.68-1.44-2.03-2.28-4.06-4.56-6.1-6.84-1.4.54-3.41,1.14-5.88,1.35-2.41.2-4.45-.04-5.9-.32l-3.47,6.01c2.71.66,6.35,1.28,10.68,1.24Z"/>
        <path d="M53.37,74.02c-2.94.76-6.87,1.48-11.53,1.53-4.65.05-8.58-.59-11.53-1.28-.86,1.5-1.73,2.99-2.59,4.49-1.03,1.78.26,4.01,2.32,4.01h30.93c-2.53-2.92-5.06-5.83-7.59-8.75Z"/>
        <path d="M62.58,47.91c.69-.85,1.4-1.69,2.13-2.51,1.49-1.69,3.08-3.3,4.81-4.74.92-.76,1.98-1.39,3.04-1.95.16-.08.32-.16.48-.25l-8.79-15.22c-1.03-1.78-3.6-1.78-4.63,0l-8.62,14.93c3.86,3.25,7.72,6.49,11.57,9.74Z"/>
        <path d="M75.24,58.35c.44-.33.9-.66,1.37-.96,1.4-.89,2.8-1.77,4.27-2.56.5-.27,1.01-.53,1.52-.78l-8-13.85c-.86.42-1.69.9-2.48,1.43-.94.63-1.78,1.4-2.6,2.17-1.62,1.53-3.09,3.2-4.51,4.91-.17.2-.33.41-.5.61,3.64,3.01,7.29,6.02,10.93,9.03Z"/>
        <path d="M79.77,57.69c-1.14.7-2.12,1.42-2.94,2.1,6.07,5.26,12.14,10.51,18.21,15.77l-11.43-19.8c-1.14.46-2.45,1.09-3.84,1.93Z"/>
        <path d="M75.19,61.37s-.01.01-.02.01c-2.22,1.74-3.69,3.28-4.22,3.82-1.88,1.93-2.99,3.07-4.71,4.26-2.4,1.66-4.66,2.49-6.6,3.21-1.3.48-2.41.82-3.23,1.04,2.62,3.04,5.25,6.07,7.87,9.11h29.33c1.77,0,2.96-1.64,2.61-3.23-7.01-6.07-14.02-12.15-21.03-18.22Z"/>
        <path d="M55.03,71.84c.12-.03.3-.07.51-.12,1.32-.33,3.76-.93,5.99-1.92,2.95-1.31,5-3.05,5.84-3.82,1.21-1.1,1.45-1.58,3.58-3.65,1.16-1.12,2.15-2,2.82-2.59-3.57-2.95-7.14-5.89-10.71-8.84-2.36,2.93-4.65,5.92-7.3,8.61-2.08,2.1-4.39,3.99-7.03,5.26l6.29,7.07Z"/>
        <path d="M47.12,63.06c3.38-1.53,6.18-4.17,8.64-6.92,1.95-2.18,3.73-4.49,5.56-6.76-3.81-3.2-7.61-6.4-11.42-9.6l-9.21,15.96c2.14,2.44,4.29,4.88,6.43,7.32Z"/>
      </g>
    </svg>
  );
}
