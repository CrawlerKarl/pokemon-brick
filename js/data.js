'use strict';
// ============================================================
//  TYPES: colors, power mapping, effectiveness chart
// ============================================================
const TYPE_COLORS = {
  fire: '#ff7043', water: '#42a5f5', grass: '#66bb6a', electric: '#ffd54f',
  psychic: '#ec407a', ghost: '#7e57c2', normal: '#a1887f', fighting: '#ef5350',
  rock: '#8d6e63', dragon: '#5c6bc0', poison: '#ab47bc', flying: '#90a4ae',
  bug: '#9ccc65', ice: '#4dd0e1', fairy: '#f48fb1', dark: '#6d5f52',
  ground: '#d4a373', steel: '#b0bec5',
};
// ---- unified vector icon set: every type & power gets a drawn symbol ----
// (replaces the old emoji — consistent style, and readable for colorblind players)
function drawGlyph(c, key, x, y, r, col = '#fff', lw = null) {
  // the catch-glyph is skin identity: every data-driven 'pokeball' icon
  // (path badges, fusion icons, rewards) re-skins through this choke point
  if (key === 'pokeball' && SKIN.strings) key = SKIN.strings.dexGlyph;
  c.save();
  c.translate(x, y);
  c.strokeStyle = col; c.fillStyle = col;
  c.lineWidth = lw != null ? lw : Math.max(1.4, r * 0.22);
  c.lineCap = 'round'; c.lineJoin = 'round';
  const s = r; // glyphs are designed on a unit circle of radius r
  switch (key) {
    case 'fire': // flame
      c.beginPath();
      c.moveTo(0, -s);
      c.quadraticCurveTo(s * 0.9, -s * 0.15, s * 0.55, s * 0.45);
      c.quadraticCurveTo(s * 0.35, s * 0.95, 0, s);
      c.quadraticCurveTo(-s * 0.35, s * 0.95, -s * 0.55, s * 0.45);
      c.quadraticCurveTo(-s * 0.9, -s * 0.15, 0, -s);
      c.closePath(); c.fill();
      c.globalCompositeOperation = 'destination-out';
      c.beginPath();
      c.moveTo(0, -s * 0.15);
      c.quadraticCurveTo(s * 0.4, s * 0.3, 0, s * 0.72);
      c.quadraticCurveTo(-s * 0.4, s * 0.3, 0, -s * 0.15);
      c.closePath(); c.fill();
      break;
    case 'water': // droplet
      c.beginPath();
      c.moveTo(0, -s);
      c.quadraticCurveTo(s * 0.85, s * 0.05, s * 0.62, s * 0.5);
      c.arc(0, s * 0.35, s * 0.65, 0.25, Math.PI - 0.25, false);
      c.quadraticCurveTo(-s * 0.85, s * 0.05, 0, -s);
      c.closePath(); c.fill();
      break;
    case 'grass': // leaf with vein
      c.beginPath();
      c.moveTo(-s * 0.85, s * 0.85);
      c.quadraticCurveTo(-s * 1.05, -s * 0.55, s * 0.85, -s * 0.85);
      c.quadraticCurveTo(s * 0.6, s * 1.0, -s * 0.85, s * 0.85);
      c.closePath(); c.fill();
      c.globalCompositeOperation = 'destination-out';
      c.beginPath(); c.moveTo(-s * 0.7, s * 0.7); c.quadraticCurveTo(-s * 0.05, s * 0.05, s * 0.6, -s * 0.6); c.stroke();
      break;
    case 'electric': case 'laser': // bolt
      c.beginPath();
      c.moveTo(s * 0.25, -s); c.lineTo(-s * 0.55, s * 0.15); c.lineTo(-s * 0.05, s * 0.15);
      c.lineTo(-s * 0.25, s); c.lineTo(s * 0.55, -s * 0.15); c.lineTo(s * 0.05, -s * 0.15);
      c.closePath(); c.fill();
      break;
    case 'psychic': // eye
      c.beginPath();
      c.moveTo(-s, 0); c.quadraticCurveTo(0, -s * 0.95, s, 0); c.quadraticCurveTo(0, s * 0.95, -s, 0);
      c.closePath(); c.stroke();
      c.beginPath(); c.arc(0, 0, s * 0.32, 0, Math.PI * 2); c.fill();
      break;
    case 'ghost': // wavy-bottomed spirit
      c.beginPath();
      c.arc(0, -s * 0.15, s * 0.72, Math.PI, 0, false);
      c.lineTo(s * 0.72, s * 0.55);
      c.lineTo(s * 0.36, s * 0.25); c.lineTo(0, s * 0.62); c.lineTo(-s * 0.36, s * 0.25); c.lineTo(-s * 0.72, s * 0.55);
      c.closePath(); c.fill();
      c.globalCompositeOperation = 'destination-out';
      c.beginPath(); c.arc(-s * 0.26, -s * 0.2, s * 0.13, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(s * 0.26, -s * 0.2, s * 0.13, 0, Math.PI * 2); c.fill();
      break;
    case 'normal': // plain ring
      c.beginPath(); c.arc(0, 0, s * 0.68, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(0, 0, s * 0.2, 0, Math.PI * 2); c.fill();
      break;
    case 'fighting': // impact cross
      c.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + Math.PI / 4;
        c.moveTo(Math.cos(a) * s * 0.25, Math.sin(a) * s * 0.25);
        c.lineTo(Math.cos(a) * s * 0.95, Math.sin(a) * s * 0.95);
      }
      c.stroke();
      c.beginPath(); c.arc(0, 0, s * 0.28, 0, Math.PI * 2); c.fill();
      break;
    case 'rock': // boulder hexagon
      c.beginPath();
      c.moveTo(-s * 0.85, s * 0.35); c.lineTo(-s * 0.5, -s * 0.7); c.lineTo(s * 0.3, -s * 0.8);
      c.lineTo(s * 0.85, -s * 0.05); c.lineTo(s * 0.55, s * 0.75); c.lineTo(-s * 0.4, s * 0.8);
      c.closePath(); c.fill();
      break;
    case 'dragon': // slit-pupil diamond
      c.beginPath();
      c.moveTo(0, -s); c.lineTo(s * 0.85, 0); c.lineTo(0, s); c.lineTo(-s * 0.85, 0);
      c.closePath(); c.stroke();
      c.beginPath(); c.ellipse(0, 0, s * 0.16, s * 0.5, 0, 0, Math.PI * 2); c.fill();
      break;
    case 'poison': // bubbles
      c.beginPath(); c.arc(-s * 0.35, s * 0.3, s * 0.5, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(s * 0.45, s * 0.05, s * 0.34, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(s * 0.05, -s * 0.6, s * 0.26, 0, Math.PI * 2); c.fill();
      break;
    case 'flying': // wing
      c.beginPath();
      c.moveTo(s * 0.9, -s * 0.65);
      c.quadraticCurveTo(-s * 0.3, -s * 0.85, -s * 0.85, s * 0.15);
      c.quadraticCurveTo(-s * 0.1, s * 0.05, s * 0.9, -s * 0.65);
      c.closePath(); c.fill();
      c.beginPath();
      c.moveTo(s * 0.6, s * 0.05);
      c.quadraticCurveTo(-s * 0.15, -s * 0.05, -s * 0.55, s * 0.75);
      c.quadraticCurveTo(0, s * 0.6, s * 0.6, s * 0.05);
      c.closePath(); c.fill();
      break;
    case 'bug': // beetle dot + antennae
      c.beginPath(); c.ellipse(0, s * 0.25, s * 0.5, s * 0.62, 0, 0, Math.PI * 2); c.fill();
      c.beginPath();
      c.moveTo(-s * 0.2, -s * 0.3); c.quadraticCurveTo(-s * 0.55, -s * 0.75, -s * 0.75, -s * 0.95);
      c.moveTo(s * 0.2, -s * 0.3); c.quadraticCurveTo(s * 0.55, -s * 0.75, s * 0.75, -s * 0.95);
      c.stroke();
      break;
    case 'ice': case 'slow': // snowflake
      c.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = i * Math.PI / 3;
        c.moveTo(Math.cos(a) * s * 0.9, Math.sin(a) * s * 0.9);
        c.lineTo(-Math.cos(a) * s * 0.9, -Math.sin(a) * s * 0.9);
      }
      c.stroke();
      c.beginPath(); c.arc(0, 0, s * 0.2, 0, Math.PI * 2); c.fill();
      break;
    case 'fairy': // four-point sparkle
      c.beginPath();
      c.moveTo(0, -s); c.quadraticCurveTo(s * 0.12, -s * 0.12, s, 0);
      c.quadraticCurveTo(s * 0.12, s * 0.12, 0, s);
      c.quadraticCurveTo(-s * 0.12, s * 0.12, -s, 0);
      c.quadraticCurveTo(-s * 0.12, -s * 0.12, 0, -s);
      c.closePath(); c.fill();
      break;
    case 'dark': // crescent moon
      c.beginPath(); c.arc(0, 0, s * 0.8, 0, Math.PI * 2); c.fill();
      c.globalCompositeOperation = 'destination-out';
      c.beginPath(); c.arc(s * 0.45, -s * 0.25, s * 0.68, 0, Math.PI * 2); c.fill();
      break;
    case 'ground': // strata
      c.beginPath();
      c.moveTo(-s * 0.9, s * 0.7); c.lineTo(-s * 0.35, -s * 0.25); c.lineTo(s * 0.05, s * 0.15);
      c.lineTo(s * 0.45, -s * 0.65); c.lineTo(s * 0.9, s * 0.7);
      c.closePath(); c.fill();
      break;
    case 'steel': // hex nut
      c.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3 - Math.PI / 2;
        c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * s * 0.85, Math.sin(a) * s * 0.85);
      }
      c.closePath(); c.stroke();
      c.beginPath(); c.arc(0, 0, s * 0.3, 0, Math.PI * 2); c.fill();
      break;
    // ---- power-ups / misc ----
    case 'multi': // three balls
      c.beginPath(); c.arc(-s * 0.42, s * 0.35, s * 0.36, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(s * 0.42, s * 0.35, s * 0.36, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(0, -s * 0.42, s * 0.36, 0, Math.PI * 2); c.fill();
      break;
    case 'wide': // outward arrows
      c.beginPath();
      c.moveTo(-s * 0.15, 0); c.lineTo(-s * 0.95, 0);
      c.moveTo(-s * 0.6, -s * 0.35); c.lineTo(-s * 0.95, 0); c.lineTo(-s * 0.6, s * 0.35);
      c.moveTo(s * 0.15, 0); c.lineTo(s * 0.95, 0);
      c.moveTo(s * 0.6, -s * 0.35); c.lineTo(s * 0.95, 0); c.lineTo(s * 0.6, s * 0.35);
      c.stroke();
      break;
    case 'shield': // shield
      c.beginPath();
      c.moveTo(0, -s * 0.9);
      c.quadraticCurveTo(s * 0.75, -s * 0.65, s * 0.75, -s * 0.2);
      c.quadraticCurveTo(s * 0.75, s * 0.5, 0, s * 0.95);
      c.quadraticCurveTo(-s * 0.75, s * 0.5, -s * 0.75, -s * 0.2);
      c.quadraticCurveTo(-s * 0.75, -s * 0.65, 0, -s * 0.9);
      c.closePath(); c.fill();
      break;
    case 'magnet': // horseshoe
      c.beginPath(); c.arc(0, -s * 0.1, s * 0.62, Math.PI, 0, false); c.stroke();
      c.beginPath();
      c.moveTo(-s * 0.62, -s * 0.1); c.lineTo(-s * 0.62, s * 0.6);
      c.moveTo(s * 0.62, -s * 0.1); c.lineTo(s * 0.62, s * 0.6);
      c.stroke();
      c.lineWidth = c.lineWidth * 1.7;
      c.beginPath();
      c.moveTo(-s * 0.62, s * 0.62); c.lineTo(-s * 0.62, s * 0.85);
      c.moveTo(s * 0.62, s * 0.62); c.lineTo(s * 0.62, s * 0.85);
      c.stroke();
      break;
    case 'star': { // five-point star
      c.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
        const a2 = a + Math.PI / 5;
        c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * s, Math.sin(a) * s);
        c.lineTo(Math.cos(a2) * s * 0.42, Math.sin(a2) * s * 0.42);
      }
      c.closePath(); c.fill();
      break;
    }
    case 'draco': // rocket
      c.beginPath();
      c.moveTo(0, -s); c.quadraticCurveTo(s * 0.5, -s * 0.3, s * 0.32, s * 0.4);
      c.lineTo(s * 0.6, s * 0.85) ; c.lineTo(s * 0.18, s * 0.55); c.lineTo(-s * 0.18, s * 0.55); c.lineTo(-s * 0.6, s * 0.85);
      c.lineTo(-s * 0.32, s * 0.4); c.quadraticCurveTo(-s * 0.5, -s * 0.3, 0, -s);
      c.closePath(); c.fill();
      break;
    case 'pokeball':
      c.beginPath(); c.arc(0, 0, s * 0.85, Math.PI, 0, false); c.fill();
      c.beginPath(); c.arc(0, 0, s * 0.85, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.moveTo(-s * 0.85, 0); c.lineTo(s * 0.85, 0); c.stroke();
      c.beginPath(); c.arc(0, 0, s * 0.26, 0, Math.PI * 2); c.stroke();
      break;
    case 'sigil': // AETHERFALL binding sigil — hex ring around a rune eye
      c.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3 - Math.PI / 2;
        c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * s * 0.85, Math.sin(a) * s * 0.85);
      }
      c.closePath(); c.stroke();
      c.beginPath(); c.moveTo(0, -s * 0.85); c.lineTo(0, -s * 0.45);
      c.moveTo(0, s * 0.85); c.lineTo(0, s * 0.45); c.stroke();
      c.beginPath(); c.arc(0, 0, s * 0.26, 0, Math.PI * 2); c.fill();
      break;
    case 'mega': // eight-point burst
      c.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        const a2 = a + Math.PI / 8;
        c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * s, Math.sin(a) * s);
        c.lineTo(Math.cos(a2) * s * 0.45, Math.sin(a2) * s * 0.45);
      }
      c.closePath(); c.fill();
      break;
    case 'wind': // gust curves
      c.beginPath();
      c.moveTo(-s * 0.9, -s * 0.4); c.quadraticCurveTo(s * 0.3, -s * 0.75, s * 0.6, -s * 0.35);
      c.moveTo(-s * 0.9, s * 0.05); c.quadraticCurveTo(s * 0.5, -s * 0.25, s * 0.9, s * 0.1);
      c.moveTo(-s * 0.9, s * 0.5); c.quadraticCurveTo(s * 0.2, s * 0.25, s * 0.5, s * 0.6);
      c.stroke();
      break;
    case 'target': // crosshair
      c.beginPath(); c.arc(0, 0, s * 0.6, 0, Math.PI * 2); c.stroke();
      c.beginPath();
      c.moveTo(0, -s); c.lineTo(0, -s * 0.35);
      c.moveTo(0, s); c.lineTo(0, s * 0.35);
      c.moveTo(-s, 0); c.lineTo(-s * 0.35, 0);
      c.moveTo(s, 0); c.lineTo(s * 0.35, 0);
      c.stroke();
      c.beginPath(); c.arc(0, 0, s * 0.12, 0, Math.PI * 2); c.fill();
      break;
    case 'swift': // double chevron
      c.beginPath();
      c.moveTo(-s * 0.7, -s * 0.6); c.lineTo(-s * 0.05, 0); c.lineTo(-s * 0.7, s * 0.6);
      c.moveTo(s * 0.05, -s * 0.6); c.lineTo(s * 0.7, 0); c.lineTo(s * 0.05, s * 0.6);
      c.stroke();
      break;
    case 'warp': // double chevron pointing UP — straight to the high ground
      c.beginPath();
      c.moveTo(-s * 0.6, -s * 0.05); c.lineTo(0, -s * 0.65); c.lineTo(s * 0.6, -s * 0.05);
      c.moveTo(-s * 0.6, s * 0.65); c.lineTo(0, s * 0.05); c.lineTo(s * 0.6, s * 0.65);
      c.stroke();
      break;
    case 'coin': // coin
      c.beginPath(); c.arc(0, 0, s * 0.8, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(0, 0, s * 0.5, 0, Math.PI * 2); c.stroke();
      break;
    case 'heart':
      c.beginPath();
      c.moveTo(0, s * 0.75);
      c.quadraticCurveTo(-s * 1.05, s * 0.05, -s * 0.55, -s * 0.55);
      c.quadraticCurveTo(-s * 0.1, -s * 0.9, 0, -s * 0.3);
      c.quadraticCurveTo(s * 0.1, -s * 0.9, s * 0.55, -s * 0.55);
      c.quadraticCurveTo(s * 1.05, s * 0.05, 0, s * 0.75);
      c.closePath(); c.fill();
      break;
    case 'pause':
      c.beginPath();
      c.rect(-s * 0.5, -s * 0.7, s * 0.32, s * 1.4);
      c.rect(s * 0.18, -s * 0.7, s * 0.32, s * 1.4);
      c.fill();
      break;
    case 'sound': // speaker
      c.beginPath();
      c.moveTo(-s * 0.8, -s * 0.3); c.lineTo(-s * 0.3, -s * 0.3); c.lineTo(s * 0.1, -s * 0.7);
      c.lineTo(s * 0.1, s * 0.7); c.lineTo(-s * 0.3, s * 0.3); c.lineTo(-s * 0.8, s * 0.3);
      c.closePath(); c.fill();
      c.beginPath(); c.arc(s * 0.15, 0, s * 0.5, -0.9, 0.9); c.stroke();
      break;
    case 'alert': // exclamation
      c.beginPath();
      c.moveTo(0, -s * 0.85); c.lineTo(0, s * 0.25); c.stroke();
      c.beginPath(); c.arc(0, s * 0.72, s * 0.14, 0, Math.PI * 2); c.fill();
      break;
    default:
      c.beginPath(); c.arc(0, 0, s * 0.6, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}
const POWERS = {
  fire:   { key: 'fire',   icon: 'fire',   name: 'FIREBALL',       desc: 'BALLS BURN THROUGH BLOCKS',  color: '#ff7043' },
  laser:  { key: 'laser',  icon: 'laser',  name: 'LASERS',          desc: 'PADDLE AUTO-FIRES LASERS',   color: '#ffd54f',
    sname: 'SUPPORT LASERS', sdesc: 'AUTO-FIRING SIDE CANNONS' },
  multi:  { key: 'multi',  icon: 'multi',  name: 'MULTIBALL',      desc: 'EVERY BALL SPLITS IN THREE', color: '#ab47bc' },
  // shooter modes have no paddle — `wide` widens the item-collection reach.
  wide:   { key: 'wide',   icon: 'wide',   name: 'WIDE PADDLE',    desc: 'PADDLE GROWS LARGER',        color: '#42a5f5',
    sname: 'WIDE CATCH', sdesc: 'ITEM COLLECTION REACH GROWS' },
  slow:   { key: 'slow',   icon: 'slow',   name: 'SLOW-MO',        desc: 'EVERYTHING SLOWS DOWN',      color: '#4dd0e1' },
  shield: { key: 'shield', icon: 'shield', name: 'SHIELD',         desc: 'BARRIER PROTECTS THE FLOOR', color: '#66bb6a' },
  magnet: { key: 'magnet', icon: 'magnet', name: 'MAGNET',         desc: 'BALLS STICK — FIRE TO AIM',  color: '#ec407a' },
  star:   { key: 'star',   icon: 'star',   name: 'SCORE x2',       desc: 'POINTS ARE DOUBLED',         color: '#ffee58' },
  draco:  { key: 'draco',  icon: 'draco',  name: 'DRACO MISSILES', desc: 'HOMING MISSILES LAUNCH',     color: '#5c6bc0' },
  warp:   { key: 'warp',   icon: 'warp',   name: 'SKY WARP',       desc: 'BALLS PHASE UP TO THE HIGH GROUND', color: '#80d8ff' },
  heal:   { key: 'heal',   icon: 'heart',  name: 'MAX POTION',     desc: 'RESTORES 1 HP',              color: '#ff6f91' },
};
// Kanto's three guaranteed secret pickups are intentionally outside POWERS:
// random drop tables can never hand out (or replace) a Rift Shard.
const RIFT_SHARD = {
  key: 'riftShard', icon: 'fairy', name: 'RIFT SHARD',
  desc: 'ONE OF THREE PIECES THAT REWRITES THE FINAL ROUND', color: '#d780ff',
};
// ---- starter partner lines, ENGINE half. starterLine is the shared
// constructor every skin's roster builds with; STARTER_KIT carries the
// balance numbers + numeric tier/mode copy for the 18 type keys. Identity
// (ids, names, abilities, blurbs — e.g. Pikachu's intentionally OP line)
// is skin data: the pokemon wrapper lives in pokeworld.js, the aetherfall
// class builder in aetherfall.js. Numbers here, lore there.
function starterLine(ids, names, ability, blurb, tiers, mods = {}, modeCopy = null) {
  const shared = { ability, blurb, tiers };
  return { ids, names, ability, blurb, tiers, mods,
    modeCopy: modeCopy || { classic: shared, blaster: shared, junkie: shared } };
}
// per type key: { tiers, mods, modeTiers: { classic, blaster, junkie } } —
// modeTiers[mode] is that mode's tier copy (defaults to the shared tiers).
function starterKit(tiers, mods = {}, modeTiers = null) {
  return { tiers, mods, modeTiers: modeTiers || { classic: tiers, blaster: tiers, junkie: tiers } };
}
const STARTER_KIT = {
  normal: starterKit(['+8% DAMAGE · +5% SCORE', '+15% DAMAGE · +10% SCORE', '+25% DAMAGE · +20% SCORE'],
    { damage: [1.08, 1.15, 1.25], score: [1.05, 1.1, 1.2] }),
  fire: starterKit(['RETURNS IGNITE 1 HIT · +5% DAMAGE', 'IGNITES 2 HITS · +10% DAMAGE', 'IGNITES 3 HITS · +15% DAMAGE'],
    { damage: [1.05, 1.1, 1.15] }, {
      classic: [
        'PADDLE RETURNS IGNITE THE NEXT HIT · +5% DAMAGE',
        'PADDLE RETURNS IGNITE THE NEXT 2 HITS · +10% DAMAGE',
        'PADDLE RETURNS IGNITE THE NEXT 3 HITS · +15% DAMAGE',
      ],
      blaster: ['+5% ALL DAMAGE', '+10% ALL DAMAGE', '+15% ALL DAMAGE'],
      junkie: ['+5% ALL DAMAGE', '+10% ALL DAMAGE', '+15% ALL DAMAGE'],
    }),
  water: starterKit([
      '20% COOLER · SHIELD EVERY 5 RETURNS',
      '24% COOLER · SHIELD EVERY 4 RETURNS',
      '28% COOLER · SHIELD EVERY 3 RETURNS',
    ],
    { heat: [0.8, 0.76, 0.72] }, {
      classic: [
        'SHOTS BUILD 20% LESS HEAT · SHIELD EVERY 5 RETURNS',
        'SHOTS BUILD 24% LESS HEAT · SHIELD EVERY 4 RETURNS',
        'SHOTS BUILD 28% LESS HEAT · SHIELD EVERY 3 RETURNS',
      ],
      blaster: [
        'SHOTS BUILD 20% LESS HEAT · WATER-TYPE DEFENSE',
        'SHOTS BUILD 24% LESS HEAT · WATER-TYPE DEFENSE',
        'SHOTS BUILD 28% LESS HEAT · WATER-TYPE DEFENSE',
      ],
      junkie: [
        'WATER OFFENSE/DEFENSE · SHOTS BUILD 20% LESS HEAT',
        'WATER OFFENSE/DEFENSE · SHOTS BUILD 24% LESS HEAT',
        'WATER OFFENSE/DEFENSE · SHOTS BUILD 28% LESS HEAT',
      ],
    }),
  electric: starterKit([
      '+50% DAMAGE · 35% MEGA · CHAIN EVERY 6 HITS',
      '+80% DAMAGE · 55% MEGA · CHAIN 2',
      '+120% DAMAGE · 75% MEGA · CHAIN 3',
    ],
    { damage: [1.5, 1.8, 2.2], megaStart: [0.35, 0.55, 0.75], megaPassive: [0.012, 0.02, 0.03], fireRate: [0.82, 0.7, 0.58], chainEvery: [6, 5, 4], chainTargets: [1, 2, 3] }),
  grass: starterKit(['+20% DROPS · EXPANDED CATCH', '+35% DROPS · WIDER CATCH', '+50% DROPS · WIDEST CATCH'],
    { drop: [1.2, 1.35, 1.5], catchReach: [16, 22, 28] }),
  ice: starterKit(['EVERY 10 KOS SLOWS TIME 3s', 'EVERY 8 KOS SLOWS TIME 4s', 'EVERY 6 KOS SLOWS TIME 5s'],
    { chillEvery: [10, 8, 6], chillDur: [3, 4, 5] }),
  fighting: starterKit(['+16% DAMAGE PER MISSING HP', '+24% PER MISSING HP · +20% VS BOSSES', '+34% PER MISSING HP · +30% VS BOSSES'],
    { guts: [0.16, 0.24, 0.34], bossDamage: [1, 1.2, 1.3] }),
  poison: starterKit(['REPEATED HITS STACK +12% DAMAGE', 'STACKS +20% DAMAGE', 'STACKS +30% DAMAGE'],
    { corrosion: [0.12, 0.2, 0.3] }),
  ground: starterKit(['+25% VS ARMOR/BOSSES · QUAKE EVERY 10 HITS', '+40% · QUAKE EVERY 8', '+60% · QUAKE EVERY 6'],
    { armorDamage: [1.25, 1.4, 1.6], quakeEvery: [10, 8, 6] }),
  flying: starterKit(['+12% WIDTH · +20% FOLLOW', '+20% WIDTH · +35% FOLLOW', '+30% WIDTH · +50% FOLLOW'],
    { paddle: [1.12, 1.2, 1.3], follow: [1.2, 1.35, 1.5], fireRate: [0.95, 0.9, 0.82] }),
  psychic: starterKit(['EVERY 8TH HIT DEALS 1.75×', 'EVERY 6TH HIT DEALS 2×', 'EVERY 5TH HIT DEALS 2.25×'],
    { critEvery: [8, 6, 5], critMul: [1.75, 2, 2.25] }),
  bug: starterKit(['EVERY 9 KOS HITS 1 EXTRA TARGET', 'EVERY 7 KOS HITS 2', 'EVERY 5 KOS HITS 3'],
    { swarmEvery: [9, 7, 5], swarmTargets: [1, 2, 3] }),
  rock: starterKit(['START WITH +1 HP', 'START WITH +2 HP', 'START WITH +3 HP'],
    { bonusHp: [1, 2, 3] }),
  ghost: starterKit(['15% DODGE CHANCE', '22% DODGE CHANCE', '30% DODGE CHANCE'],
    { dodge: [0.15, 0.22, 0.3] }),
  dragon: starterKit(['START 20% MEGA · +1s DURATION', 'START 35% · +2s', 'START 50% · +3s'],
    { megaStart: [0.2, 0.35, 0.5], megaPassive: [0.008, 0.012, 0.018], megaDur: [1, 2, 3] }),
  dark: starterKit(['COMBOS ADD +1.5% DAMAGE EACH', '+2.5% DAMAGE EACH', '+4% DAMAGE EACH'],
    { comboDamage: [0.015, 0.025, 0.04], comboScore: [0.01, 0.015, 0.025] }),
  steel: starterKit(['START WITH 1 SHIELD', 'START WITH 2 SHIELDS', 'START WITH 3 SHIELDS'],
    { shieldStart: [1, 2, 3] }),
  fairy: starterKit(['POTION PITY 7 · +20% CATCHES', 'PITY 5 · +35% CATCHES', 'PITY 4 · +55% CATCHES'],
    { healPity: [7, 5, 4], healChance: [1.25, 1.5, 1.8], catch: [1.2, 1.35, 1.55] }),
};

// Returns copy that describes what the starter actually does in the selected
// mode. `tier` is one-based (1–3); invalid modes fall back to classic.
function starterModeCopy(starter, mode = 'classic', tier = 1) {
  const mon = SKIN.starterMon[starter];
  if (!mon) return null;
  const copy = mon.modeCopy[mode] || mon.modeCopy.classic;
  const tierIndex = Math.max(0, Math.min(copy.tiers.length - 1, Math.floor(Number(tier) || 1) - 1));
  return {
    ability: copy.ability,
    blurb: copy.blurb,
    tiers: copy.tiers,
    tier: copy.tiers[tierIndex],
  };
}
// partner ability level: grows with total regions cleared (evolves at 4 & 7)
function starterStage(level, starter = SETTINGS.starter) {
  const regionsIn = Math.floor((level - 1) / STAGES);
  if (starter === 'electric') return regionsIn >= 6 ? 3 : regionsIn >= 4 ? 2 : 1;
  return regionsIn >= 6 ? 3 : regionsIn >= 3 ? 2 : 1;
}
function starterMod(key, fallback = 0) {
  const mon = SKIN.starterMon[G.starter];
  const value = mon && mon.mods && mon.mods[key];
  if (value == null) return fallback;
  return Array.isArray(value) ? (value[Math.max(0, Math.min(value.length - 1, G.starterLvl - 1))] ?? fallback) : value;
}
function starterPerk() { return SKIN.starterMon[G.starter]?.ability || null; }

// ---- species-aware motion: each skin lists per-species gait overrides in
// its own motionById table (pokeworld.js / aetherfall.js); the engine only
// keeps the type-derived fallback families below.
// gait families by TYPE — the fallback when no species override exists
const GAIT_FLAP_T = new Set(['flying', 'dragon', 'bug']);
const GAIT_SWIM_T = new Set(['water', 'ice']);
const GAIT_HOVER_T = new Set(['ghost', 'psychic', 'fairy', 'poison']);
function motionProfile(poke) {
  const o = SKIN.motionById[poke.id];
  if (o) return o;
  if (GAIT_FLAP_T.has(poke.t)) return 'winged';
  if (GAIT_SWIM_T.has(poke.t)) return 'swim';
  if (GAIT_HOVER_T.has(poke.t)) return 'hover';
  return 'biped';
}

const POWER_BY_TYPE = {
  fire: 'fire',
  electric: 'laser',
  ghost: 'multi', dark: 'multi', poison: 'multi',
  water: 'slow', ice: 'slow',
  grass: 'shield', bug: 'shield',
  psychic: 'magnet', fairy: 'magnet',
  rock: 'wide', ground: 'wide', fighting: 'wide', steel: 'wide',
  normal: 'star',
  flying: 'warp', // bird ranks carry you to the high ground
  dragon: 'draco',
};
// attacking element → types it is super-effective against
const EFFECTIVE = {
  fire: ['grass', 'bug', 'ice', 'steel'],
  water: ['fire', 'rock', 'ground'],
  grass: ['water', 'rock', 'ground'],
  electric: ['water', 'flying'],
  ice: ['grass', 'ground', 'flying', 'dragon'],
  fighting: ['normal', 'rock', 'ice', 'dark', 'steel'],
  poison: ['grass', 'fairy'],
  ground: ['fire', 'electric', 'poison', 'rock', 'steel'],
  flying: ['grass', 'fighting', 'bug'],
  psychic: ['fighting', 'poison'],
  bug: ['grass', 'psychic', 'dark'],
  rock: ['fire', 'ice', 'flying', 'bug'],
  ghost: ['psychic', 'ghost'],
  dragon: ['dragon'],
  dark: ['psychic', 'ghost'],
  steel: ['ice', 'rock', 'fairy'],
  fairy: ['fighting', 'dragon', 'dark'],
  normal: [],
};
// attacking element → types that RESIST it (half damage)
const RESIST = {
  fire: ['fire', 'water', 'rock', 'dragon'],
  water: ['water', 'grass', 'dragon'],
  grass: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel'],
  electric: ['electric', 'grass', 'dragon', 'ground'],
  ice: ['fire', 'water', 'ice', 'steel'],
  fighting: ['poison', 'flying', 'psychic', 'bug', 'fairy', 'ghost'],
  poison: ['poison', 'ground', 'rock', 'ghost', 'steel'],
  ground: ['grass', 'bug', 'flying'],
  flying: ['electric', 'rock', 'steel'],
  psychic: ['psychic', 'steel', 'dark'],
  bug: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel', 'fairy'],
  rock: ['fighting', 'ground', 'steel'],
  ghost: ['dark', 'normal'],
  dragon: ['steel', 'fairy'],
  dark: ['fighting', 'dark', 'fairy'],
  steel: ['fire', 'water', 'electric', 'steel'],
  fairy: ['fire', 'poison', 'steel'],
  normal: ['rock', 'steel', 'ghost'],
};

// ============================================================
//  WAVE MODIFIERS (announced twists, one-line multipliers)
// ============================================================
const MODIFIERS = [
  { key: 'winds',  icon: 'wind',   name: 'GUSTY WINDS', desc: 'THE BALL CURVES IN THE WIND', color: '#90a4ae' },
  { key: 'ambush', icon: 'target', name: 'AMBUSH',      desc: 'ENEMY FIRE IS DOUBLED',       color: '#ff5252' },
  { key: 'swift',  icon: 'swift',  name: 'SWIFT WAVE',  desc: 'FASTER DESCENT, MORE DROPS',  color: '#4dd0e1' },
  { key: 'bounty', icon: 'coin',   name: 'BOUNTY',      desc: 'DOUBLE POINTS, BOLDER FOES',  color: '#ffd54f' },
];

// Classic BREAKER regions introduce one readable brick rule at a time. These
// are still ordinary ball-breakable bricks: the icon and short intro explain
// the twist, while the region mapping makes learning predictable.
const BRICK_BEHAVIORS = {
  treasure: { icon: 'coin', color: '#ffd54f', name: 'TREASURE BRICKS', desc: 'BREAK THEM FOR A GUARANTEED ITEM' },
  bomb:     { icon: 'fire', color: '#ff7043', name: 'BOMB BRICKS', desc: 'BREAK THEM TO DAMAGE NEARBY BRICKS' },
  shift:    { icon: 'swift', color: '#80d8ff', name: 'SLIDER BRICKS', desc: 'THE MARKED ROWS GLIDE SIDE TO SIDE' },
  link:     { icon: 'laser', color: '#ce93d8', name: 'LINKED BRICKS', desc: 'DAMAGE ONE LINK TO DAMAGE ITS PARTNER' },
  split:    { icon: 'multi', color: '#90caf9', name: 'SPLITTER BRICKS', desc: 'THEY BREAK INTO TWO SMALLER TARGETS' },
  shield:   { icon: 'shield', color: '#66bb6a', name: 'SHIELD GENERATORS', desc: 'BREAK THE GENERATOR TO EXPOSE ITS NEIGHBORS' },
  regen:    { icon: 'heart', color: '#81c784', name: 'REGEN BRICKS', desc: 'DAMAGED BRICKS SLOWLY REPAIR THEMSELVES' },
  volatile: { icon: 'fire', color: '#ff5252', name: 'VOLATILE SLIDERS', desc: 'MOVING BOMBS CAN CLEAR A WHOLE CLUSTER' },
  reactor:  { icon: 'mega', color: '#ffd740', name: 'REACTOR BRICKS', desc: 'HARD TARGETS DROP ITEMS AND DETONATE' },
};
const BRICK_BEHAVIOR_ORDER = ['treasure', 'bomb', 'shift', 'link', 'split', 'shield', 'regen', 'volatile', 'reactor'];

// ============================================================
//  SKILL TREE — five paths, four tiers each. The two offense paths deliberately
//  solve different problems: VOLLEY covers space while IMPACT rewards a lined-
//  up shot. The remaining paths own survival, Mega tempo, and pickups/score.
//  Every tier has an in-play tell on the pilot rig; levels are permanent...
//  unless you are knocked out, which burns tree levels instead of ending the run.
// ============================================================
const PATHS = {
  arsenal: { name: 'VOLLEY', role: 'VOLUME FIRE', crole: 'BALL CONTROL & MULTIBALL', family: 'offense', color: '#80d8ff',
    summary: 'RATE OF FIRE · COVER MORE LANES', csummary: 'MORE BALLS · WIDER CONTROL', tell: 'CYAN MULTI-BARREL RIG', tiers: [
    { key: 'coolant',   icon: 'slow',   name: 'COOLANT', cname: 'CONTROL CORE',
      desc: 'BALL SPEED CAP −8% · EASIER RETURNS', sdesc: 'BLASTER HEAT PER SHOT −25%',
      visual: 'CYAN COOLANT HALO AROUND THE WEAPON CORE' },
    { key: 'intercept', icon: 'target', name: 'INTERCEPTOR', cname: 'RALLY GUARD',
      desc: 'RALLY BARRIER +1 CHARGE', sdesc: 'BOLTS DESTROY +1 ENEMY SHOT BEFORE FADING',
      visual: 'CYAN TARGETING PRONGS FRAME THE MUZZLE' },
    { key: 'twin',      icon: 'multi',  name: 'TWIN CANNON', cname: 'TWIN ORB',
      desc: 'MULTIBALL — SERVE WITH A SECOND BALL',
      sdesc: 'FIRE TWO BOLTS · EACH DEALS 60% DAMAGE', visual: 'TWO SEPARATE CYAN FIRING POINTS' },
    { key: 'hyper',     icon: 'swift',  name: 'HYPER CYCLE', cname: 'WIDE ARRAY',
      desc: 'PADDLE 15% WIDER · COVER MORE LANES', sdesc: 'FIRES 20% FASTER · HEAT PER SHOT −15%',
      visual: 'CYCLER FINS OPEN BESIDE THE TWIN MUZZLES' },
  ]},
  impact: { name: 'IMPACT', role: 'HEAVY & CHARGE', crole: 'BALL POWER', family: 'offense', color: '#ff8a65',
    summary: 'FEWER, HEAVIER SHOTS · CHARGED HITS DETONATE', csummary: 'HEAVIER BALL · BIGGER HITS', tell: 'AMBER HEAVY-BOLT CORE', tiers: [
    { key: 'heavy',   icon: 'target', name: 'HEAVY BOLT', cname: 'HEAVY CORE',
      desc: 'BALL 18% LARGER · BRICK DAMAGE +15%',
      sdesc: 'BOLTS 30% WIDER · DAMAGE +15% · CHARGE BUILDS 35% FASTER',
      visual: 'AMBER HEAVY-BORE RING AROUND THE MUZZLE' },
    { key: 'demo',    icon: 'fire',   name: 'SPLASH CHARGE', cname: 'IMPACT CHARGE',
      desc: 'BALL BRICK DAMAGE +25%', sdesc: 'CHARGED SHOTS DETONATE — SPLASH DAMAGE AROUND THE HIT',
      visual: 'TWO AMBER CHARGE MOTES ORBIT THE HEAVY BORE' },
    { key: 'pulse',   icon: 'laser',  name: 'PULSE ROUND', cname: 'POWER CORE',
      desc: 'BALL BRICK DAMAGE +30%',
      sdesc: 'EVERY 5TH VOLLEY PIERCES 2 TARGETS', visual: 'FOUR AMBER PULSE NOTCHES MARK THE BARREL' },
    { key: 'impactX', icon: 'star',   name: 'NOVA ROUND', cname: 'SHATTER CORE',
      desc: 'BALL DAMAGE +30% · CRUSHES BRICKS & BOSSES',
      sdesc: 'PULSE EVERY 4TH VOLLEY · 2× DMG · BIGGER CHARGE BLAST',
      visual: 'A LARGE AMBER NOVA CROWN SURROUNDS THE WEAPON' },
  ]},
  prism: { name: 'PRISM', role: 'TYPE MASTERY', family: 'element', color: '#26c6da',
    summary: 'BEND TYPE MATCHUPS IN YOUR FAVOR', tell: 'TEAL PRISM FACETS', tiers: [
    { key: 'attune',    icon: 'psychic',  name: 'ATTUNE',    desc: 'ELEMENT PICKUPS LAST 50% LONGER',
      visual: 'ONE TEAL FACET LOCKS TO YOUR CURRENT ELEMENT' },
    { key: 'amplify',   icon: 'electric', name: 'AMPLIFY',   desc: 'SUPER-EFFECTIVE HITS DEAL +30% DAMAGE',
      visual: 'A SECOND PRISM FACET CREATES A SHARP STAR GLINT' },
    { key: 'transfuse', icon: 'fairy',    name: 'TRANSFUSE', desc: 'ELEMENT ORBS ARRIVE 40% SOONER · BAD MATCHUPS NEVER BURN YOUR ELEMENT OFF',
      visual: 'THREE FACETS TURN AS AN ELEMENT COMPASS' },
    { key: 'prismX',    icon: 'dragon',   name: 'OMNI LENS', desc: 'RESISTANCES IGNORED — NOTHING SHRUGS OFF YOUR ELEMENT',
      visual: 'A COMPLETE FOUR-FACET OMNI LENS FRAMES THE PILOT' },
  ]},
  aegis: { name: 'AEGIS', role: 'SURVIVAL', family: 'defense', color: '#66bb6a',
    summary: 'SHIELDS ABSORB LETHAL HITS · RECHARGING DEFENSE', tell: 'GREEN ARMOR SOCKETS + SHIELD BUBBLE', tiers: [
    { key: 'guard',     icon: 'shield', name: 'HOME GUARD',   desc: 'START WAVES SHIELDED · SHIELDS SAVE BALLS & BLOCK HITS',
      sdesc: 'START WAVES SHIELDED · A SHIELD ABSORBS ONE HIT', visual: 'GREEN SHIELD SOCKET ABOVE THE PILOT' },
    { key: 'bulwark',   icon: 'shield', name: 'BULWARK',      desc: 'SHIELD CAPACITY 3 → 5',
      visual: 'SEGMENTED GREEN ARMOR PLATES WIDEN THE SHIELD ARC' },
    { key: 'wide',      icon: 'wide',   name: 'LONG FRAME',   desc: 'PADDLE PERMANENTLY 18% WIDER',
      sdesc: 'CATCH REACH +18% · YOUR HURTBOX STAYS SMALL', visual: 'GREEN SIDE WINGS EXTEND YOUR COLLECTION REACH' },
    { key: 'aegisX',    icon: 'shield', name: 'SUPER SHIELD', desc: 'A SHIELD CHARGE REGROWS EVERY 10 SECONDS',
      visual: 'A ROTATING REGENERATOR MARK TRAVELS THE SHIELD CROWN' },
  ]},
  surge: { name: 'SURGE', role: 'MEGA TEMPO', family: 'tempo', color: '#ffd54f',
    summary: 'CHARGE MEGA OFTEN · EVERY RANK: MEGA DAMAGE +10%', tell: 'GOLD OVERDRIVE CORE', tiers: [
    { key: 'momentum',  icon: 'mega', name: 'MOMENTUM',       desc: 'RETURNS +2% MEGA · BLASTER HITS +0.2%',
      sdesc: 'EVERY BLASTER HIT CHARGES +0.4% MEGA', visual: 'A GOLD POWER RING LIGHTS BENEATH THE PILOT' },
    { key: 'rally',     icon: 'star', name: 'RALLY MASTER',   desc: 'KILLS CHARGE MEGA · BARRIER +1 · RALLY SCORE +50%',
      sdesc: 'KILLS CHARGE MEGA ×2.5 · COMBO SCORE +50%', visual: 'GOLD KILL SPARKS ORBIT THE POWER RING' },
    { key: 'blaze',     icon: 'fire', name: 'OVERDRIVE CORE', desc: 'MEGA LASTS 7s · FIRE BLASTS 35% LARGER',
      visual: 'GOLD POWER VEINS RUN INTO THE PILOT SILHOUETTE' },
    { key: 'megaX',     icon: 'mega', name: 'APEX MEGA',      desc: 'MEGA LASTS 9s · ATTACK DAMAGE +40%',
      visual: 'THE OVERDRIVE CORE GAINS A WHITE APEX CROWN' },
  ]},
  bond: { name: 'BOND', role: 'PICKUPS & SCORE', family: 'utility', color: '#ec407a',
    summary: 'MORE DROPS · SAFER CATCHES · EXTRA LIVES', tell: 'PINK MAGNET NODE', tiers: [
    { key: 'magnetize', icon: 'magnet',   name: 'ITEM MAGNET',    desc: 'PICKUPS DRIFT TOWARD YOUR PADDLE',
      sdesc: 'PICKUPS DRIFT TOWARD YOU', visual: 'PINK MAGNET VANES APPEAR BESIDE THE PILOT' },
    { key: 'bond',      icon: 'pokeball', name: "TRAINER'S BOND", desc: 'EACH CATCH: PERMANENT +6% SCORE',
      visual: 'A POKÉ BALL BOND CREST LOCKS TO THE REAR RIG' },
    { key: 'fortune',   icon: 'coin',     name: 'FORTUNE',        desc: 'POWER-UP DROP CHANCE +50%',
      visual: 'A SMALL GOLD-PINK FORTUNE CHARM HANGS FROM THE CREST' },
    { key: 'revive',    icon: 'heart',    name: 'POKÉ REVIVE',    desc: '+1 LIFE NOW · +1 LIFE EVERY REGION CLEARED',
      visual: 'A BRIGHT HEART CANISTER POWERS THE REAR RIG' },
  ]},
};
const PATH_KEYS = Object.keys(PATHS);
function junkieTierName(pathKey, tierIdx) {
  const tier = PATHS[pathKey].tiers[tierIdx];
  if (G.mode === 'junkie' && SKIN.junkieItems[pathKey] && SKIN.junkieItems[pathKey][tierIdx]) {
    return SKIN.junkieItems[pathKey][tierIdx];
  }
  return G.mode === 'classic' && tier.cname ? tier.cname : tier.name;
}
// Cards, the tree atlas, and pick confirmations all describe what a tier does
// IN THE CURRENT MODE — a shooter-mode player never reads about paddles/balls.
function tierDesc(pathKey, tierIdx) {
  const tier = PATHS[pathKey].tiers[tierIdx];
  return (G.mode !== 'classic' && tier.sdesc) ? tier.sdesc : tier.desc;
}
function pathRole(pathKey) {
  const path = PATHS[pathKey];
  return G.mode === 'classic' && path.crole ? path.crole : path.role;
}
function pathSummary(pathKey) {
  const path = PATHS[pathKey];
  return G.mode === 'classic' && path.csummary ? path.csummary : path.summary;
}
function tierTags(pathKey, tierIdx) {
  const family = PATHS[pathKey].family;
  if (family === 'offense') {
    if (G.mode !== 'classic') return tierIdx === 0 ? ['BLASTER', 'CHARGE'] : ['BLASTER'];
    return ['BALL']; // classic offense is pure ball power now — no paddle gun
  }
  if (family === 'defense') return ['DEFENSE'];
  if (family === 'element') return [typeWord()];
  if (family === 'tempo') return [lex('MEGA')];
  return ['ITEM', 'SCORE'];
}
function tierSynergy(pathKey, tierIdx) {
  const family = PATHS[pathKey].family;
  if (family === 'offense' && pathLvl('surge')) return lex('SYNERGY: MORE HITS CHARGE MEGA FASTER');
  if (family === 'defense' && pathLvl('bond')) return 'SYNERGY: SAFER ITEM COLLECTION';
  if (family === 'element' && G.starter) return 'SYNERGY: AMPLIFIES YOUR ' + SKIN.strings.partnerWord + ' ' + typeWord();
  if (family === 'tempo') return lex('SYNERGY: EVERY ' + PATHS.surge.name + ' RANK ADDS +10% MEGA DAMAGE');
  if (family === 'utility' && pathLvl('aegis')) return 'SYNERGY: SHIELDS PROTECT ITEM RUNS';
  return 'BUILDS TOWARD ' + PATHS[pathKey].tiers[Math.min(3, tierIdx + 1)].name;
}
function tierComparison(pathKey, tierIdx) {
  if (tierIdx <= 0) return 'NEW PATH · TIER I';
  return 'UPGRADES ' + junkieTierName(pathKey, tierIdx - 1) + ' · TIER ' + (tierIdx + 1);
}
// As authored paths cap, every mode fills empty offers with these small mastery
// stacks. In SPACE JUNKIE they are literal held items orbiting the pilot.
const STACK_ITEMS = [
  { key: 'orb',  name: 'LIFE ORB',       icon: 'mega',   color: '#b388ff', desc: 'ALL ATTACK DAMAGE +6% — STACKS FOREVER' },
  { key: 'ice',  name: 'NEVER-MELT ICE', icon: 'slow',   color: '#80deea', desc: 'BLASTER HEAT −6% PER SHOT — STACKS FOREVER' },
  { key: 'bell', name: 'SOOTHE BELL',    icon: 'heart',  color: '#f48fb1', desc: 'ALL SCORE +6% — STACKS FOREVER' },
  // ---- AFFINITY satellites (Round S6). A skin with SKIN.affinities lets
  // the player pick LIGHT or DARK at setup; the pick swaps which trio fills
  // empty draft slots (activeSatellites) — same machinery, same slot rules,
  // the 50-node web and its caps untouched. Keys are additive G.stacks keys.
  { key: 'dawn',  affinity: 'light', name: 'DAWNLIGHT CHARM', icon: 'star',  color: '#ffe082', desc: 'POWER-UP DROPS +8% — STACKS FOREVER' },
  { key: 'halo',  affinity: 'light', name: 'HALO WARD',       icon: 'shield', color: '#fff59d', desc: 'EVERY 25 KILLS RAISES A SHIELD — STACKS QUICKEN IT' },
  { key: 'grace', affinity: 'light', name: 'GRACE LIGHT',     icon: 'heart', color: '#ffd54f', desc: 'POTIONS ALSO BANK 15% MEGA — STACKS FOREVER' },
  { key: 'fang',  affinity: 'dark',  name: 'VOID FANG',       icon: 'dark',  color: '#b388ff', desc: 'ALL DAMAGE +7% · SCORE −3% — STACKS FOREVER' },
  { key: 'tithe', affinity: 'dark',  name: 'BLOOD TITHE',     icon: 'mega',  color: '#ce93d8', desc: 'EVERY KILL BANKS +0.9% MEGA — STACKS FOREVER' },
  { key: 'hex',   affinity: 'dark',  name: 'UMBRAL HEX',      icon: 'ghost', color: '#9575cd', desc: 'CHARGED SHOTS +9% DAMAGE — STACKS FOREVER' },
];
const AFFINITIES = {
  light: { key: 'light', name: 'LIGHT', color: '#ffd97a', tag: 'WARD · MEND · SHINE',
    desc: 'RADIANT SATELLITES: DROPS, SHIELDS, MEGA FROM MENDING' },
  dark: { key: 'dark', name: 'DARK', color: '#b388ff', tag: 'DRAIN · CRIT · RISK',
    desc: 'VOID SATELLITES: DAMAGE, KILL-FED MEGA, CHARGED CRUELTY' },
};
function stackN(k) { return (G.stacks && G.stacks[k]) || 0; }
function freshStacks() {
  const s = {}; for (const it of STACK_ITEMS) s[it.key] = 0; return s;
}
function affinityColor() {
  return (SKIN.affinities && AFFINITIES[SETTINGS.affinity]) ? AFFINITIES[SETTINGS.affinity].color : null;
}
// A complete Kanto Rift Key earns one bonus draft after Mew VMAX. These
// upgrades never enter the ordinary tree or reroll pool.
const SECRET_UPGRADES = [
  { key: 'heart', name: 'PARADOX HEART', icon: 'heart', color: '#ff80ab',
    desc: '+1 MAX HP · FULLY HEAL · FILL THE MEGA METER' },
  { key: 'lens', name: 'RIFT LENS', icon: 'psychic', color: '#80d8ff',
    desc: '+15% ALL DAMAGE · ATTACKS IGNORE TYPE RESISTANCE' },
  { key: 'echo', name: 'ECHO RELAY', icon: 'electric', color: '#d780ff',
    desc: 'EVERY 7TH DAMAGE HIT CHAINS TO TWO OTHER TARGETS' },
];
// ============================================================
//  THE UPGRADE WEB — bridges, superskills, mastery satellites
//  The 24 authored tiers above stay the save-stable ANCHOR nodes; everything
//  here is ADDITIVE (new G.upg keys only, never renamed). Bridges live between
//  ADJACENT constellation wedges, superskills cap each spoke, and the three
//  mastery stacks dock as satellites on their home wedge. Evolution ("Form")
//  gates read the pilot's ACTUAL tier: G.starterLvl (NO PARTNER's training
//  drone advances on the same act boundaries; Pikachu waits for Raichu).
// ============================================================
// Wedge display order for the constellation map. Chosen so that every bridge
// connects two ADJACENT wedges (the bridge cycle arsenal–impact–prism–surge–
// aegis–bond is a Hamiltonian cycle through the six paths). PATH_KEYS order
// is untouched — this is presentation + adjacency data only.
const WEB_SPOKE_ORDER = ['arsenal', 'impact', 'prism', 'surge', 'aegis', 'bond'];
// FORM II bridge synergies: each connects the two wedges it sits between,
// costs one stage-clear pick, requires at least one owned node on EACH side,
// and is a real two-system mechanic — never a free shortcut. `desc` is the
// classic (ball-first) adapter; `sdesc` is the shooter-mode behaviour.
const WEB_BRIDGES = [
  { key: 'calibrated', name: 'CALIBRATED BARRAGE', icon: 'target', color: '#ffcc80', paths: ['arsenal', 'impact'],
    desc: 'EVERY 4TH PADDLE RETURN PRIMES THE BALL — NEXT HIT +60%',
    sdesc: 'A SPENT CHARGED SHOT PRIMES YOUR NEXT 3 VOLLEYS — +60% DAMAGE',
    visual: 'TWIN CALIBRATION RAILS BRIDGE THE MUZZLE HARDWARE',
    proc: 'PRIMED SHOTS RUN WHITE-HOT · "CALIBRATED!" FLASH' },
  { key: 'singularity', name: 'SINGULARITY LENS', icon: 'warp', color: '#b388ff', paths: ['impact', 'prism'],
    desc: 'EVERY 5TH BRICK BROKEN IMPLODES — TYPED SPLASH DAMAGE AROUND IT',
    sdesc: 'CHARGED DETONATIONS LEAVE A TYPED IMPLOSION THAT KEEPS BURNING',
    visual: 'A DARK PRISM ORB SEATS INSIDE THE HEAVY BORE',
    proc: 'AN IMPLODING ELEMENT-COLORED VORTEX RING AT THE BLAST' },
  { key: 'aurora', name: 'AURORA DRIVE', icon: 'psychic', color: '#69f0ae', paths: ['prism', 'surge'],
    desc: 'SUPER-EFFECTIVE HITS CHARGE +1.5% MEGA · MEGA OPENS WITH A TYPED NOVA',
    visual: 'AN AURORA RIBBON ARCS BETWEEN LENS AND POWER RING',
    proc: 'GOLD MOTES STREAM TO THE CORE ON EVERY SUPER-EFFECTIVE HIT' },
  { key: 'reactive', name: 'REACTIVE OVERDRIVE', icon: 'electric', color: '#dce775', paths: ['surge', 'aegis'],
    desc: 'A SHIELD ABSORB CHARGES +15% MEGA · ENTERING MEGA REGROWS 1 SHIELD',
    visual: 'GREEN-GOLD FEED LINES LINK THE SHIELD ARC TO THE CORE',
    proc: 'A GOLD SURGE RUNS THE FEED LINES WHEN EITHER SIDE TRIGGERS' },
  { key: 'rescue', name: 'RESCUE CIRCUIT', icon: 'heart', color: '#ff8a80', paths: ['aegis', 'bond'],
    desc: 'MAX POTIONS ALSO RESTORE +1 SHIELD · EVERY 8 PICKUPS GROW +1 SHIELD',
    visual: 'A PINK-GREEN LIFELINE COILS AROUND THE SHIELD SOCKET',
    proc: 'A SHIELD PIP LIGHTS WITH A HEARTBEAT RING ON RESCUE' },
  { key: 'salvage', name: 'SALVAGE DRONES', icon: 'magnet', color: '#ea80fc', paths: ['bond', 'arsenal'],
    desc: 'EVERY 3 PICKUPS: DRONES INTERCEPT THE NEXT ENEMY SHOT (STORES 2)',
    sdesc: 'EVERY 3 PICKUPS OR CATCHES: DRONES FIRE A SEEKING COUNTER-VOLLEY',
    visual: 'TWO SMALL SALVAGE DRONES DOCK OFF THE MAGNET VANES',
    proc: 'DRONE BOLTS TRAIL CYAN-PINK · INTERCEPTS FLASH A HEX' },
];
// FUSION POWERS — the progression spine's late-game identity layer
// (FUSION_APEX_PLAN.md). All 15 two-path combinations exist EXACTLY ONCE:
// the six ADJACENT pairs ride their Form II bridge (the original superskills,
// keys unchanged so shipped saves grandfather cleanly); the nine CROSS-WEB
// pairs need no bridge but the same deep investment. Recipe (fusionEligible):
// Final Form + >=3 ranks in BOTH paths + a capstone in EITHER + the bridge
// (adjacent pairs only) + a free Fusion slot. MAX TWO Fusions per run — the
// structural safeguard that keeps late runs specialized instead of complete.
const WEB_FUSIONS = [
  // ---- the six adjacent (bridge-backed) fusions ----
  { key: 'meteor', name: 'METEOR MATRIX', icon: 'multi', color: '#40c4ff', paths: ['arsenal', 'impact'], bridge: 'calibrated',
    role: 'CROWD BURST',
    desc: 'LINED-UP HITS FILL THE MATRIX — MEGA EVOLUTION UNLEASHES A 6-STRIKE METEOR RAIN',
    sdesc: 'BASIC HITS FILL THE MATRIX — A FULL CHARGE UNLEASHES A 6-STRIKE METEOR RAIN',
    ready: 'THE SIDE-RACK MOTES BRIGHTEN AS THE MATRIX FILLS',
    visual: 'DEPLOYED SIDE RACKS FLANK THE MUZZLES, MOTES ORBITING',
    proc: 'ELEMENT-COLORED METEORS STREAK DOWN ONTO TARGETS',
    limit: 'THE RAIN NEEDS A FULL MATRIX — NEVER EVERY CHARGE' },
  { key: 'horizon', name: 'EVENT HORIZON', icon: 'warp', color: '#ff7043', paths: ['impact', 'prism'], bridge: 'singularity',
    role: 'GROUPING & CONTROL',
    desc: 'YOUR IMPLOSIONS BECOME GRAVITY WELLS THAT ERASE ENEMY FIRE — EACH TARGET BURNS ONCE',
    ready: 'THE ACCRETION RIM STAYS LIT WHILE A WELL CAN FORM',
    visual: 'THE SINGULARITY ORB GROWS A BRIGHT ACCRETION RIM',
    proc: 'A DARK WELL LINGERS AT THE BLAST, ERASING ENEMY SHOTS',
    limit: 'WELL DAMAGE HITS EACH TARGET ONCE · BOSSES RESIST 4-FOLD' },
  { key: 'ascension', name: 'ELEMENTAL ASCENSION', icon: 'star', color: '#18ffff', paths: ['prism', 'surge'], bridge: 'aurora',
    role: 'TYPE MASTERY',
    desc: 'DURING MEGA YOUR ELEMENT RETUNES EVERY 1.5s TO COUNTER THE WAVE',
    ready: 'THE RAINBOW HALO TURNS WHILE MEGA IS BANKED',
    visual: 'A RAINBOW LENS HALO CROWNS THE OMNI LENS',
    proc: 'THE LIVE TYPE GLYPH SWAPS WITH A PRISM FLASH EACH RETUNE',
    limit: 'NEVER EXTENDS TOTAL MEGA DURATION' },
  { key: 'immortal', name: 'IMMORTAL REACTOR', icon: 'mega', color: '#ffea00', paths: ['surge', 'aegis'], bridge: 'reactive',
    role: 'EMERGENCY SURVIVAL',
    desc: 'ONCE PER WAVE: A LETHAL HIT DRAINS YOUR WHOLE MEGA METER (25%+ BANKED) INSTEAD OF A LIFE',
    ready: 'THE ARMORED SHELL RINGS SOLID WHILE THE REACTOR IS ARMED',
    visual: 'A GOLD-GREEN ARMORED REACTOR SHELL RINGS THE CORE',
    proc: 'THE SHELL CRACKS, FLARES, AND A COUNTERBURST CLEARS ENEMY FIRE',
    limit: 'SHIELD REGROWTH STALLS 6s AFTER IT FIRES' },
  { key: 'guardian', name: 'GUARDIAN ANGEL', icon: 'fairy', color: '#b9f6ca', paths: ['aegis', 'bond'], bridge: 'rescue',
    role: 'RECOVERY',
    desc: 'POTIONS, CATCHES + SHIELD SAVES CHARGE THE PULSE (8) — AT FULL: CLEAR ENEMY FIRE, HEAL +1 HP',
    ready: 'EIGHT SIGIL PIPS FILL BEHIND YOU',
    visual: 'A COMPANION SIGIL WITH PINK-GREEN PULSE WINGS RIDES BEHIND YOU',
    proc: 'THE SIGIL FLARES AND A WING-SHAPED PULSE SWEEPS THE SCREEN',
    limit: 'AT MOST ONE PULSE PER WAVE' },
  { key: 'acewing', name: 'ACE INTERCEPTOR WING', icon: 'flying', color: '#ff80ab', paths: ['bond', 'arsenal'], bridge: 'salvage',
    role: 'COMPANION OFFENSE',
    desc: 'TWO PERMANENT WINGMATES INTERCEPT ENEMY FIRE ON PATROL',
    sdesc: 'TWO PERMANENT WINGMATES FIRE SEEKING BOLTS + INTERCEPT ENEMY FIRE',
    ready: 'THE FORMATION LIGHTS HOLD STATION WHENEVER THE WING IS LIVE',
    visual: 'TWO FORMATION LIGHTS HOLD STATION OFF YOUR WINGS',
    proc: 'WINGMATE BOLTS TRAIL YOUR ELEMENT COLOR AT LOWER BRIGHTNESS',
    limit: 'WINGMATES STAY WELL BELOW YOUR OWN SUSTAINED FIRE' },
  // ---- the nine cross-web fusions (no bridge — pure deep investment) ----
  { key: 'prismstorm', name: 'PRISMSTORM ARRAY', icon: 'laser', color: '#64ffda', paths: ['arsenal', 'prism'],
    role: 'TUNED VOLUME FIRE',
    desc: 'EVERY 12TH HIT PRIMES A FIVE-LANE PRISM VOLLEY, EACH LANE TUNED AGAINST THE WAVE',
    ready: 'THE LENS FACETS FILL AS HITS LINE UP (0-12)',
    visual: 'A FACETED LENS UNFOLDS ACROSS THE MUZZLES',
    proc: 'FIVE COLORED LIGHT RAILS FAN OUT OF THE LENS',
    limit: 'BOSS DAMAGE CAPPED NEAR 1.25 NORMAL VOLLEYS' },
  { key: 'hypernova', name: 'HYPERNOVA CYCLE', icon: 'swift', color: '#ffff8d', paths: ['arsenal', 'surge'],
    role: 'MEGA SUSTAIN',
    desc: 'DURING MEGA, AN UNBROKEN STREAM SPINS THROUGH 3 CADENCE STAGES · INTERCEPTIONS RELEASE ECHO BOLTS',
    ready: 'HEAT RINGS AROUND THE BARRELS SHOW THE ACTIVE STAGE',
    visual: 'CYAN BARRELS SPIN INSIDE A GOLD MEGA CROWN',
    proc: 'ECHO BOLTS SNAP OUT OF EVERY INTERCEPTION',
    limit: 'PEAK +30% SUSTAIN · STAGE THREE RUNS DANGEROUSLY HOT' },
  { key: 'battery', name: 'BULWARK BATTERY', icon: 'wide', color: '#a5d6a7', paths: ['arsenal', 'aegis'],
    role: 'FORTIFIED FIRE',
    desc: 'INTERCEPTIONS BUILD A 3-SEGMENT HEX WALL AHEAD OF YOU · A FULL WALL TURNS YOUR NEXT RELEASE INTO A COUNTERBEAM',
    ready: 'WALL SEGMENTS FLOAT AHEAD OF THE PILOT (0-3)',
    visual: 'A TRANSLUCENT HEX WALL RIDES FORWARD OF THE PILOT',
    proc: 'THE WALL FOLDS INTO A HORIZONTAL RAIL AND FIRES',
    limit: '12s REBUILD FLOOR AFTER THE BEAM' },
  { key: 'cataclysm', name: 'CATACLYSM CORE', icon: 'fire', color: '#ffab40', paths: ['impact', 'surge'],
    role: 'SCREEN CLEAR',
    desc: 'MEGA EVOLUTION MAY DETONATE A SCREEN-CLEARING NOVA (20s COOLDOWN)',
    sdesc: 'A FULL CHARGE MAY CONSUME 50% BANKED MEGA — A SCREEN-CLEARING NOVA',
    ready: 'THE COLLAPSED RING GLOWS WHEN THE COST IS BANKED',
    visual: 'A COLLAPSED REACTOR RING ORBITS THE CHARGE CHAMBER',
    proc: 'THE SCREEN DIMS, THEN A GOLD-ORANGE RING SWEEPS IT',
    limit: '20s COOLDOWN · BOSSES TAKE ONLY A SLIVER' },
  { key: 'lance', name: 'AEGIS LANCE', icon: 'target', color: '#d4e157', paths: ['impact', 'aegis'],
    role: 'ARMOR BREAKER',
    desc: 'MEGA + A SHIELD: YOUR ATTACKS BECOME THE LANCE FOR THE WINDOW — PIERCING, ARMOR-BREAKING',
    sdesc: 'WHILE SHIELDED, A FULL CHARGE CONSUMES ONE SHIELD — AN UNSTOPPABLE ARMOR-BREAKING LANCE',
    ready: 'SHIELD PLATES ROTATE FORWARD WHILE A CHARGE IS BANKED',
    visual: 'SHIELD PLATES FORM AN ARMORED BARREL AROUND THE BORE',
    proc: 'THE LANCE PIERCES EVERYTHING ON ITS LINE',
    limit: 'COSTS A REAL SHIELD CHARGE EVERY TIME' },
  { key: 'shepherd', name: 'COMET SHEPHERD', icon: 'coin', color: '#ffab91', paths: ['impact', 'bond'],
    role: 'ECONOMY BURST',
    desc: 'PICKUPS BANK COMET SEEDS (MAX 3) — YOUR NEXT RELEASE SENDS THEM AT SEPARATE TARGETS',
    ready: 'SEED STARS ORBIT THE REAR RIG (0-3)',
    visual: 'HELD-ITEM GLYPHS BECOME SMALL ORBITING SEED STARS',
    proc: 'CURVED COMET TRAILS PEEL AWAY TOWARD TARGETS',
    limit: 'SEEDS HIT ELITES AND BOSSES SOFTLY' },
  { key: 'mirror', name: 'MIRROR SPECTRUM', icon: 'ice', color: '#80cbc4', paths: ['prism', 'aegis'],
    role: 'REFLECTED DEFENSE',
    desc: 'DEFLECTED SHOTS AND SHIELD SAVES STORE FACETS (MAX 3) — YOUR NEXT RELEASE FIRES THEM BACK, TYPED',
    ready: 'COLORED PRISM PLATES RING THE SHIELD (0-3)',
    visual: 'THE SHIELD DIVIDES INTO COLORED PRISM PLATES',
    proc: 'A REFLECTED FAN FIRES IN THE CAPTURED TYPES',
    limit: 'THREE FACETS · REFLECTIONS NEVER RE-CHARGE IT' },
  { key: 'chorus', name: 'BESTIARY CHORUS', icon: 'sound', color: '#f48fb1', paths: ['prism', 'bond'],
    role: 'COMPANION STRIKE',
    desc: 'RECORD 3 DIFFERENT TYPES (CATCHES / ELEMENT ORBS) — A FAVORABLE-TYPE COMPANION STRIKE ANSWERS',
    ready: 'THREE CONSTELLATION OUTLINES FILL BEHIND THE CREST',
    visual: 'FAINT MON CONSTELLATIONS ORBIT THE BOND CREST',
    proc: 'THE OUTLINES CONVERGE INTO ONE ATTACK GLYPH',
    limit: 'ONCE PER WAVE' },
  { key: 'formation', name: 'VICTORY FORMATION', icon: 'pokeball', color: '#ffd180', paths: ['surge', 'bond'],
    role: 'SQUADRON CALL',
    desc: 'PICKUPS + CATCHES FILL SYNC (8) — MEGA AT FULL SYNC CALLS A PARTNER SQUADRON FOR 8s',
    ready: 'THE SYNC METER RIDES YOUR POWER RING',
    visual: 'TWO LIGHT SILHOUETTES HOLD A V OFF YOUR WINGS',
    proc: 'THE SQUADRON LAUNCHES SYNCHRONIZED SEEKING ATTACKS',
    limit: 'EIGHT SECONDS · THE SQUAD HUNTS ADDS FIRST' },
];
// APEX POWERS — the rare three-path transformations. Recipe (apexEligible):
// stage 24+, TWO compatible installed Fusions (both inside the apex's three
// paths), nine total ranks across those paths, and the single Apex slot.
// Apexes change how the rig FLOWS, never just its numbers.
const WEB_APEXES = [
  { key: 'warmachine', name: 'WAR MACHINE', icon: 'steel', color: '#ff6e40', paths: ['arsenal', 'impact', 'surge'], mapSlot: 0.5,
    role: 'FLUID WEAPON FORMS',
    desc: 'THE RIG FOLDS BETWEEN GATLING AND RAIL: BASIC HITS BUILD RAIL PRESSURE · SPENDING IT RUNS COOLER AND NEVER RESETS YOUR CADENCE',
    ready: 'THE PRESSURE GAUGE CLIMBS ALONG THE BARREL',
    visual: 'THE WHOLE WEAPON RIG FOLDS BETWEEN TWO SILHOUETTES',
    proc: 'A FOLD FLASH AND A DEEPER RAIL REPORT ON THE SPEND',
    limit: 'BOTH FORMS SHARE ONE HEAT BAR' },
  { key: 'celestial', name: 'CELESTIAL GUARDIAN', icon: 'star', color: '#b388ff', paths: ['prism', 'aegis', 'bond'], mapSlot: 4.5,
    role: 'CONSTELLATION WARD',
    desc: 'TYPE, SHIELD AND BOND EVENTS FILL THREE HALO SECTORS — AT FULL: A TYPED WAVE CLEARS FIRE, CRACKS ARMOR, RESTORES 1 SHIELD OR 1 HP',
    ready: 'THREE HALO SECTORS FILL BEHIND THE PILOT',
    visual: 'A SIX-POINT HALO WITH THREE COLORED SECTORS',
    proc: 'THE HALO EXPANDS AS TRANSLUCENT WINGS',
    limit: 'RESTORES A SHIELD OR HP — NEVER BOTH' },
];
// Mastery satellites: the SAME forever-stacking items (G.stacks keys are
// storage-stable) docked onto their home wedge as revisitable web nodes.
// Offered once the wedge's path caps — never crowding out an authored node.
const WEB_SATELLITES = [
  { stackKey: 'orb', path: 'impact' },   // LIFE ORB — damage mastery
  { stackKey: 'ice', path: 'arsenal' },  // NEVER-MELT ICE — cooling mastery
  { stackKey: 'bell', path: 'bond' },    // SOOTHE BELL — fortune mastery
];
// affinity trios dock on the same three-satellite frame (same slots, same
// caps); the pick simply swaps WHICH mastery items fill empty offers
const AFFINITY_SATELLITES = {
  light: [
    { stackKey: 'dawn', path: 'bond' },
    { stackKey: 'halo', path: 'aegis' },
    { stackKey: 'grace', path: 'surge' },
  ],
  dark: [
    { stackKey: 'fang', path: 'impact' },
    { stackKey: 'tithe', path: 'surge' },
    { stackKey: 'hex', path: 'arsenal' },
  ],
};
function activeSatellites() {
  if (SKIN.affinities && AFFINITY_SATELLITES[SETTINGS.affinity]) return AFFINITY_SATELLITES[SETTINGS.affinity];
  return WEB_SATELLITES;
}
const WEB_BRIDGE_KEYS = WEB_BRIDGES.map(b => b.key);
const WEB_FUSION_KEYS = WEB_FUSIONS.map(f => f.key);
const WEB_APEX_KEYS = WEB_APEXES.map(x => x.key);
function webBridge(key) { return WEB_BRIDGES.find(b => b.key === key) || null; }
function webFusion(key) { return WEB_FUSIONS.find(f => f.key === key) || null; }
function webApex(key) { return WEB_APEXES.find(x => x.key === key) || null; }
function satelliteForPath(pk) { return WEB_SATELLITES.find(s => s.path === pk) || null; }
function stackItem(stackKey) { return STACK_ITEMS.find(s => s.key === stackKey) || null; }
// the pilot's evolution Form (1-3) — the web's ring gate. NO PARTNER's drone
// and every starter line advance G.starterLvl on the journey's act boundaries
// (Pikachu at its real region-5 Raichu evolution), so this is always live.
function webForm() { return Math.max(1, Math.min(3, G.starterLvl || 1)); }
function webNodeDesc(node) { return (G.mode !== 'classic' && node.sdesc) ? node.sdesc : node.desc; }
function bridgeEligible(b) {
  return !upgN(b.key) && webForm() >= 2 && pathLvl(b.paths[0]) >= 1 && pathLvl(b.paths[1]) >= 1;
}
function fusionsOwnedCount() { return WEB_FUSION_KEYS.reduce((a, k) => a + (upgN(k) ? 1 : 0), 0); }
function apexOwnedCount() { return WEB_APEX_KEYS.reduce((a, k) => a + (upgN(k) ? 1 : 0), 0); }
// a Fusion node stays a compact silhouette on the map until the player has
// two ranks in both of its paths (then it expands and reveals its recipe)
function fusionVisible(f) {
  return upgN(f.key) || (pathLvl(f.paths[0]) >= 2 && pathLvl(f.paths[1]) >= 2);
}
function fusionEligible(f) {
  return !upgN(f.key) && webForm() >= 3 && fusionsOwnedCount() < 2 &&
    pathLvl(f.paths[0]) >= 3 && pathLvl(f.paths[1]) >= 3 &&
    f.paths.some(pk => pathLvl(pk) >= 4) &&
    (!f.bridge || upgN(f.bridge));
}
function apexCompatFusions(x) {
  return WEB_FUSIONS.filter(f => f.paths.every(pk => x.paths.includes(pk)));
}
function apexRankSum(x) { return x.paths.reduce((a, pk) => a + pathLvl(pk), 0); }
function apexEligible(x) {
  return !upgN(x.key) && apexOwnedCount() < 1 && G.level >= 24 &&
    apexCompatFusions(x).filter(f => upgN(f.key)).length >= 2 &&
    apexRankSum(x) >= 9;
}
// exact lock reasons for the detail panel — the player should never need a
// guide to see why a node is unavailable
function webLockReason(node, kind) {
  const reasons = [];
  if (kind === 'bridge') {
    if (webForm() < 2) reasons.push('REQUIRES FORM II (PARTNER EVOLUTION · REGION 4)');
    for (const pk of node.paths) if (pathLvl(pk) < 1) reasons.push('REQUIRES ANY ' + PATHS[pk].name + ' NODE');
  } else if (kind === 'fusion') {
    if (webForm() < 3) reasons.push('REQUIRES FINAL FORM (REGION 7)');
    for (const pk of node.paths) if (pathLvl(pk) < 3) reasons.push('REQUIRES 3 RANKS IN ' + PATHS[pk].name + ' (' + pathLvl(pk) + '/3)');
    if (!node.paths.some(pk => pathLvl(pk) >= 4)) reasons.push('REQUIRES A CAPSTONE IN EITHER PATH');
    if (node.bridge && !upgN(node.bridge)) reasons.push('REQUIRES BRIDGE: ' + webBridge(node.bridge).name);
    if (!upgN(node.key) && fusionsOwnedCount() >= 2) reasons.push('FUSION SLOTS FULL (2/2)');
  } else if (kind === 'apex') {
    if (G.level < 24) reasons.push('REQUIRES STAGE 24+ (NOW AT ' + G.level + ')');
    const compat = apexCompatFusions(node), owned = compat.filter(f => upgN(f.key)).length;
    if (owned < 2) reasons.push('REQUIRES 2 OF: ' + compat.map(f => f.name).join(' / ') + ' (' + owned + '/2)');
    if (apexRankSum(node) < 9) reasons.push('REQUIRES 9 RANKS ACROSS ITS PATHS (' + apexRankSum(node) + '/9)');
    if (!upgN(node.key) && apexOwnedCount() >= 1) reasons.push('THE APEX SLOT IS TAKEN (1/1)');
  } else if (kind === 'sat') {
    if (pathLvl(node.path) < 4) reasons.push('UNLOCKS WHEN ' + PATHS[node.path].name + ' IS MASTERED (4/4)');
  }
  return reasons;
}
function ownedWebNodeCount() {
  return [...WEB_BRIDGE_KEYS, ...WEB_FUSION_KEYS, ...WEB_APEX_KEYS]
    .reduce((a, k) => a + (upgN(k) ? 1 : 0), 0);
}
// total burnable build (knockouts consume this; game over only when it's 0)
function totalBuildLevels() { return totalPathLevels() + ownedWebNodeCount(); }
// ---- knockout regression, graph-aware and SIMULATED: a candidate removal is
// a leaf only if the remaining build still satisfies every owned node's
// recipe (bridges keep a node each side; fusions keep 3/3 ranks + an either-
// side capstone + their bridge; apexes keep two compatible fusions + nine
// ranks). Apexes are always leaves. A grandfathered save that STARTS illegal
// burns freely — never soft-lock the knockout loop.
function webBuildLegal() {
  for (const b of WEB_BRIDGES) if (upgN(b.key) && b.paths.some(pk => pathLvl(pk) < 1)) return false;
  for (const f of WEB_FUSIONS) {
    if (!upgN(f.key)) continue;
    if (f.paths.some(pk => pathLvl(pk) < 3)) return false;
    if (!f.paths.some(pk => pathLvl(pk) >= 4)) return false;
    if (f.bridge && !upgN(f.bridge)) return false;
  }
  for (const x of WEB_APEXES) {
    if (!upgN(x.key)) continue;
    if (apexCompatFusions(x).filter(f => upgN(f.key)).length < 2) return false;
    if (apexRankSum(x) < 9) return false;
  }
  return true;
}
function webRegressibleLeaves() {
  const leaves = [];
  const baseline = webBuildLegal();
  const tryLeaf = (mutate, undo, leaf) => {
    mutate();
    if (webBuildLegal() || !baseline) leaves.push(leaf);
    undo();
  };
  for (const k of WEB_APEX_KEYS) if (upgN(k)) leaves.push({ kind: 'apex', key: k });
  for (const f of WEB_FUSIONS) {
    if (upgN(f.key)) tryLeaf(() => { delete G.upg[f.key]; }, () => { G.upg[f.key] = 1; }, { kind: 'fusion', key: f.key });
  }
  for (const b of WEB_BRIDGES) {
    if (upgN(b.key)) tryLeaf(() => { delete G.upg[b.key]; }, () => { G.upg[b.key] = 1; }, { kind: 'bridge', key: b.key });
  }
  for (const pk of PATH_KEYS) {
    const lvl = pathLvl(pk);
    if (lvl) tryLeaf(() => { G.path[pk] = lvl - 1; }, () => { G.path[pk] = lvl; }, { kind: 'tier', pathKey: pk });
  }
  return leaves;
}
function regressWebLeaf(leaf) {
  if (leaf.kind === 'tier') {
    const t = regressPath(leaf.pathKey);
    return t ? t.name : null;
  }
  delete G.upg[leaf.key];
  const def = leaf.kind === 'apex' ? webApex(leaf.key)
    : leaf.kind === 'fusion' ? webFusion(leaf.key) : webBridge(leaf.key);
  return def ? def.name : null;
}

function upgN(k) { return G.upg[k] || 0; }
function pathLvl(p) { return (G.path && G.path[p]) || 0; }
function totalPathLevels() { return PATH_KEYS.reduce((a, k) => a + pathLvl(k), 0); }
function advancePath(p) {
  const lvl = pathLvl(p);
  if (lvl >= 4) return null;
  const tier = PATHS[p].tiers[lvl];
  G.path[p] = lvl + 1;
  G.upg[tier.key] = 1;
  if (tier.key === 'revive') G.lives++;
  return tier;
}
function regressPath(p) {
  const lvl = pathLvl(p);
  if (lvl <= 0) return null;
  const tier = PATHS[p].tiers[lvl - 1];
  G.path[p] = lvl - 1;
  delete G.upg[tier.key];
  if (tier.key === 'revive') G.lives = Math.max(1, G.lives - 1); // inverse of advancePath
  return tier;
}

function isBossOnlyPokemon(id) { return SKIN.bossOnlyIds.has(id); }
// habitat clusters: types that share terrain in the show — the fallback
// theme when a wave doesn't draw a curated pack
const TYPE_CLUSTERS = [
  ['water', 'ice'], ['grass', 'bug', 'poison'], ['rock', 'ground', 'steel'],
  ['psychic', 'ghost', 'fairy'], ['fire', 'dragon'], ['electric', 'steel'],
  ['dark', 'ghost', 'poison'], ['flying', 'normal', 'bug'],
  ['fighting', 'rock', 'ground'],
];
// pick a wave THEME — squads in one wave draw from the same ecology
function pickWaveTheme(genIdx) {
  const packs = SKIN.habitatPacks[genIdx] || [];
  if (packs.length && gameRand() < 0.6) {
    const p = packs[Math.floor(gameRand() * packs.length)];
    return { name: p.n, ids: new Set(p.ids), types: null };
  }
  const cl = SKIN.typeClusters[Math.floor(gameRand() * SKIN.typeClusters.length)];
  return { name: cl.map(t => t.toUpperCase()).join('/') + ' HABITAT', ids: null, types: new Set(cl) };
}
// one tier's pool filtered to the theme; falls back to the full tier so a
// narrow pack can never produce an empty (crashing) pool
function themedPool(gen, tier, theme) {
  const full = gen.tiers[tier];
  const ordinary = full.filter(([id]) => !isBossOnlyPokemon(id));
  const pool = ordinary.length ? ordinary
    : Object.values(gen.tiers).flat().filter(([id]) => !isBossOnlyPokemon(id));
  if (!theme) return pool;
  const f = theme.ids ? pool.filter(([id]) => theme.ids.has(id))
    : pool.filter(([, t]) => theme.types.has(t));
  return f.length ? f : pool;
}

// ---- 3-stage journey: every region is ARRIVAL → CHALLENGE → LEGENDARY ----
const STAGES = 3;
const STAGE_NAMES = ['ARRIVAL', 'CHALLENGE', 'LEGENDARY'];
function regionIdx(lvl) { return Math.floor((lvl - 1) / STAGES) % SKIN.gens.length; }
function stageIdx(lvl) { return (lvl - 1) % STAGES; } // 0 arrival · 1 challenge · 2 boss
function genFor(level) { return SKIN.gens[regionIdx(level)]; }
function actIdx(lvl) { return Math.min(2, Math.floor(regionIdx(lvl) / 3)); }

// ---- CHEAT CODES (pause screen): grant any power-up combination. Using
// one marks the run G.cheated — best score won't be recorded that run.
const CHEAT_ITEMS = [
  { k: 'fire',  label: 'FIREBALL' },  { k: 'laser', label: 'LASER' },
  { k: 'wide',  label: 'WIDE' },      { k: 'slow',  label: 'SLOW-MO' },
  { k: 'multi', label: 'MULTIBALL' }, { k: 'star',  label: 'STAR' },
  { k: 'draco', label: 'DRACO' },     { k: 'magnet', label: 'MAGNET' },
  { k: '_shield', label: 'SHIELD +1', icon: 'shield' },
  { k: '_mega',   label: 'FULL MEGA', icon: 'mega' },
  { k: '_life',   label: '+1 LIFE',   icon: 'heart' },
  { k: '_element', label: 'ELEMENT',  icon: 'fairy' },
];

// ============================================================
//  ENEMY PROJECTILE LANGUAGE
// ============================================================
// Size, collision and interception are deliberately independent. A TITAN
// shot may fill a large part of the sky without owning an equally enormous
// invisible hitbox, and a charged player bolt can still cancel it in one hit.
// `threat` is consumed by Starfighter's attack director; a swarm and a single
// siege shot can therefore create very different spectacle at similar danger.
const SHOT_CLASSES = Object.freeze({
  // Small stays small in danger/collision terms, but eight visible pixels plus
  // a long tracer keeps a Caterpie stinger readable against every biome.
  micro:    { visualR: 8,  hitR: 3.5, threat: 0.25, interceptHP: 1, tail: 22 },
  standard: { visualR: 11, hitR: 7.5, threat: 1.0,  interceptHP: 1, tail: 24 },
  heavy:    { visualR: 24, hitR: 14,  threat: 2.5,  interceptHP: 2, tail: 34, heavy: true },
  massive:  { visualR: 46, hitR: 22,  threat: 4.5,  interceptHP: 3, tail: 48, heavy: true },
});

// Ordinary enemies inherit a readable silhouette from their type. Boss-only
// species override it below so their attacks can be recognised before the
// nameplate is read. These keys are renderer-native procedural sprites — no
// network assets and no per-frame gradient allocation.
const TYPE_PROJECTILE_KIND = Object.freeze({
  normal: 'pellet', fire: 'ember', water: 'droplet', electric: 'needle', grass: 'leaf',
  ice: 'crystal', fighting: 'fist', poison: 'toxic', ground: 'boulder', flying: 'feather',
  psychic: 'prism', bug: 'stinger', rock: 'boulder', ghost: 'wisp', dragon: 'comet',
  dark: 'crescent', steel: 'lance', fairy: 'star',
});

function projectileKindFor(id, type) {
  return SKIN.bossProjectileKind[id] || TYPE_PROJECTILE_KIND[type] || 'pellet';
}
// SPACE JUNKIE gauntlets are authored as 27 distinct arrival beats: one
// sentinel formation, one legendary entrance, and one mythical entrance per
// region. The keys are read by update.js for motion and render.js for the
// matching arena effect; they deliberately do not affect Breaker/Blaster.
const SENTINEL_ENTRANCE_STYLES = [
  'prism', 'stampede', 'monolith', 'orbit', 'swords', 'cocoon', 'totem', 'stormfront', 'shrine',
];
function gauntletEntranceName(style) { return SKIN.gauntletEntranceNames[style] || 'BOSS ARRIVAL'; }

// full region roster (unique, dex-ordered) — used by the Pokédex progress view
function regionRoster(g) {
  const ids = new Set();
  Object.values(g.tiers).flat().forEach(([id]) => ids.add(id));
  ids.add(g.boss.id);
  return [...ids].sort((a, b) => a - b);
}
function dexTotal() { return SKIN.gens.reduce((n, g) => n + regionRoster(g).length, 0); }

const spriteCache = {};
function getSprite(id, shiny) {
  // procedural skins bake their own drawables (same synchronous contract:
  // .complete / .naturalWidth are set on the returned canvas) and must
  // never touch the network — the PNG/remote path is pokemon-skin-only
  if (SKIN.spriteMaker) return SKIN.spriteMaker(id, shiny);
  const key = (shiny ? 's' : '') + id;
  if (!spriteCache[key]) {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // lets us render tinted silhouettes for the dex
    if (!shiny && id > 0) {
      img.src = `assets/sprites/${id}.png`;
      img.onerror = () => { img.onerror = null; img.src = `${SPRITE_REMOTE}${id}.png`; };
    } else {
      img.src = `${SPRITE_REMOTE}${shiny ? 'shiny/' : ''}${id}.png`;
    }
    spriteCache[key] = img;
  }
  return spriteCache[key];
}
// flat-tinted silhouette of a sprite — used for uncaught dex entries (dark navy)
// and for the distant Pokémon drifting through region skies (dusky tints).
const silCache = {};
function getSilhouette(id, color = '#141a33') {
  const key = id + '|' + color;
  if (silCache[key]) return silCache[key];
  const img = getSprite(id);
  if (!img.complete || !img.naturalWidth) return null;
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 96;
    const cc = c.getContext('2d');
    cc.drawImage(img, 0, 0, 96, 96);
    cc.globalCompositeOperation = 'source-in';
    cc.fillStyle = color;
    cc.fillRect(0, 0, 96, 96);
    silCache[key] = c;
    return c;
  } catch (e) { return null; } // tainted canvas fallback: caller draws a placeholder
}
function preloadGen(g) {
  Object.values(g.tiers).flat().forEach(([id]) => getSprite(id));
  getSprite(g.boss.id);
}
// (the preload CALL lives at the pokeworld.js tail — it warms the ACTIVE skin)

// ---- Pokédex (persistent collection, shinies tracked separately) ----
const DEX = new Set((v => Array.isArray(v) ? v : [])(loadStore(storeKey('dex'), '[]')));
const DEXS = new Set((v => Array.isArray(v) ? v : [])(loadStore(storeKey('dexs'), '[]')));
function dexRewardActive(key) {
  const r = SKIN.dexRewards.find(x => x.key === key);
  return !!r && DEX.size >= r.at;
}
function dexRewardAt(n) { return SKIN.dexRewards.find(r => r.at === n) || null; }
function nextDexReward() { return SKIN.dexRewards.find(r => DEX.size < r.at) || null; }
function addToDex(id, shiny) {
  const isNew = !DEX.has(id) || (shiny && !DEXS.has(id));
  DEX.add(id);
  saveStore(storeKey('dex'), [...DEX]);
  if (shiny) { DEXS.add(id); saveStore(storeKey('dexs'), [...DEXS]); }
  return isNew;
}

// per-stage-type STAGE MASTERY defaults — evaluated at stage clear from the
// balance ledger; used when the active skin has no authored objective set
// for a stage (see stageObjectives / SKIN.stageObjectiveSets).
const DEFAULT_OBJECTIVE_SETS = [
  [ // arrival stages
    { key: 'untouched', name: 'UNTOUCHED', desc: 'CLEAR WITHOUT TAKING A HIT',
      check: L => Object.values(L.dmgInBy).reduce((a, b) => a + b, 0) === 0 },
    { key: 'swift', name: 'SWIFT CLEAR', desc: 'CLEAR IN UNDER 90 SECONDS', ace: true,
      check: L => L.t > 0 && L.t < 90 },
  ],
  [ // challenge stages
    { key: 'coolhands', name: 'COOL HANDS', desc: 'CLEAR WITHOUT OVERHEATING', check: L => L.overheats === 0 },
    { key: 'interceptor', name: 'INTERCEPTOR', desc: 'SHOOT DOWN 6 ENEMY SHOTS', ace: true,
      check: L => (L.intercepts || 0) >= 6 },
  ],
  [ // legendary stages
    { key: 'nokd', name: 'IRON WILL', desc: 'WIN THE GAUNTLET WITHOUT A KNOCKOUT', check: L => !L.knockout },
    { key: 'flawless', name: 'FLAWLESS DUEL', desc: 'TAKE NO HITS IN THE GAUNTLET', ace: true,
      check: L => Object.values(L.dmgInBy).reduce((a, b) => a + b, 0) === 0 },
  ],
];
function stageObjectives(lvl) {
  return SKIN.stageObjectiveSets[regionIdx(lvl) + ':' + stageIdx(lvl)] || DEFAULT_OBJECTIVE_SETS[stageIdx(lvl)];
}

function stageFlavor(lvl) { return SKIN.stageFlavor[regionIdx(lvl) + ':' + stageIdx(lvl)] || null; }
// (ENCOUNTER DIRECTOR region grammar appended below — see REGION_GRAMMAR)

// ============================================================
// ENCOUNTER DIRECTOR (Milestone 3) — every non-boss STARFIGHTER stage runs
// an authored BEAT SCRIPT, giving it pacing and identity beyond enemy counts.
// A beat fires ONCE when its trigger is met — `p` (alive/baseline progress
// threshold) or `afterPrev` (seconds after the previous beat fired) — and
// runs a typed action (runBeat, update.js). Each region has its own grammar,
// so regions read differently; the director owns a live THREAT MULTIPLIER so
// a recovery beat is a real breather and an escalation is a real spike,
// never blind stacking. Boss stages keep their gauntlet choreography.
const REGION_GRAMMAR = [
  // KANTO — the teaching region: a reward flock, then a warned raid with a
  // genuine breather. Gentle and legible, one idea at a time.
  { arrival: [{ p: 0.5, type: 'bonusFlock' }],
    challenge: [{ p: 0.55, type: 'raid' }, { afterPrev: 4.4, type: 'recovery' }] },
  // JOHTO — the hunt: the beasts BOLT on arrival, and the challenge presses
  // through a raid, a breather, then a relentless final push.
  { arrival: [{ p: 0.5, type: 'surge' }],
    challenge: [{ p: 0.55, type: 'raid' }, { afterPrev: 4.0, type: 'recovery' }, { p: 0.2, type: 'finalPush' }] },
  // HOENN — weather country: squalls. The arrival gusts early and again
  // late; the challenge keeps the proven raid→breather shape because the
  // MIGRATION objective owns its drama (never stack blind danger on it).
  { arrival: [{ p: 0.65, type: 'surge' }, { afterPrev: 6.5, type: 'surge' }],
    challenge: [{ p: 0.5, type: 'raid' }, { afterPrev: 4.2, type: 'recovery' }] },
  // SINNOH — the cold climb: the ESCORT owns the arrival (no beats — the
  // traveler is the story). The challenge is mountain pressure: two raids
  // rolling down like avalanche fronts with one thin ledge between.
  { arrival: [],
    challenge: [{ p: 0.6, type: 'raid' }, { afterPrev: 4.6, type: 'recovery' }, { p: 0.3, type: 'raid' }] },
  // UNOVA — the city that never sleeps: traffic surges into a rush-hour
  // raid, and the last block is a hard commute all the way down.
  { arrival: [{ p: 0.55, type: 'surge' }],
    challenge: [{ p: 0.6, type: 'surge' }, { afterPrev: 3.6, type: 'raid' }, { p: 0.22, type: 'finalPush' }] },
  // KALOS — beauty first: the arrival offers a bonus flock over radiant
  // skies; the challenge stays default-shaped because DEFEND THE RELAY
  // supplies its own split-attention pressure.
  { arrival: [{ p: 0.5, type: 'bonusFlock' }],
    challenge: [{ p: 0.5, type: 'raid' }, { afterPrev: 4.2, type: 'recovery' }] },
  // ALOLA — island time: the arrival gives a true breather mid-wave (the
  // welcome), then the trial turns serious — a raid that surges before
  // it ends. Hospitality first, trials second.
  { arrival: [{ p: 0.55, type: 'recovery' }],
    challenge: [{ p: 0.6, type: 'raid' }, { afterPrev: 3.8, type: 'surge' }, { afterPrev: 5.0, type: 'recovery' }] },
  // GALAR — the darkest day looms: stadium pressure in waves — raid,
  // brief rope-a-dope breather, raid again, and a championship finish.
  { arrival: [{ p: 0.5, type: 'surge' }],
    challenge: [{ p: 0.62, type: 'raid' }, { afterPrev: 3.4, type: 'recovery' }, { afterPrev: 5.5, type: 'raid' }, { p: 0.18, type: 'finalPush' }] },
  // PALDEA — the frontier bares its teeth on sight: an early raid on
  // arrival, then the challenge runs the full journey in miniature —
  // surge, one last breath, and everything at once.
  { arrival: [{ p: 0.62, type: 'raid' }],
    challenge: [{ p: 0.58, type: 'surge' }, { afterPrev: 4.0, type: 'recovery' }, { p: 0.24, type: 'finalPush' }] },
];
// Any region without an authored grammar gets a calm arrival and a single
// escalation → recovery challenge arc — never an empty stage, pending each
// region's Milestone 9 authoring pass.
const REGION_GRAMMAR_DEFAULT = {
  arrival: [],
  challenge: [{ p: 0.5, type: 'raid' }, { afterPrev: 4.2, type: 'recovery' }],
};
function encounterScript(lvl) {
  const g = REGION_GRAMMAR[regionIdx(lvl)] || REGION_GRAMMAR_DEFAULT;
  return (stageIdx(lvl) === 0 ? g.arrival : g.challenge) || [];
}
function encounterObjective(lvl) { return SKIN.encounterObjectives[regionIdx(lvl) + ':' + stageIdx(lvl)] || null; }

// ---- discipline lexicon (Round S2): a skin may voice the six path names
// per class discipline (SKIN.treeLexicon). Node keys/effects never change —
// this is presentation only; skins without a lexicon read PATHS[k].name.
// The 18 type KEYS are engine vocabulary (storage-stable, shared). What the
// player READS is skin voice: a skin may rename every type (SKIN.typeNames —
// aetherfall's aspect lexicon: EMBER/TIDE/GROVE/…) and the word "TYPE" itself
// (SKIN.strings.typeWord — "ASPECT" on aetherfall). No table → the raw
// uppercased key, which IS the pokemon presentation (bit-identity preserved).
function typeLabel(t) {
  if (!t) return 'NEUTRAL';
  return (SKIN.typeNames && SKIN.typeNames[t]) || t.toUpperCase();
}
function typeWord() { return (SKIN.strings && SKIN.strings.typeWord) || 'TYPE'; }

// ── THE COPY LEXICON ───────────────────────────────────────────────────────
// Same contract as typeLabel, one level up: a skin may rename a whole PHRASE
// of shared copy. `SKIN.lexicon` is an ORDERED [regex, replacement] list —
// order is load-bearing, because the long authored phrases must fire before
// the bare word (so "KILLS CHARGE MEGA" becomes "KILLS BUILD SURGE", not the
// ungrammatical "KILLS CHARGE SURGE").
//
// TWO TRAPS, both real, both why this is a phrase table and not a replace():
//   1. CHARGE is a DIFFERENT SYSTEM (the held weapon shot). Only the rules
//      that also match MEGA may touch the word — "A FULL CHARGE MAY CONSUME
//      50% BANKED MEGA" must keep its CHARGE and lose only its MEGA.
//   2. Substrings. Every rule is \b-anchored so the OMEGA SERAPH (an
//      aetherfall boss) and Meganium never get rewritten mid-word.
// No lexicon → identity, which IS the pokemon presentation (bit-identity).
function lex(s) {
  const rules = SKIN.lexicon;
  if (!rules || typeof s !== 'string') return s;
  for (const [re, to] of rules) s = s.replace(re, to);
  return s;
}
// Shared copy lives in frozen-at-load engine tables, so the skin rewrites them
// ONCE at boot rather than every consumer remembering to call lex(). Only
// COPY keys are walked — never `key`/`k`/`icon`/`family`, which are engine
// identifiers that must survive verbatim (renaming one forks the runtime).
const LEX_COPY_KEYS = ['name', 'desc', 'sdesc', 'summary', 'role', 'visual',
  'ready', 'limit', 'label', 'tell'];
function applyLexicon(roots) {
  if (!SKIN.lexicon) return;
  const seen = new Set();
  const walk = (o) => {
    if (!o || typeof o !== 'object' || seen.has(o)) return;
    seen.add(o);
    if (Array.isArray(o)) { for (const v of o) walk(v); return; }
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (typeof v === 'string') {
        if (LEX_COPY_KEYS.includes(k)) { const n = lex(v); if (n !== v) o[k] = n; }
      } else if (Array.isArray(v) && v.every(x => typeof x === 'string')) {
        // string arrays are always copy (starter-kit tier lines)
        for (let i = 0; i < v.length; i++) v[i] = lex(v[i]);
      } else walk(v);
    }
  };
  for (const r of roots) walk(r);
}
// codex gallery: locate a recorded unit's home region, type and tier
function dexEntryInfo(id) {
  for (const g of SKIN.gens) {
    for (const tier of [1, 2, 3]) {
      const hit = (g.tiers[tier] || []).find(([tid]) => tid === id);
      if (hit) return { gen: g, t: hit[1], tier };
    }
  }
  return null;
}
function skinPathName(k) {
  const lex = SKIN.treeLexicon && SKIN.treeLexicon[k];
  if (!lex) return (PATHS[k] || {}).name || k.toUpperCase();
  const cls = SKIN.classes && SKIN.classes[(G && G.starter) || SETTINGS.starter];
  return lex[cls ? cls.d : 'magitech'] || PATHS[k].name;
}
