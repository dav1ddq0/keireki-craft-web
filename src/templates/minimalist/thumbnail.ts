/**
 * Raw inline SVG markup, not a data: URI — `currentColor` only resolves when the
 * SVG belongs to the host document.
 */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <rect width="120" height="160" fill="#fff"/>
  <rect width="120" height="160" fill="currentColor" opacity="0.14"/>
  <rect x="71" width="49" height="160" fill="currentColor" opacity="0.26"/>
  <g fill="currentColor" opacity="0.14">
    <rect x="71" y="62" width="49" height="7"/><rect x="71" y="108" width="49" height="7"/>
  </g>
  <circle cx="86" cy="22" r="11" fill="#3a3a3a"/>
  <circle cx="86" cy="19" r="4" fill="#d6d6d6"/><path d="M78 30q8 -9 16 0z" fill="#d6d6d6"/>
  <g fill="#555">
    <rect x="77" y="38" width="28" height="5" rx="1" transform="skewX(-10)" transform-origin="77 43"/>
    <rect x="77" y="45" width="36" height="5" rx="1" transform="skewX(-10)" transform-origin="77 50"/>
  </g>
  <rect x="77" y="53" width="30" height="2" rx="1" fill="#777"/>
  <g fill="#333">
    <rect x="76" y="64.5" width="18" height="2.4" rx="0.5"/><rect x="76" y="110.5" width="20" height="2.4" rx="0.5"/>
    <rect x="10" y="12" width="20" height="2.6" rx="0.5"/><rect x="10" y="38" width="20" height="2.6" rx="0.5"/>
    <rect x="10" y="66" width="28" height="2.6" rx="0.5"/><rect x="10" y="96" width="22" height="2.6" rx="0.5"/>
    <rect x="10" y="45" width="2" height="2"/><rect x="36" y="45" width="2" height="2"/>
    <rect x="10" y="56" width="2" height="2"/><rect x="36" y="56" width="2" height="2"/>
    <rect x="10" y="73" width="2" height="2"/><rect x="10" y="84" width="2" height="2"/>
    <rect x="19" y="106" width="13" height="1.6"/><rect x="47" y="106" width="13" height="1.6"/>
    <rect x="19" y="116" width="11" height="1.6"/><rect x="47" y="116" width="14" height="1.6"/>
    <rect x="19" y="126" width="12" height="1.6"/><rect x="47" y="126" width="10" height="1.6"/>
  </g>
  <g fill="#9a9a9a">
    <rect x="10" y="18" width="52" height="1.6" rx="0.8"/><rect x="10" y="22" width="50" height="1.6" rx="0.8"/>
    <rect x="10" y="26" width="52" height="1.6" rx="0.8"/><rect x="10" y="30" width="36" height="1.6" rx="0.8"/>
    <rect x="14" y="49" width="18" height="1.4" rx="0.7"/><rect x="40" y="49" width="18" height="1.4" rx="0.7"/>
    <rect x="14" y="60" width="18" height="1.4" rx="0.7"/><rect x="40" y="60" width="18" height="1.4" rx="0.7"/>
    <rect x="15" y="77" width="44" height="1.4" rx="0.7"/><rect x="15" y="80" width="40" height="1.4" rx="0.7"/>
    <rect x="15" y="88" width="44" height="1.4" rx="0.7"/><rect x="15" y="91" width="38" height="1.4" rx="0.7"/>
    <rect x="76" y="73" width="30" height="1.6" rx="0.8"/><rect x="76" y="79" width="34" height="1.6" rx="0.8"/>
    <rect x="76" y="85" width="28" height="1.6" rx="0.8"/><rect x="76" y="93" width="22" height="1.6" rx="0.8"/>
    <rect x="76" y="97" width="30" height="1.6" rx="0.8"/>
  </g>
  <g fill="#444">
    <rect x="14" y="44.5" width="16" height="2.2" rx="0.5"/><rect x="40" y="44.5" width="16" height="2.2" rx="0.5"/>
    <rect x="14" y="55.5" width="16" height="2.2" rx="0.5"/><rect x="40" y="55.5" width="16" height="2.2" rx="0.5"/>
    <rect x="15" y="72.5" width="26" height="2.2" rx="0.5"/><rect x="15" y="83.5" width="22" height="2.2" rx="0.5"/>
  </g>
  <g fill="currentColor">
    <circle cx="14" cy="107" r="4"/><circle cx="42" cy="107" r="4"/>
    <circle cx="14" cy="117" r="4"/><circle cx="42" cy="117" r="4"/>
    <circle cx="14" cy="127" r="4"/><circle cx="42" cy="127" r="4"/>
  </g>
  <g fill="#333">
    <rect x="76" y="119" width="9" height="1.6"/><rect x="88" y="119" width="20" height="1.8"/>
    <rect x="76" y="124" width="9" height="1.6"/><rect x="88" y="124" width="16" height="1.8"/>
    <rect x="76" y="129" width="9" height="1.6"/><rect x="88" y="129" width="12" height="1.8"/>
  </g>
</svg>`

export default svg
