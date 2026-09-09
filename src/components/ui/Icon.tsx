import type { ReactNode, SVGProps } from 'react'
import { cx } from '@/lib/utils'

/**
 * The single icon vocabulary for RuralCare AI.
 *
 * Hand-rolled stroke icons rather than an icon package: they inherit
 * `currentColor`, cost nothing extra to download on a 2G link, and guarantee
 * one consistent style across every screen. Emoji are never used as UI icons -
 * they render differently on every Android build and read badly to screen
 * readers.
 *
 * Icons are decorative by default (`aria-hidden`). Pass `title` only when the
 * icon is the *only* label for a control.
 */

const S = { strokeLinecap: 'round', strokeLinejoin: 'round' } as const

const PATHS = {
  /* ---- Navigation & shell -------------------------------------------- */
  home: (
    <>
      <path d="M3.5 10.7 12 3.8l8.5 6.9" {...S} />
      <path d="M5.5 9.3V19a1.5 1.5 0 0 0 1.5 1.5h3.2v-5.3h3.6v5.3H17a1.5 1.5 0 0 0 1.5-1.5V9.3" {...S} />
    </>
  ),
  menu: (
    <>
      <path d="M3.75 6.5h16.5M3.75 12h16.5M3.75 17.5h16.5" {...S} />
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.8" {...S} />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.8" {...S} />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.8" {...S} />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.8" {...S} />
    </>
  ),
  dashboard: (
    <>
      <path d="M4 19.5V11M9.5 19.5V5M15 19.5v-6M20.5 19.5V8.5" {...S} />
    </>
  ),
  chart: (
    <>
      <path d="M4 4v15.2a.8.8 0 0 0 .8.8H20" {...S} />
      <path d="M7.5 16.5v-4.2M12 16.5V7.8M16.5 16.5v-6.4" {...S} />
    </>
  ),
  trendUp: (
    <>
      <path d="M3.5 16.5 9 11l3.5 3.5L20.5 6.5" {...S} />
      <path d="M15.5 6.5h5v5" {...S} />
    </>
  ),
  trendDown: (
    <>
      <path d="M3.5 7.5 9 13l3.5-3.5 8-8" {...S} transform="translate(0 4)" />
      <path d="M15.5 17.5h5v-5" {...S} />
    </>
  ),
  map: (
    <>
      <path d="M9 4.2 3.8 6.1a1 1 0 0 0-.65.94v11.6a.8.8 0 0 0 1.1.74L9 17.6l6 2.2 5.2-1.9a1 1 0 0 0 .65-.94V5.36a.8.8 0 0 0-1.1-.74L15 6.4z" {...S} />
      <path d="M9 4.2v13.4M15 6.4v13.4" {...S} />
    </>
  ),
  pin: (
    <>
      <path d="M19 10.3c0 5.1-5.34 9.66-6.63 10.68a.6.6 0 0 1-.74 0C10.34 19.96 5 15.4 5 10.3a7 7 0 0 1 14 0z" {...S} />
      <circle cx="12" cy="10.1" r="2.6" {...S} />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8.5" {...S} />
      <path d="m14.9 9.1-1.6 4.2-4.2 1.6 1.6-4.2z" {...S} />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="6" r="2.5" {...S} />
      <circle cx="18" cy="18" r="2.5" {...S} />
      <path d="M8.5 6h4.2a3.3 3.3 0 0 1 0 6.6H9.8a2.9 2.9 0 0 0 0 5.4h5.7" {...S} />
    </>
  ),

  /* ---- Health & clinical --------------------------------------------- */
  stethoscope: (
    <>
      <path d="M5 3.5v5a3.6 3.6 0 0 0 7.2 0v-5" {...S} />
      <path d="M8.6 12.1v2.6a4.9 4.9 0 0 0 9.8 0v-1.3" {...S} />
      <circle cx="18.4" cy="10.6" r="2.1" {...S} />
      <path d="M3.6 3.5H6.4M11 3.5h1.6" {...S} />
    </>
  ),
  heartPulse: (
    <>
      <path d="M20.3 7.7a4.5 4.5 0 0 0-7.7-2.4l-.6.6-.6-.6A4.5 4.5 0 0 0 3.7 8.7c0 4.1 5 7.6 8.3 10.4 3.3-2.8 8.3-6.3 8.3-10.4a4.6 4.6 0 0 0 0-1z" {...S} />
      <path d="M6.5 11.4h2.6l1.3-2.3 1.8 4.2 1.4-2.4h3.1" {...S} />
    </>
  ),
  activity: (
    <>
      <path d="M3.5 12h3.4l2-5.4 3.4 10 2.3-6.2 1.5 1.6h4.4" {...S} />
    </>
  ),
  pill: (
    <>
      <rect x="2.6" y="8.4" width="18.8" height="7.2" rx="3.6" transform="rotate(-45 12 12)" {...S} />
      <path d="M8.75 8.75 15.25 15.25" {...S} />
    </>
  ),
  syringe: (
    <>
      <path d="m14.5 3.5 6 6M18 6l-9.4 9.4a2 2 0 0 0-.55 1.05l-.4 2.5-2.1 2.1" {...S} />
      <path d="m11.6 6.4 6 6" {...S} />
      <path d="M10.4 9.6 13 12.2M8 12l2.6 2.6" {...S} />
    </>
  ),
  flask: (
    <>
      <path d="M9 3.5h6M10 3.5v5.1a2 2 0 0 1-.3 1.05l-4.1 6.6A2 2 0 0 0 7.3 19.5h9.4a2 2 0 0 0 1.7-3.05l-4.1-6.6A2 2 0 0 1 14 8.6V3.5" {...S} />
      <path d="M6.9 14.2h10.2" {...S} />
    </>
  ),
  microscope: (
    <>
      <path d="M7.5 19.5h13M9 16.5h6" {...S} />
      <path d="M12 16.5V13a5 5 0 0 0 0-9.4" {...S} />
      <path d="M8 5.5h3.5M8 3.6h2.4v3.8H8z" {...S} />
      <path d="M4.5 19.5a6.5 6.5 0 0 1 6.5-6.5" {...S} />
    </>
  ),
  thermometer: (
    <>
      <path d="M13.5 14.6V5.2a2.2 2.2 0 1 0-4.4 0v9.4a3.6 3.6 0 1 0 4.4 0z" {...S} />
      <path d="M15.8 6.5h2.9M15.8 10h2" {...S} />
    </>
  ),
  firstAid: (
    <>
      <rect x="2.8" y="6.5" width="18.4" height="12.5" rx="2.4" {...S} />
      <path d="M8.6 6.5V5.4a1.6 1.6 0 0 1 1.6-1.6h3.6a1.6 1.6 0 0 1 1.6 1.6v1.1" {...S} />
      <path d="M12 10.2v5.1M9.5 12.75h5" {...S} />
    </>
  ),
  ambulance: (
    <>
      <path d="M2.8 15.8V8.4a1.4 1.4 0 0 1 1.4-1.4h8.9v8.8" {...S} />
      <path d="M13.1 9.7h3.6a1.6 1.6 0 0 1 1.3.68l2.6 3.7a1.6 1.6 0 0 1 .3.92v1.9" {...S} />
      <path d="M2.8 15.8h2.1M9.4 15.8h4.6M18.6 15.8h2.6" {...S} />
      <circle cx="7.15" cy="16.9" r="2.1" {...S} />
      <circle cx="16.35" cy="16.9" r="2.1" {...S} />
      <path d="M7.9 9.6v3.2M6.3 11.2h3.2" {...S} />
    </>
  ),
  hospital: (
    <>
      <path d="M4 20.5V6.6a1.6 1.6 0 0 1 1.6-1.6h12.8A1.6 1.6 0 0 1 20 6.6v13.9" {...S} />
      <path d="M2.8 20.5h18.4" {...S} />
      <path d="M12 8v5M9.5 10.5h5" {...S} />
      <path d="M9.8 20.5v-3.9h4.4v3.9" {...S} />
    </>
  ),
  clinic: (
    <>
      <path d="M3.6 20.5V9.4l5.4-3.9 5.4 3.9v11.1" {...S} />
      <path d="M14.4 20.5V12h5v8.5M2.6 20.5h18.8" {...S} />
      <path d="M9 11.2v3.2M7.4 12.8h3.2" {...S} />
    </>
  ),
  tent: (
    <>
      <path d="M12 4.8 3 19.6h18z" {...S} />
      <path d="M12 4.8v14.8M12 19.6 8.4 12M12 19.6 15.6 12" {...S} />
    </>
  ),
  kiosk: (
    <>
      <rect x="2.8" y="4" width="18.4" height="12" rx="2" {...S} />
      <path d="M8.8 20h6.4M12 16v4" {...S} />
      <path d="M12 7.5v4M10 9.5h4" {...S} />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.2 4.8 5.8v5.6c0 4.4 3 7.9 7.2 9.4 4.2-1.5 7.2-5 7.2-9.4V5.8z" {...S} />
    </>
  ),
  shieldCheck: (
    <>
      <path d="M12 3.2 4.8 5.8v5.6c0 4.4 3 7.9 7.2 9.4 4.2-1.5 7.2-5 7.2-9.4V5.8z" {...S} />
      <path d="m8.9 11.7 2.2 2.2 4-4.2" {...S} />
    </>
  ),
  record: (
    <>
      <path d="M6 3.6h8.2L19 8.4v11a1.6 1.6 0 0 1-1.6 1.6H6a1.6 1.6 0 0 1-1.6-1.6V5.2A1.6 1.6 0 0 1 6 3.6z" {...S} />
      <path d="M13.9 3.7v4.8H18.8" {...S} />
      <path d="M8.4 13h4.4M8.4 16.4h6.2" {...S} />
    </>
  ),
  clipboard: (
    <>
      <path d="M9 4.4H7.4a1.6 1.6 0 0 0-1.6 1.6v13.1a1.6 1.6 0 0 0 1.6 1.6h9.2a1.6 1.6 0 0 0 1.6-1.6V6a1.6 1.6 0 0 0-1.6-1.6H15" {...S} />
      <rect x="9" y="2.8" width="6" height="3.4" rx="1.2" {...S} />
      <path d="M8.8 11.6h6.4M8.8 15.2h4.4" {...S} />
    </>
  ),
  clipboardCheck: (
    <>
      <path d="M9 4.4H7.4a1.6 1.6 0 0 0-1.6 1.6v13.1a1.6 1.6 0 0 0 1.6 1.6h9.2a1.6 1.6 0 0 0 1.6-1.6V6a1.6 1.6 0 0 0-1.6-1.6H15" {...S} />
      <rect x="9" y="2.8" width="6" height="3.4" rx="1.2" {...S} />
      <path d="m9.2 13.6 1.9 1.9 3.7-3.9" {...S} />
    </>
  ),
  idCard: (
    <>
      <rect x="2.8" y="5" width="18.4" height="14" rx="2.2" {...S} />
      <circle cx="8.6" cy="10.6" r="2.1" {...S} />
      <path d="M5.4 16.1a3.6 3.6 0 0 1 6.4 0" {...S} />
      <path d="M14.6 9.8h4M14.6 13.2h3" {...S} />
    </>
  ),

  /* ---- People & roles ------------------------------------------------- */
  user: (
    <>
      <circle cx="12" cy="8.2" r="3.7" {...S} />
      <path d="M4.9 20.3a7.6 7.6 0 0 1 14.2 0" {...S} />
    </>
  ),
  users: (
    <>
      <circle cx="9.2" cy="8.4" r="3.3" {...S} />
      <path d="M3.4 19.8a6.1 6.1 0 0 1 11.6 0" {...S} />
      <path d="M16.4 5.6a3.3 3.3 0 0 1 0 6.2M17.6 14.4a6.1 6.1 0 0 1 3 5.4" {...S} />
    </>
  ),
  userCheck: (
    <>
      <circle cx="9.6" cy="8.2" r="3.6" {...S} />
      <path d="M3.4 19.8a6.4 6.4 0 0 1 12.1-2.9" {...S} />
      <path d="m15.6 17.6 1.9 1.9 3.5-3.7" {...S} />
    </>
  ),
  userPlus: (
    <>
      <circle cx="9.6" cy="8.2" r="3.6" {...S} />
      <path d="M3.4 19.8a6.4 6.4 0 0 1 11.4-4" {...S} />
      <path d="M18.4 14v5.4M15.7 16.7h5.4" {...S} />
    </>
  ),
  doctor: (
    <>
      <circle cx="12" cy="7.4" r="3.4" {...S} />
      <path d="M5.4 20.4v-1.2a4.4 4.4 0 0 1 4.4-4.4h4.4a4.4 4.4 0 0 1 4.4 4.4v1.2" {...S} />
      <path d="M12 16.4v3M10.6 17.9h2.8" {...S} />
    </>
  ),
  household: (
    <>
      <path d="M3.4 10.6 8.8 5.8l5.4 4.8v9.4H3.4z" {...S} />
      <path d="M14.2 20v-6.8h6.4V20M2.6 20h18.8" {...S} />
      <path d="M7.4 20v-3.4h2.8V20" {...S} />
    </>
  ),
  baby: (
    <>
      <circle cx="12" cy="12" r="8.6" {...S} />
      <path d="M9.4 10.4h.02M14.6 10.4h.02" strokeWidth="2.4" {...S} />
      <path d="M9.6 15a3.4 3.4 0 0 0 4.8 0" {...S} />
    </>
  ),

  /* ---- Time & scheduling ---------------------------------------------- */
  calendar: (
    <>
      <rect x="3.4" y="5.2" width="17.2" height="15.3" rx="2.2" {...S} />
      <path d="M3.4 10h17.2M8.4 3.5v3.4M15.6 3.5v3.4" {...S} />
    </>
  ),
  calendarCheck: (
    <>
      <rect x="3.4" y="5.2" width="17.2" height="15.3" rx="2.2" {...S} />
      <path d="M3.4 10h17.2M8.4 3.5v3.4M15.6 3.5v3.4" {...S} />
      <path d="m9.3 14.6 1.9 1.9 3.6-3.8" {...S} />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.6" {...S} />
      <path d="M12 7.4V12l3.2 2" {...S} />
    </>
  ),
  alarm: (
    <>
      <circle cx="12" cy="13.2" r="7.2" {...S} />
      <path d="M12 9.6v3.6l2.4 1.6" {...S} />
      <path d="m4.6 4.4 2.2-1.6M19.4 4.4l-2.2-1.6M5 20.6l-1.5 1.4M19 20.6l1.5 1.4" {...S} />
    </>
  ),
  history: (
    <>
      <path d="M3.6 12a8.4 8.4 0 1 0 2.6-6.1L3.4 8.6" {...S} />
      <path d="M3.4 4.2v4.4h4.4" {...S} />
      <path d="M12 8v4.2l3 1.8" {...S} />
    </>
  ),

  /* ---- Actions --------------------------------------------------------- */
  phone: (
    <>
      <path d="M6.1 3.6h2.5l1.7 4.2-2.1 1.5a11.3 11.3 0 0 0 6.5 6.5l1.5-2.1 4.2 1.7v2.5a2.1 2.1 0 0 1-2.3 2.1C11.4 19.6 4.4 12.6 4 6.1a2.1 2.1 0 0 1 2.1-2.5z" {...S} />
    </>
  ),
  video: (
    <>
      <rect x="2.6" y="6.2" width="12.6" height="11.6" rx="2.2" {...S} />
      <path d="m15.2 11 5-2.9a.6.6 0 0 1 .9.52v6.76a.6.6 0 0 1-.9.52l-5-2.9z" {...S} />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="2.8" width="6" height="10.6" rx="3" {...S} />
      <path d="M5.6 11.4v1.2a6.4 6.4 0 0 0 12.8 0v-1.2M12 19v2.2M9.2 21.2h5.6" {...S} />
    </>
  ),
  micOff: (
    <>
      <path d="M9 6.2V5.8a3 3 0 0 1 6 0v5.6" {...S} />
      <path d="M9 10.4v3a3 3 0 0 0 4.5 2.6" {...S} />
      <path d="M5.6 11.4v1.2A6.4 6.4 0 0 0 16 17.6M12 19v2.2M9.2 21.2h5.6" {...S} />
      <path d="m3.6 3.4 16.8 17.2" {...S} />
    </>
  ),
  send: (
    <>
      <path d="M20.6 3.9 3.6 10.4a.6.6 0 0 0 .04 1.13l6.5 2.3 2.3 6.5a.6.6 0 0 0 1.13.04z" {...S} />
      <path d="m10.2 13.8 6.6-6.6" {...S} />
    </>
  ),
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.6" {...S} />
      <path d="m15.6 15.6 4.6 4.6" {...S} />
    </>
  ),
  filter: (
    <>
      <path d="M3.6 5.4h16.8l-6.4 7.6v6.4l-4-2.2V13z" {...S} />
    </>
  ),
  refresh: (
    <>
      <path d="M20.2 12a8.2 8.2 0 1 1-2.5-5.9" {...S} />
      <path d="M20.4 4v4.4H16" {...S} />
    </>
  ),
  sync: (
    <>
      <path d="M4.2 10a7.9 7.9 0 0 1 13.2-3.3l2.4 2.3" {...S} />
      <path d="M19.8 14a7.9 7.9 0 0 1-13.2 3.3L4.2 15" {...S} />
      <path d="M20.2 4.4V9h-4.6M3.8 19.6V15h4.6" {...S} />
    </>
  ),
  plus: <path d="M12 4.8v14.4M4.8 12h14.4" {...S} />,
  minus: <path d="M4.8 12h14.4" {...S} />,
  check: <path d="m4.8 12.6 4.6 4.6L19.2 7.4" {...S} />,
  close: <path d="m5.6 5.6 12.8 12.8M18.4 5.6 5.6 18.4" {...S} />,
  chevronRight: <path d="m9.4 5.6 6.6 6.4-6.6 6.4" {...S} />,
  chevronLeft: <path d="m14.6 5.6-6.6 6.4 6.6 6.4" {...S} />,
  chevronDown: <path d="m5.6 9.4 6.4 6.6 6.4-6.6" {...S} />,
  chevronUp: <path d="m5.6 14.6 6.4-6.6 6.4 6.6" {...S} />,
  arrowRight: (
    <>
      <path d="M4.2 12h15.6M13.6 5.8l6.2 6.2-6.2 6.2" {...S} />
    </>
  ),
  arrowLeft: (
    <>
      <path d="M19.8 12H4.2M10.4 5.8 4.2 12l6.2 6.2" {...S} />
    </>
  ),
  externalLink: (
    <>
      <path d="M14.4 4.2h5.4v5.4M19.4 4.6 12 12" {...S} />
      <path d="M18 14v5a1.8 1.8 0 0 1-1.8 1.8H5.6A1.8 1.8 0 0 1 3.8 19V8.4a1.8 1.8 0 0 1 1.8-1.8h5" {...S} />
    </>
  ),
  edit: (
    <>
      <path d="M4.2 19.8h4l11-11a2.4 2.4 0 0 0-3.4-3.4l-11 11z" {...S} />
      <path d="m13.6 6.8 3.6 3.6" {...S} />
    </>
  ),
  download: (
    <>
      <path d="M12 3.8v11.4M7.4 11l4.6 4.6L16.6 11" {...S} />
      <path d="M4.4 19.4h15.2" {...S} />
    </>
  ),
  logout: (
    <>
      <path d="M9.4 20.2H5.8A1.8 1.8 0 0 1 4 18.4V5.6a1.8 1.8 0 0 1 1.8-1.8h3.6" {...S} />
      <path d="M15.4 8.2 19.4 12l-4 3.8M9.6 12h9.6" {...S} />
    </>
  ),
  switchUser: (
    <>
      <circle cx="8.4" cy="7.6" r="3.2" {...S} />
      <path d="M3.4 18.4a5.4 5.4 0 0 1 10 0" {...S} />
      <path d="M15.4 6.4h5.2l-2 -2M20.6 12.4h-5.2l2 2" {...S} />
    </>
  ),

  /* ---- Status & feedback ---------------------------------------------- */
  info: (
    <>
      <circle cx="12" cy="12" r="8.6" {...S} />
      <path d="M12 11v5.4M12 7.9h.02" strokeWidth="2.1" {...S} />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="8.6" {...S} />
      <path d="M9.6 9.4A2.5 2.5 0 0 1 14.5 10c0 1.7-2.5 2-2.5 3.6" {...S} />
      <path d="M12 17h.02" strokeWidth="2.1" {...S} />
    </>
  ),
  alert: (
    <>
      <path d="M10.6 4 3.2 17.4a1.6 1.6 0 0 0 1.4 2.4h14.8a1.6 1.6 0 0 0 1.4-2.4L13.4 4a1.6 1.6 0 0 0-2.8 0z" {...S} />
      <path d="M12 9.6v4M12 16.6h.02" strokeWidth="2.1" {...S} />
    </>
  ),
  alertCircle: (
    <>
      <circle cx="12" cy="12" r="8.6" {...S} />
      <path d="M12 7.6v5M12 15.8h.02" strokeWidth="2.1" {...S} />
    </>
  ),
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="8.6" {...S} />
      <path d="m8.4 12.2 2.6 2.6 4.8-5.2" {...S} />
    </>
  ),
  closeCircle: (
    <>
      <circle cx="12" cy="12" r="8.6" {...S} />
      <path d="m9.2 9.2 5.6 5.6M14.8 9.2l-5.6 5.6" {...S} />
    </>
  ),
  siren: (
    <>
      <path d="M6.4 15.4a5.6 5.6 0 0 1 11.2 0z" {...S} />
      <rect x="3.8" y="15.4" width="16.4" height="4.2" rx="1.6" {...S} />
      <path d="M12 4v2.4M5.4 6.6l1.7 1.7M18.6 6.6l-1.7 1.7M2.8 12h2.2M19 12h2.2" {...S} />
    </>
  ),
  megaphone: (
    <>
      <path d="M4 10.4v3.2a1.6 1.6 0 0 0 1.6 1.6h1.8l9.6 4V6.8l-9.6 4H5.6A1.6 1.6 0 0 0 4 12.4z" {...S} />
      <path d="M7.4 15.2v3.4a1.8 1.8 0 0 0 3.6 0v-2.1" {...S} />
      <path d="M19.6 9.4a4 4 0 0 1 0 5.2" {...S} />
    </>
  ),
  bell: (
    <>
      <path d="M18.4 15.6V10.6a6.4 6.4 0 1 0-12.8 0v5l-1.4 2.4h15.6z" {...S} />
      <path d="M9.6 18v.6a2.4 2.4 0 0 0 4.8 0V18" {...S} />
    </>
  ),
  eye: (
    <>
      <path d="M2.4 12S6 5.8 12 5.8 21.6 12 21.6 12 18 18.2 12 18.2 2.4 12 2.4 12z" {...S} />
      <circle cx="12" cy="12" r="3" {...S} />
    </>
  ),
  lock: (
    <>
      <rect x="4.8" y="10.4" width="14.4" height="9.8" rx="2.2" {...S} />
      <path d="M8.4 10.4V7.8a3.6 3.6 0 0 1 7.2 0v2.6" {...S} />
      <path d="M12 14.4v2" {...S} />
    </>
  ),
  spinner: (
    <>
      <path d="M12 3.6a8.4 8.4 0 1 0 8.4 8.4" {...S} />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3.4l1.7 4.6 4.6 1.7-4.6 1.7L12 16l-1.7-4.6L5.7 9.7l4.6-1.7z" {...S} />
      <path d="M18.4 15.4l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" {...S} />
    </>
  ),
  robot: (
    <>
      <rect x="3.6" y="7.4" width="16.8" height="12.2" rx="3" {...S} />
      <path d="M12 4v3.4M8.8 12.6h.02M15.2 12.6h.02" strokeWidth="2.3" {...S} />
      <path d="M9.6 16.2h4.8M1.8 11.6v3.6M22.2 11.6v3.6" {...S} />
    </>
  ),

  /* ---- Connectivity & data -------------------------------------------- */
  wifi: (
    <>
      <path d="M2.6 9a13.4 13.4 0 0 1 18.8 0M5.8 12.4a9 9 0 0 1 12.4 0M9 15.8a4.6 4.6 0 0 1 6 0" {...S} />
      <path d="M12 19.4h.02" strokeWidth="2.3" {...S} />
    </>
  ),
  wifiOff: (
    <>
      <path d="M2.6 9a13.4 13.4 0 0 1 6-3.5M15.6 5.7A13.3 13.3 0 0 1 21.4 9" {...S} />
      <path d="M9 15.8a4.6 4.6 0 0 1 4.9-1M18.2 12.4a9 9 0 0 0-2.6-1.8" {...S} />
      <path d="M12 19.4h.02" strokeWidth="2.3" {...S} />
      <path d="m3.4 3 17.2 18" {...S} />
    </>
  ),
  cloudOff: (
    <>
      <path d="M8.6 18.6h9a3.6 3.6 0 0 0 .7-7.1 5.4 5.4 0 0 0-8-3.9" {...S} />
      <path d="M5.4 9.6a4.4 4.4 0 0 0 1 9h1.2" {...S} />
      <path d="m3.4 3.4 17.2 17.2" {...S} />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="6.2" rx="7.8" ry="3" {...S} />
      <path d="M4.2 6.2v11.6c0 1.66 3.49 3 7.8 3s7.8-1.34 7.8-3V6.2" {...S} />
      <path d="M19.8 12c0 1.66-3.49 3-7.8 3s-7.8-1.34-7.8-3" {...S} />
    </>
  ),
  package: (
    <>
      <path d="m12 3.2 8.2 4.2v9.2L12 20.8 3.8 16.6V7.4z" {...S} />
      <path d="m3.8 7.4 8.2 4.2 8.2-4.2M12 11.6v9.2" {...S} />
    </>
  ),
  bed: (
    <>
      <path d="M3.4 19.4V7.6M3.4 12.4h17.2a1.8 1.8 0 0 1 1.8 1.8v5.2M22.4 16.4H3.4" {...S} />
      <circle cx="8" cy="9.6" r="2.2" {...S} />
      <path d="M11.4 12.4a2.4 2.4 0 0 1 2.4-2.4h4.2" {...S} />
    </>
  ),
  toolbox: (
    <>
      <rect x="2.8" y="8.4" width="18.4" height="11.2" rx="2.2" {...S} />
      <path d="M8.6 8.4V6.6a1.8 1.8 0 0 1 1.8-1.8h3.2a1.8 1.8 0 0 1 1.8 1.8v1.8" {...S} />
      <path d="M2.8 13.4h18.4M10.2 11.6h3.6v3.6h-3.6z" {...S} />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="2.9" {...S} />
      <path d="M19.6 14.5a1.5 1.5 0 0 0 .3 1.65l.1.1a1.8 1.8 0 1 1-2.55 2.55l-.1-.1a1.5 1.5 0 0 0-2.55 1.07v.28a1.8 1.8 0 1 1-3.6 0v-.15a1.5 1.5 0 0 0-2.63-1.02l-.1.1A1.8 1.8 0 1 1 5.72 16.4l.1-.1A1.5 1.5 0 0 0 4.75 13.75H4.5a1.8 1.8 0 1 1 0-3.6h.15A1.5 1.5 0 0 0 5.67 7.52l-.1-.1A1.8 1.8 0 1 1 8.12 4.87l.1.1a1.5 1.5 0 0 0 1.65.3h.07A1.5 1.5 0 0 0 10.85 3.9V3.6a1.8 1.8 0 1 1 3.6 0v.15a1.5 1.5 0 0 0 2.55 1.07l.1-.1a1.8 1.8 0 1 1 2.55 2.55l-.1.1a1.5 1.5 0 0 0-.3 1.65v.07a1.5 1.5 0 0 0 1.37.9h.28a1.8 1.8 0 1 1 0 3.6h-.15a1.5 1.5 0 0 0-1.37.9z" {...S} />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.6" {...S} />
      <path d="M3.6 12h16.8" {...S} />
      <path d="M12 3.4a13 13 0 0 1 0 17.2 13 13 0 0 1 0-17.2z" {...S} />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4.2" {...S} />
      <path d="M12 2.6v2.2M12 19.2v2.2M4.4 12H2.2M21.8 12h-2.2M6.3 6.3 4.8 4.8M19.2 19.2l-1.5-1.5M17.7 6.3l1.5-1.5M4.8 19.2l1.5-1.5" {...S} />
    </>
  ),
  droplet: (
    <>
      <path d="M12 3.2c3 3.6 5.6 6.5 5.6 9.6a5.6 5.6 0 1 1-11.2 0c0-3.1 2.6-6 5.6-9.6z" {...S} />
    </>
  ),
  leaf: (
    <>
      <path d="M4.4 19.6c0-8 5-13.2 15.2-14-1 10.6-6 15.2-13.6 15.2" {...S} />
      <path d="M4.4 19.6C8 16 11.6 13.4 16.4 11.6" {...S} />
    </>
  ),
  list: (
    <>
      <path d="M8.4 6.6h11.6M8.4 12h11.6M8.4 17.4h11.6" {...S} />
      <path d="M4.4 6.6h.02M4.4 12h.02M4.4 17.4h.02" strokeWidth="2.3" {...S} />
    </>
  ),
  book: (
    <>
      <path d="M4 5.2A1.6 1.6 0 0 1 5.6 3.6H10a2.4 2.4 0 0 1 2 1.1 2.4 2.4 0 0 1 2-1.1h4.4A1.6 1.6 0 0 1 20 5.2v11.6a1.6 1.6 0 0 1-1.6 1.6H14a2.4 2.4 0 0 0-2 1.1 2.4 2.4 0 0 0-2-1.1H5.6A1.6 1.6 0 0 1 4 16.8z" {...S} />
      <path d="M12 6.3v13.2" {...S} />
    </>
  ),
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof PATHS

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name' | 'title'> {
  name: IconName
  /** px size; 20 suits inline text, 18 chrome, 24 headers. */
  size?: number
  /** Accessible name. Omit for decorative icons (the default). */
  title?: string
  strokeWidth?: number
}

export function Icon({ name, size = 20, title, className, strokeWidth = 1.7, ...rest }: IconProps) {
  const body: ReactNode = PATHS[name]
  if (!body) return null
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
      className={cx('shrink-0', className)}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {body}
    </svg>
  )
}

/**
 * Icon inside a soft tinted square. Used for KPI cards, capability tiles and
 * list leading slots, where a bare stroke icon looks unanchored.
 */
export type IconTone = 'care' | 'info' | 'ok' | 'warn' | 'danger' | 'neutral' | 'ink'

const CHIP_TONES: Record<IconTone, string> = {
  care: 'bg-care-50 text-care-700 ring-care-100',
  info: 'bg-info-50 text-info-700 ring-info-100',
  ok: 'bg-ok-50 text-ok-700 ring-ok-100',
  warn: 'bg-warn-50 text-warn-700 ring-warn-100',
  danger: 'bg-sos-50 text-sos-700 ring-sos-100',
  neutral: 'bg-canvas text-ink-600 ring-hairline',
  ink: 'bg-ink-900 text-white ring-ink-800',
}

const CHIP_SIZES = {
  sm: 'h-8 w-8 rounded-sm',
  md: 'h-10 w-10 rounded-card',
  lg: 'h-12 w-12 rounded-lg',
}

export function IconChip({
  name,
  tone = 'care',
  size = 'md',
  className,
}: {
  name: IconName
  tone?: IconTone
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-flex items-center justify-center ring-1 ring-inset',
        CHIP_TONES[tone],
        CHIP_SIZES[size],
        className,
      )}
    >
      <Icon name={name} size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />
    </span>
  )
}

/** Inline spinner. Shares the icon vocabulary so loading never looks bolted on. */
export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <Icon name="spinner" size={size} strokeWidth={2.2} className={cx('rc-spin', className)} />
  )
}
