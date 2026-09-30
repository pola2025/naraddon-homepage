/**
 * 나라똔 인덱스(11차 확정 시안) 아이콘 모음
 *
 * @purpose 확정 시안 docs/wireframes/naraddon-index-header-footer-chat-20260930-rev11.html 의 인라인 SVG를 그대로 옮긴다
 * @note 카드 아이콘 색은 CSS 변수(--i1~--is)로 바뀌므로 PNG로 바꾸지 않는다(호버 시 색 전환)
 */

export const MonitorIcon = () => (
  <svg className="nx-icon nx-icon-monitor" viewBox="0 0 128 128" fill="none" aria-hidden="true">
    {' '}
    <defs>
      {' '}
      <linearGradient id="icA1" x1="20" y1="8" x2="104" y2="94" gradientUnits="userSpaceOnUse">
        {' '}
        <stop stopColor="var(--i3)" /> <stop offset=".52" stopColor="var(--i2)" />{' '}
        <stop offset="1" stopColor="var(--i1)" />{' '}
      </linearGradient>{' '}
      <linearGradient id="icA2" x1="26" y1="20" x2="98" y2="74" gradientUnits="userSpaceOnUse">
        {' '}
        <stop stopColor="#ffffff" /> <stop offset="1" stopColor="#e9efea" />{' '}
      </linearGradient>{' '}
      <linearGradient id="icA3" x1="44" y1="99" x2="84" y2="113" gradientUnits="userSpaceOnUse">
        {' '}
        <stop stopColor="var(--i3)" /> <stop offset="1" stopColor="var(--i1)" />{' '}
      </linearGradient>{' '}
    </defs>{' '}
    <ellipse cx="64" cy="117" rx="31" ry="4.4" fill="var(--is)" />{' '}
    <path d="M55.5 90h17l3 17h-23z" fill="var(--i1)" />{' '}
    <path d="M55.5 90h8.5v17h-11.5z" fill="var(--i2)" />{' '}
    <ellipse cx="64" cy="108" rx="24" ry="6.2" fill="var(--i1)" />{' '}
    <ellipse cx="64" cy="105.8" rx="24" ry="6.2" fill="url(#icA3)" />{' '}
    <rect x="8" y="10" width="112" height="84" rx="14" fill="url(#icA1)" />{' '}
    <rect
      x="8.7"
      y="10.7"
      width="110.6"
      height="82.6"
      rx="13.3"
      fill="none"
      stroke="var(--i3)"
      strokeOpacity=".5"
      strokeWidth="1.4"
    />{' '}
    <rect x="18" y="20" width="92" height="55" rx="5" fill="url(#icA2)" />{' '}
    <circle cx="64" cy="84.5" r="2.8" fill="var(--i1)" fillOpacity=".45" />{' '}
    <path
      d="M64 28.5 92.5 53.5h-6v16a2 2 0 0 1-2 2H71V60a2 2 0 0 0-2-2h-10a2 2 0 0 0-2 2v11.5H43.5a2 2 0 0 1-2-2v-16h-6z"
      fill="var(--i1)"
      stroke="var(--i1)"
      strokeWidth="3.4"
      strokeLinejoin="round"
    />{' '}
  </svg>
);

export const ClipboardIcon = () => (
  <svg className="nx-icon" viewBox="0 0 128 128" fill="none" aria-hidden="true">
    {' '}
    <defs>
      {' '}
      <linearGradient id="icB1" x1="22" y1="14" x2="94" y2="112" gradientUnits="userSpaceOnUse">
        {' '}
        <stop stopColor="var(--i3)" /> <stop offset=".48" stopColor="var(--i2)" />{' '}
        <stop offset="1" stopColor="var(--i1)" />{' '}
      </linearGradient>{' '}
      <linearGradient id="icB2" x1="74" y1="40" x2="96" y2="62" gradientUnits="userSpaceOnUse">
        {' '}
        <stop stopColor="var(--i3)" /> <stop offset="1" stopColor="var(--i2)" />{' '}
      </linearGradient>{' '}
    </defs>{' '}
    <ellipse cx="60" cy="118" rx="33" ry="4.4" fill="var(--is)" />{' '}
    <g transform="rotate(-4 58 64)">
      {' '}
      <rect x="18" y="16" width="74" height="97" rx="11" fill="url(#icB1)" />{' '}
      <rect
        x="18.7"
        y="16.7"
        width="72.6"
        height="95.6"
        rx="10.3"
        fill="none"
        stroke="var(--i3)"
        strokeOpacity=".5"
        strokeWidth="1.4"
      />{' '}
      <rect x="26" y="27" width="58" height="76" rx="5" fill="var(--ip)" />{' '}
      <path
        d="M44 11h22a4.5 4.5 0 0 1 4.5 4.5v8.5a3.5 3.5 0 0 1-3.5 3.5H43a3.5 3.5 0 0 1-3.5-3.5v-8.5A4.5 4.5 0 0 1 44 11z"
        fill="var(--i3)"
      />{' '}
      <circle cx="55" cy="11.5" r="5" fill="none" stroke="var(--i2)" strokeWidth="3.2" />{' '}
      <g stroke="var(--i1)" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round">
        {' '}
        <path d="M33 43.5l4.2 4.6 8.6-10" /> <path d="M33 61.5l4.2 4.6 8.6-10" />{' '}
        <path d="M33 79.5l4.2 4.6 8.6-10" /> <path d="M33 95.5l4.2 4.6 8.6-10" />{' '}
      </g>{' '}
      <g fill="var(--il)">
        {' '}
        <rect x="52" y="40" width="26" height="4.8" rx="2.4" />{' '}
        <rect x="52" y="48.6" width="17" height="4.8" rx="2.4" />{' '}
        <rect x="52" y="58" width="26" height="4.8" rx="2.4" />{' '}
        <rect x="52" y="66.6" width="17" height="4.8" rx="2.4" />{' '}
        <rect x="52" y="76" width="26" height="4.8" rx="2.4" />{' '}
        <rect x="52" y="92" width="26" height="4.8" rx="2.4" />{' '}
      </g>{' '}
    </g>{' '}
    <g transform="rotate(42 88 72)">
      {' '}
      <path d="M80 26h16.5v7H80z" fill="#fbfbfb" />{' '}
      <path d="M80 33h16.5v4.6H80z" fill="var(--im)" />{' '}
      <path d="M80 37.6h16.5v54H80z" fill="url(#icB2)" />{' '}
      <path d="M80 37.6h5.6v54H80z" fill="var(--i3)" fillOpacity=".5" />{' '}
      <path d="M80 91.6h16.5L88.25 111z" fill="#f3cba5" />{' '}
      <path d="M83.6 100.1h9.3L88.25 111z" fill="var(--i1)" />{' '}
    </g>{' '}
  </svg>
);

export const BadgeIcon = () => (
  <svg className="nx-icon nx-icon-badge" viewBox="0 0 128 128" fill="none" aria-hidden="true">
    {' '}
    <defs>
      {' '}
      <linearGradient id="icC1" x1="16" y1="40" x2="108" y2="112" gradientUnits="userSpaceOnUse">
        {' '}
        <stop stopColor="var(--i3)" /> <stop offset=".5" stopColor="var(--i2)" />{' '}
        <stop offset="1" stopColor="var(--i1)" />{' '}
      </linearGradient>{' '}
      <linearGradient id="icC2" x1="44" y1="27" x2="84" y2="43" gradientUnits="userSpaceOnUse">
        {' '}
        <stop stopColor="#ffffff" /> <stop offset=".42" stopColor="var(--im)" />{' '}
        <stop offset="1" stopColor="#98a29b" />{' '}
      </linearGradient>{' '}
    </defs>{' '}
    <ellipse cx="64" cy="118" rx="33" ry="4.4" fill="var(--is)" />{' '}
    <path d="M56 2h16v26H56z" fill="var(--i1)" /> <path d="M56 2h5.5v26H56z" fill="var(--i2)" />{' '}
    <path d="M51 21h6.5v14H51a4 4 0 0 1-4-4v-6a4 4 0 0 1 4-4z" fill="var(--i2)" />{' '}
    <path d="M70.5 21H77a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4h-6.5z" fill="var(--i2)" />{' '}
    <rect x="44" y="27" width="40" height="13.5" rx="5.5" fill="url(#icC2)" />{' '}
    <circle cx="64" cy="33.8" r="1.7" fill="#8a938c" />{' '}
    <rect x="12" y="40" width="104" height="72" rx="14" fill="url(#icC1)" />{' '}
    <rect
      x="12.7"
      y="40.7"
      width="102.6"
      height="70.6"
      rx="13.3"
      fill="none"
      stroke="var(--i3)"
      strokeOpacity=".45"
      strokeWidth="1.4"
    />{' '}
    <rect x="23" y="51" width="82" height="50" rx="6" fill="var(--ip)" />{' '}
    <circle cx="46.5" cy="66.5" r="9.2" fill="var(--i2)" />{' '}
    <path d="M31.5 93.5c0-8.3 6.7-15 15-15s15 6.7 15 15z" fill="var(--i2)" />{' '}
    <g fill="var(--il)">
      {' '}
      <rect x="69" y="59" width="26" height="5" rx="2.5" />{' '}
      <rect x="69" y="70" width="26" height="5" rx="2.5" />{' '}
      <rect x="69" y="81" width="26" height="5" rx="2.5" />{' '}
      <rect x="69" y="92" width="17" height="5" rx="2.5" />{' '}
    </g>{' '}
  </svg>
);

export const NewsIcon = () => (
  <svg className="nx-icon nx-icon-news" viewBox="0 0 128 128" fill="none" aria-hidden="true">
    {' '}
    <defs>
      {' '}
      <linearGradient id="icD1" x1="18" y1="20" x2="96" y2="104" gradientUnits="userSpaceOnUse">
        {' '}
        <stop stopColor="#ffffff" /> <stop offset=".6" stopColor="#f3f6f3" />{' '}
        <stop offset="1" stopColor="#dfe6e0" />{' '}
      </linearGradient>{' '}
      <linearGradient id="icD2" x1="88" y1="30" x2="114" y2="106" gradientUnits="userSpaceOnUse">
        {' '}
        <stop stopColor="#f0f4f0" /> <stop offset="1" stopColor="#c6cfc7" />{' '}
      </linearGradient>{' '}
      <linearGradient id="icD3" x1="20" y1="92" x2="92" y2="112" gradientUnits="userSpaceOnUse">
        {' '}
        <stop stopColor="#dbe2dc" /> <stop offset=".35" stopColor="#ffffff" />{' '}
        <stop offset="1" stopColor="#d5ddd6" />{' '}
      </linearGradient>{' '}
    </defs>{' '}
    <ellipse cx="63" cy="117" rx="35" ry="4.4" fill="var(--is)" />{' '}
    <g transform="rotate(-4 58 66)">
      {' '}
      <path
        d="M84 19.5l21 12a4 4 0 0 1 2 3.5v53.6a4 4 0 0 1-6 3.5l-17-9.8z"
        fill="url(#icD2)"
      />{' '}
      <path d="M84 19.5l21 12a4 4 0 0 1 2 3.5L84 33z" fill="#ffffff" fillOpacity=".6" />{' '}
      <path
        d="M16 26.5a3 3 0 0 1 2.6-3l68-9.2a3 3 0 0 1 3.4 3v79.4a3 3 0 0 1-2.6 3l-68 9.2a3 3 0 0 1-3.4-3z"
        fill="url(#icD1)"
      />{' '}
      <g fill="var(--i2)" transform="translate(25 41) scale(0.00935 -0.00935)">
        {' '}
        <path d="M153 1466H576L1128 655V1466H1555V0H1128L579 805V0H153Z" />{' '}
        <path
          transform="translate(1706,0)"
          d="M149 1466H1363V1153H603V920H1308V621H603V332H1385V0H149Z"
        />{' '}
        <path
          transform="translate(3185,0)"
          d="M-1 1466H429L584 647L810 1466H1239L1466 647L1621 1466H2049L1726 0H1282L1025 923L769 0H325Z"
        />{' '}
        <path
          transform="translate(5233,0)"
          d="M71 485 502 512Q516 407 559 352Q629 263 759 263Q856 263 908.5 308.5Q961 354 961 414Q961 471 911 516Q861 561 679 601Q381 668 254 779Q126 890 126 1062Q126 1175 191.5 1275.5Q257 1376 388.5 1433.5Q520 1491 749 1491Q1030 1491 1177.5 1386.5Q1325 1282 1353 1054L926 1029Q909 1128 854.5 1173Q800 1218 704 1218Q625 1218 585 1184.5Q545 1151 545 1103Q545 1068 578 1040Q610 1011 730 986Q1027 922 1155.5 856.5Q1284 791 1342.5 694Q1401 597 1401 477Q1401 336 1323 217Q1245 98 1105 36.5Q965 -25 752 -25Q378 -25 234 119Q90 263 71 485Z"
        />{' '}
      </g>{' '}
      <rect x="24.5" y="45.5" width="56" height="3.6" rx="1.8" fill="var(--i2)" />{' '}
      <rect x="24.5" y="56" width="21" height="19" rx="2.8" fill="var(--i2)" />{' '}
      <rect x="49" y="56" width="21" height="19" rx="2.8" fill="var(--i2)" />{' '}
      <g fill="var(--il)">
        {' '}
        <rect x="73.5" y="56" width="14.5" height="3.1" rx="1.55" />{' '}
        <rect x="73.5" y="63.4" width="14.5" height="3.1" rx="1.55" />{' '}
        <rect x="73.5" y="70.8" width="14.5" height="3.1" rx="1.55" />{' '}
        <rect x="24.5" y="80.5" width="63.5" height="3.1" rx="1.55" />{' '}
        <rect x="24.5" y="87.9" width="63.5" height="3.1" rx="1.55" />{' '}
        <rect x="24.5" y="95.3" width="44" height="3.1" rx="1.55" />{' '}
      </g>{' '}
      <path d="M16 96.5q37-7.4 74-9.8v6.4q-37 2.4-74 9.8z" fill="#cfd8d1" fillOpacity=".5" />{' '}
      <path
        d="M16 99.3q37-7.4 74-9.8v7.8a3 3 0 0 1-2.6 3l-68 9.2a3 3 0 0 1-3.4-3z"
        fill="url(#icD3)"
      />{' '}
    </g>{' '}
  </svg>
);

export const SearchIcon = () => (
  <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
    {' '}
    <circle cx="20" cy="20" r="13" stroke="currentColor" strokeWidth="5" />{' '}
    <path d="m30 30 12 12" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />{' '}
  </svg>
);

export const ChatIcon = () => (
  <svg viewBox="0 0 132 132" fill="none" aria-hidden="true">
    <g stroke="#fff" strokeWidth="8">
      <path
        d="M92.5 85.96 L94.7 100.6 L77.6 98.4 A33.5 32.75 0 1 1 92.5 85.96 Z"
        strokeLinejoin="round"
      />
      <path d="M50.8 72.6 A15.5 15.5 0 0 0 77.2 72.6" strokeLinecap="round" />
    </g>
  </svg>
);

export const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M7 7l10 10M17 7L7 17" />
  </svg>
);
