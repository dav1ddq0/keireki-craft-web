/**
 * Raw inline SVG markup, not a data: URI — `currentColor` only resolves when the
 * SVG belongs to the host document.
 */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <rect width="120" height="160" fill="currentColor"/>
  <rect y="112" width="120" height="48" fill="#111"/>
  <rect x="6" y="6" width="108" height="146" fill="#fff" stroke="#111" stroke-width="0.6"/>
  <rect x="78" y="56" width="36" height="96" fill="currentColor" opacity="0.35"/>
  <rect x="6" y="42" width="108" height="14" fill="currentColor" opacity="0.18"/>
  <polyline points="36,3 34,7 37,11 34,15" fill="none" stroke="#111" stroke-width="0.8"/>
  <rect x="13" y="12" width="14" height="2.4" rx="1" fill="#6b7280"/>
  <rect x="13" y="17" width="44" height="7" rx="1" fill="#111"/>
  <rect x="13" y="28" width="26" height="5" fill="#111"/>
  <circle cx="94" cy="21" r="12" fill="#111"/>
  <circle cx="94" cy="21" r="9.5" fill="#9ca3af"/>
  <polygon points="120,13 120,29 108,21" fill="#111"/>
  <g fill="#1f2937"><rect x="56" y="37" width="14" height="2" rx="1"/><rect x="74" y="37" width="16" height="2" rx="1"/><rect x="94" y="37" width="12" height="2" rx="1"/></g>
  <line x1="12" y1="42" x2="108" y2="42" stroke="#111" stroke-width="0.5"/>
  <rect x="16" y="45" width="18" height="5" rx="1" fill="#111"/>
  <rect x="38" y="44" width="1" height="9" fill="#111"/>
  <g fill="#9ca3af"><rect x="43" y="45" width="62" height="2" rx="1"/><rect x="43" y="49" width="56" height="2" rx="1"/></g>
  <rect x="13" y="61" width="28" height="4.5" rx="1" fill="#111"/>
  <g fill="#111">
    <polygon points="13,70 16,72 13,74"/><polygon points="13,86 16,88 13,90"/><polygon points="13,102 16,104 13,106"/>
    <rect x="19" y="70" width="22" height="3" rx="1"/><rect x="58" y="70" width="14" height="3" rx="1"/>
    <rect x="19" y="86" width="20" height="3" rx="1"/><rect x="58" y="86" width="14" height="3" rx="1"/>
    <rect x="19" y="102" width="24" height="3" rx="1"/><rect x="58" y="102" width="14" height="3" rx="1"/>
    <rect x="13" y="120" width="26" height="4.5" rx="1"/>
    <polygon points="13,130 16,132 13,134"/><polygon points="45,130 48,132 45,134"/>
    <rect x="19" y="130" width="18" height="2.6" rx="1"/><rect x="51" y="130" width="18" height="2.6" rx="1"/>
  </g>
  <g fill="#d1d5db">
    <rect x="13" y="76" width="58" height="2" rx="1"/><rect x="13" y="80" width="50" height="2" rx="1"/>
    <rect x="13" y="92" width="58" height="2" rx="1"/><rect x="13" y="96" width="46" height="2" rx="1"/>
    <rect x="13" y="108" width="54" height="2" rx="1"/>
    <rect x="19" y="136" width="18" height="2" rx="1"/><rect x="51" y="136" width="18" height="2" rx="1"/>
  </g>
  <rect x="41.5" y="129" width="0.6" height="12" fill="#9ca3af"/>
  <line x1="12" y1="115" x2="74" y2="115" stroke="#111" stroke-width="0.5"/>
  <g fill="#111">
    <rect x="82" y="62" width="28" height="6"/><polygon points="94,68 98,68 96,70.5"/>
    <rect x="82" y="96" width="28" height="6"/><polygon points="94,102 98,102 96,104.5"/>
    <rect x="82" y="124" width="28" height="6"/><polygon points="94,130 98,130 96,132.5"/>
    <circle cx="84" cy="75" r="1"/><circle cx="84" cy="81" r="1"/><circle cx="84" cy="87" r="1"/>
    <circle cx="84" cy="109" r="1"/><circle cx="84" cy="115" r="1"/>
    <circle cx="84" cy="137" r="1"/><circle cx="84" cy="143" r="1"/>
    <rect x="87" y="74" width="16" height="2" rx="1"/><rect x="87" y="80" width="18" height="2" rx="1"/><rect x="87" y="86" width="14" height="2" rx="1"/>
    <rect x="87" y="108" width="17" height="2" rx="1"/><rect x="87" y="114" width="13" height="2" rx="1"/>
    <rect x="87" y="136" width="18" height="2" rx="1"/><rect x="87" y="142" width="16" height="2" rx="1"/>
  </g>
  <g fill="#fff"><rect x="89" y="64" width="14" height="2" rx="1"/><rect x="89" y="98" width="14" height="2" rx="1"/><rect x="89" y="126" width="14" height="2" rx="1"/></g>
</svg>`

export default svg
