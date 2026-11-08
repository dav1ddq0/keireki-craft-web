/**
 * Raw inline SVG markup, not a data: URI — `currentColor` only resolves when the
 * SVG belongs to the host document.
 */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <rect width="120" height="160" fill="#f3f0eb"/>
  <circle cx="114" cy="158" r="30" fill="currentColor"/>
  <g fill="none" stroke="#f3f0eb" stroke-width="1"><path d="M84 140q15 -4 36 2M86 152q15 -4 34 2M96 128q2 15 -2 32M108 126q2 16 -1 34"/></g>
  <g fill="#111">
    <rect x="11" y="11" width="99" height="38"/><rect x="11" y="55" width="43" height="38"/><rect x="11" y="99" width="43" height="23"/>
    <rect x="11" y="128" width="43" height="22"/><rect x="60" y="55" width="50" height="40"/><rect x="60" y="101" width="50" height="49"/>
  </g>
  <g fill="#f3f0eb" stroke="#111" stroke-width="0.6">
    <rect x="10" y="10" width="99" height="38"/><rect x="10" y="54" width="43" height="38"/><rect x="10" y="98" width="43" height="23"/>
    <rect x="10" y="127" width="43" height="22"/><rect x="59" y="54" width="50" height="40"/><rect x="59" y="100" width="50" height="49"/>
  </g>
  <ellipse cx="40" cy="25" rx="10" ry="12" transform="rotate(-24 40 25)" fill="currentColor"/>
  <ellipse cx="42" cy="22" rx="3.6" ry="5" transform="rotate(-24 42 22)" fill="#f3f0eb"/>
  <rect x="10.3" y="10.3" width="25" height="37.4" fill="#9ca3af"/>
  <circle cx="22.8" cy="24" r="6" fill="#6b7280"/><path d="M12 47.7q10.8 -16 21.6 0z" fill="#6b7280"/>
  <g fill="#111">
    <rect x="53" y="18" width="40" height="7" rx="1"/><rect x="53" y="27" width="50" height="7" rx="1"/>
    <rect x="15" y="59" width="22" height="4" rx="1"/><rect x="15" y="103" width="18" height="4" rx="1"/><rect x="15" y="132" width="22" height="4" rx="1"/>
    <rect x="64" y="59" width="22" height="4" rx="1"/><rect x="64" y="105" width="30" height="4" rx="1"/>
    <rect x="15" y="84" width="20" height="2" rx="1"/><rect x="15" y="88" width="26" height="2" rx="1"/>
    <rect x="31" y="110.5" width="14" height="1.2"/><rect x="31" y="115.5" width="9" height="1.2"/>
    <rect x="25" y="139.5" width="13" height="1.2"/><rect x="25" y="144.5" width="10" height="1.2"/>
  </g>
  <rect x="53" y="38" width="32" height="3" rx="1" fill="#374151"/>
  <g fill="#9ca3af">
    <rect x="15" y="67" width="34" height="2" rx="1"/><rect x="15" y="71" width="32" height="2" rx="1"/><rect x="15" y="75" width="28" height="2" rx="1"/>
    <rect x="15" y="110" width="12" height="2" rx="1"/><rect x="15" y="115" width="12" height="2" rx="1"/>
    <rect x="15" y="139" width="8" height="2" rx="1"/><rect x="15" y="144" width="8" height="2" rx="1"/>
    <rect x="31" y="111" width="18" height="0.4"/><rect x="31" y="116" width="18" height="0.4"/>
    <rect x="25" y="140" width="17" height="0.4"/><rect x="25" y="145" width="17" height="0.4"/>
  </g>
  <g fill="#1f2937">
    <rect x="64" y="67" width="17" height="2.4" rx="1"/><rect x="87" y="67" width="17" height="2.4" rx="1"/>
    <rect x="64" y="80" width="17" height="2.4" rx="1"/><rect x="87" y="80" width="17" height="2.4" rx="1"/>
    <rect x="64" y="113" width="17" height="2.4" rx="1"/><rect x="87" y="113" width="17" height="2.4" rx="1"/>
    <rect x="64" y="126" width="17" height="2.4" rx="1"/><rect x="87" y="126" width="17" height="2.4" rx="1"/>
    <rect x="64" y="139" width="17" height="2.4" rx="1"/><rect x="87" y="139" width="17" height="2.4" rx="1"/>
  </g>
  <g fill="#9ca3af">
    <rect x="64" y="71" width="15" height="1.6" rx="0.8"/><rect x="87" y="71" width="15" height="1.6" rx="0.8"/>
    <rect x="64" y="84" width="15" height="1.6" rx="0.8"/><rect x="87" y="84" width="15" height="1.6" rx="0.8"/>
    <rect x="64" y="117" width="15" height="1.6" rx="0.8"/><rect x="87" y="117" width="15" height="1.6" rx="0.8"/>
    <rect x="64" y="130" width="15" height="1.6" rx="0.8"/><rect x="87" y="130" width="15" height="1.6" rx="0.8"/>
    <rect x="64" y="143" width="15" height="1.6" rx="0.8"/><rect x="87" y="143" width="15" height="1.6" rx="0.8"/>
  </g>
</svg>`

export default svg
