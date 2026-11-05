/**
 * Raw inline SVG markup, not a data: URI — `currentColor` only resolves when the
 * SVG belongs to the host document.
 */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <rect width="120" height="160" fill="#fff"/>
  <rect width="43" height="160" fill="#2b2b2e"/>
  <polygon points="0,0 30,0 0,30" fill="currentColor"/>
  <circle cx="21.5" cy="24" r="12" fill="#fff"/>
  <rect x="9.5" y="24" width="12" height="12" fill="#fff"/>
  <circle cx="21.5" cy="24" r="10" fill="#9ca3af"/>
  <rect x="43" y="12" width="77" height="22" fill="#efefef"/>
  <polygon points="104,12 120,12 120,28" fill="currentColor"/>
  <rect x="52" y="18" width="24" height="6" rx="1" fill="#1f2937"/>
  <rect x="78" y="18" width="18" height="6" rx="1" fill="currentColor"/>
  <rect x="52" y="27" width="34" height="2" rx="1" fill="#6b7280"/>
  <rect x="48" y="0" width="0.8" height="160" fill="#3a3a3a"/>
  <rect x="7" y="44" width="0.8" height="110" fill="#6b6b70"/>
  <g fill="currentColor">
    <rect x="6.4" y="46" width="2" height="6" rx="1"/><rect x="6.4" y="80" width="2" height="6" rx="1"/><rect x="6.4" y="118" width="2" height="6" rx="1"/>
    <rect x="47.4" y="44" width="2" height="6" rx="1"/><rect x="47.4" y="70" width="2" height="6" rx="1"/><rect x="47.4" y="120" width="2" height="6" rx="1"/>
    <circle cx="48.4" cy="82" r="1.4"/><circle cx="48.4" cy="98" r="1.4"/>
  </g>
  <g fill="#fff">
    <rect x="12" y="47" width="20" height="3" rx="1.5"/><rect x="12" y="81" width="22" height="3" rx="1.5"/><rect x="12" y="119" width="18" height="3" rx="1.5"/>
  </g>
  <g fill="#9ca3af">
    <rect x="12" y="57" width="24" height="2" rx="1"/><rect x="12" y="63" width="20" height="2" rx="1"/><rect x="12" y="69" width="22" height="2" rx="1"/>
    <rect x="12" y="91" width="24" height="2" rx="1"/><rect x="12" y="96" width="16" height="2" rx="1"/>
    <rect x="12" y="104" width="22" height="2" rx="1"/><rect x="12" y="109" width="14" height="2" rx="1"/>
    <rect x="12" y="129" width="18" height="2" rx="1"/><rect x="12" y="135" width="20" height="2" rx="1"/>
  </g>
  <g fill="#1f2937">
    <rect x="53" y="45" width="26" height="3" rx="1.5"/><rect x="53" y="71" width="34" height="3" rx="1.5"/><rect x="53" y="121" width="20" height="3" rx="1.5"/>
    <rect x="53" y="81" width="30" height="2" rx="1"/><rect x="53" y="97" width="26" height="2" rx="1"/>
  </g>
  <g fill="#d1d5db">
    <rect x="53" y="53" width="60" height="2" rx="1"/><rect x="53" y="58" width="58" height="2" rx="1"/><rect x="53" y="63" width="40" height="2" rx="1"/>
    <rect x="53" y="86" width="60" height="2" rx="1"/><rect x="53" y="90" width="50" height="2" rx="1"/>
    <rect x="53" y="102" width="60" height="2" rx="1"/><rect x="53" y="106" width="46" height="2" rx="1"/>
    <rect x="68" y="131" width="16" height="2" rx="1"/><rect x="101" y="131" width="16" height="2" rx="1"/>
    <rect x="68" y="137" width="16" height="2" rx="1"/><rect x="101" y="137" width="16" height="2" rx="1"/>
  </g>
  <g fill="currentColor">
    <rect x="68" y="131" width="12" height="2" rx="1"/><rect x="101" y="131" width="9" height="2" rx="1"/>
    <rect x="68" y="137" width="14" height="2" rx="1"/><rect x="101" y="137" width="11" height="2" rx="1"/>
  </g>
  <g fill="#6b7280">
    <rect x="53" y="131" width="12" height="2" rx="1"/><rect x="86" y="131" width="12" height="2" rx="1"/>
    <rect x="53" y="137" width="10" height="2" rx="1"/><rect x="86" y="137" width="13" height="2" rx="1"/>
  </g>
</svg>`

export default svg
