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
  laser:  { key: 'laser',  icon: 'laser',  name: 'LASERS',          desc: 'PADDLE AUTO-FIRES LASERS',   color: '#ffd54f' },
  multi:  { key: 'multi',  icon: 'multi',  name: 'MULTIBALL',      desc: 'EVERY BALL SPLITS IN THREE', color: '#ab47bc' },
  wide:   { key: 'wide',   icon: 'wide',   name: 'WIDE PADDLE',    desc: 'PADDLE GROWS LARGER',        color: '#42a5f5' },
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
  desc: 'ONE OF THREE PIECES THAT REWRITES KANTO\'S FINAL ROUND', color: '#d780ff',
};
// ---- starter Pokémon: one three-stage partner line for every battle type.
// Each line owns a distinct, tiered gameplay hook. Pikachu is the deliberate
// exception to the three-form rule: it starts as Pikachu, evolves into an
// overpowered Raichu in region 5, then its OVERDRIVE reaches tier III later.
function starterLine(ids, names, ability, blurb, tiers, mods = {}, modeCopy = null) {
  const shared = { ability, blurb, tiers };
  return { ids, names, ability, blurb, tiers, mods,
    modeCopy: modeCopy || { classic: shared, blaster: shared, junkie: shared } };
}
const STARTER_MON = {
  normal: starterLine([137, 233, 474], ['PORYGON', 'PORYGON2', 'PORYGON-Z'], 'ADAPTABILITY',
    'MORE DAMAGE · MORE SCORE',
    ['+8% DAMAGE · +5% SCORE', '+15% DAMAGE · +10% SCORE', '+25% DAMAGE · +20% SCORE'],
    { damage: [1.08, 1.15, 1.25], score: [1.05, 1.1, 1.2] }),
  fire: starterLine([4, 5, 6], ['CHARMANDER', 'CHARMELEON', 'CHARIZARD'], 'BLAZE',
    'RETURNS IGNITE · FIRE DAMAGE',
    ['RETURNS IGNITE 1 HIT · +5% DAMAGE', 'IGNITES 2 HITS · +10% DAMAGE', 'IGNITES 3 HITS · +15% DAMAGE'],
    { damage: [1.05, 1.1, 1.15] }, {
      classic: { ability: 'BLAZE', blurb: 'RETURNS IGNITE THE BALL', tiers: [
        'PADDLE RETURNS IGNITE THE NEXT HIT · +5% DAMAGE',
        'PADDLE RETURNS IGNITE THE NEXT 2 HITS · +10% DAMAGE',
        'PADDLE RETURNS IGNITE THE NEXT 3 HITS · +15% DAMAGE'] },
      blaster: { ability: 'BLAZE', blurb: 'FIRE-TYPE DAMAGE', tiers: ['+5% ALL DAMAGE', '+10% ALL DAMAGE', '+15% ALL DAMAGE'] },
      junkie: { ability: 'BLAZE PILOT', blurb: 'FIRE ATTACKS · MORE DAMAGE', tiers: ['+5% ALL DAMAGE', '+10% ALL DAMAGE', '+15% ALL DAMAGE'] },
    }),
  water: starterLine([7, 8, 9], ['SQUIRTLE', 'WARTORTLE', 'BLASTOISE'], 'TORRENT',
    'COOLER SHOTS · RETURN SHIELDS',
    ['20% COOLER · SHIELD EVERY 5 RETURNS', '24% COOLER · SHIELD EVERY 4 RETURNS', '28% COOLER · SHIELD EVERY 3 RETURNS'],
    { heat: [0.8, 0.76, 0.72] }, {
      classic: { ability: 'TORRENT', blurb: 'COOLER SHOTS · RETURN SHIELDS', tiers: [
        'SHOTS BUILD 20% LESS HEAT · SHIELD EVERY 5 RETURNS',
        'SHOTS BUILD 24% LESS HEAT · SHIELD EVERY 4 RETURNS',
        'SHOTS BUILD 28% LESS HEAT · SHIELD EVERY 3 RETURNS'] },
      blaster: { ability: 'TORRENT', blurb: 'COOLER SHOTS · WATER DEFENSE', tiers: [
        'SHOTS BUILD 20% LESS HEAT · WATER-TYPE DEFENSE',
        'SHOTS BUILD 24% LESS HEAT · WATER-TYPE DEFENSE',
        'SHOTS BUILD 28% LESS HEAT · WATER-TYPE DEFENSE'] },
      junkie: { ability: 'TORRENT PILOT', blurb: 'WATER ATTACKS · COOLER SHOTS', tiers: [
        'WATER OFFENSE/DEFENSE · SHOTS BUILD 20% LESS HEAT',
        'WATER OFFENSE/DEFENSE · SHOTS BUILD 24% LESS HEAT',
        'WATER OFFENSE/DEFENSE · SHOTS BUILD 28% LESS HEAT'] },
    }),
  electric: starterLine([25, 26, 26], ['PIKACHU', 'RAICHU', 'RAICHU'], 'OVERDRIVE',
    'OVERPOWERED DAMAGE · CHAIN LIGHTNING',
    ['+50% DAMAGE · 35% MEGA · CHAIN EVERY 6 HITS', '+80% DAMAGE · 55% MEGA · CHAIN 2', '+120% DAMAGE · 75% MEGA · CHAIN 3'],
    { damage: [1.5, 1.8, 2.2], megaStart: [0.35, 0.55, 0.75], megaPassive: [0.012, 0.02, 0.03],
      fireRate: [0.82, 0.7, 0.58], chainEvery: [6, 5, 4], chainTargets: [1, 2, 3] }),
  grass: starterLine([1, 2, 3], ['BULBASAUR', 'IVYSAUR', 'VENUSAUR'], 'OVERGROWTH',
    'MORE DROPS · EASIER PICKUPS',
    ['+20% DROPS · EXPANDED CATCH', '+35% DROPS · WIDER CATCH', '+50% DROPS · WIDEST CATCH'],
    { drop: [1.2, 1.35, 1.5], catchReach: [16, 22, 28] }),
  ice: starterLine([363, 364, 365], ['SPHEAL', 'SEALEO', 'WALREIN'], 'SNOW WARNING',
    'KOS TRIGGER SLOW-MO',
    ['EVERY 10 KOS SLOWS TIME 3s', 'EVERY 8 KOS SLOWS TIME 4s', 'EVERY 6 KOS SLOWS TIME 5s'],
    { chillEvery: [10, 8, 6], chillDur: [3, 4, 5] }),
  fighting: starterLine([66, 67, 68], ['MACHOP', 'MACHOKE', 'MACHAMP'], 'GUTS',
    'MISSING HP BOOSTS DAMAGE',
    ['+16% DAMAGE PER MISSING HP', '+24% PER MISSING HP · +20% VS BOSSES', '+34% PER MISSING HP · +30% VS BOSSES'],
    { guts: [0.16, 0.24, 0.34], bossDamage: [1, 1.2, 1.3] }),
  poison: starterLine([32, 33, 34], ['NIDORAN', 'NIDORINO', 'NIDOKING'], 'CORROSION',
    'REPEATED HITS MELT ARMOR',
    ['REPEATED HITS STACK +12% DAMAGE', 'STACKS +20% DAMAGE', 'STACKS +30% DAMAGE'],
    { corrosion: [0.12, 0.2, 0.3] }),
  ground: starterLine([111, 112, 464], ['RHYHORN', 'RHYDON', 'RHYPERIOR'], 'SAND FORCE',
    'CRUSH ARMOR · TRIGGER QUAKES',
    ['+25% VS ARMOR/BOSSES · QUAKE EVERY 10 HITS', '+40% · QUAKE EVERY 8', '+60% · QUAKE EVERY 6'],
    { armorDamage: [1.25, 1.4, 1.6], quakeEvery: [10, 8, 6] }),
  flying: starterLine([16, 17, 18], ['PIDGEY', 'PIDGEOTTO', 'PIDGEOT'], 'TAILWIND',
    'WIDER RIG · FASTER MOVEMENT',
    ['+12% WIDTH · +20% FOLLOW', '+20% WIDTH · +35% FOLLOW', '+30% WIDTH · +50% FOLLOW'],
    { paddle: [1.12, 1.2, 1.3], follow: [1.2, 1.35, 1.5], fireRate: [0.95, 0.9, 0.82] }),
  psychic: starterLine([63, 64, 65], ['ABRA', 'KADABRA', 'ALAKAZAM'], 'FORESIGHT',
    'GUARANTEED PRECISION CRITS',
    ['EVERY 8TH HIT DEALS 1.75×', 'EVERY 6TH HIT DEALS 2×', 'EVERY 5TH HIT DEALS 2.25×'],
    { critEvery: [8, 6, 5], critMul: [1.75, 2, 2.25] }),
  bug: starterLine([10, 12, 12], ['CATERPIE', 'BUTTERFREE', 'BUTTERFREE'], 'SWARM',
    'KOS SUMMON EXTRA ATTACKS',
    ['EVERY 9 KOS HITS 1 EXTRA TARGET', 'EVERY 7 KOS HITS 2', 'EVERY 5 KOS HITS 3'],
    { swarmEvery: [9, 7, 5], swarmTargets: [1, 2, 3] }),
  rock: starterLine([246, 247, 248], ['LARVITAR', 'PUPITAR', 'TYRANITAR'], 'STURDY',
    'EXTRA MAXIMUM HP', ['START WITH +1 HP', 'START WITH +2 HP', 'START WITH +3 HP'],
    { bonusHp: [1, 2, 3] }),
  ghost: starterLine([92, 93, 94], ['GASTLY', 'HAUNTER', 'GENGAR'], 'PHASE SHIFT',
    'CHANCE TO IGNORE DAMAGE', ['15% DODGE CHANCE', '22% DODGE CHANCE', '30% DODGE CHANCE'],
    { dodge: [0.15, 0.22, 0.3] }),
  dragon: starterLine([147, 148, 149], ['DRATINI', 'DRAGONAIR', 'DRAGONITE'], 'DRAGONHEART',
    'START CHARGED · LONGER MEGA',
    ['START 20% MEGA · +1s DURATION', 'START 35% · +2s', 'START 50% · +3s'],
    { megaStart: [0.2, 0.35, 0.5], megaPassive: [0.008, 0.012, 0.018], megaDur: [1, 2, 3] }),
  dark: starterLine([551, 552, 553], ['SANDILE', 'KROKOROK', 'KROOKODILE'], 'MOXIE',
    'COMBOS AMPLIFY DAMAGE/SCORE',
    ['COMBOS ADD +1.5% DAMAGE EACH', '+2.5% DAMAGE EACH', '+4% DAMAGE EACH'],
    { comboDamage: [0.015, 0.025, 0.04], comboScore: [0.01, 0.015, 0.025] }),
  steel: starterLine([81, 82, 462], ['MAGNEMITE', 'MAGNETON', 'MAGNEZONE'], 'IRON DEFENSE',
    'START WITH SHIELDS', ['START WITH 1 SHIELD', 'START WITH 2 SHIELDS', 'START WITH 3 SHIELDS'],
    { shieldStart: [1, 2, 3] }),
  fairy: starterLine([175, 176, 468], ['TOGEPI', 'TOGETIC', 'TOGEKISS'], 'WISH',
    'MORE POTIONS · EASIER CATCHES',
    ['POTION PITY 7 · +20% CATCHES', 'PITY 5 · +35% CATCHES', 'PITY 4 · +55% CATCHES'],
    { healPity: [7, 5, 4], healChance: [1.25, 1.5, 1.8], catch: [1.2, 1.35, 1.55] }),
};

// Returns copy that describes what the starter actually does in the selected
// mode. `tier` is one-based (1–3); invalid modes fall back to classic.
function starterModeCopy(starter, mode = 'classic', tier = 1) {
  const mon = STARTER_MON[starter];
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
  const mon = STARTER_MON[G.starter];
  const value = mon && mon.mods && mon.mods[key];
  if (value == null) return fallback;
  return Array.isArray(value) ? (value[Math.max(0, Math.min(value.length - 1, G.starterLvl - 1))] ?? fallback) : value;
}
function starterPerk() { return STARTER_MON[G.starter]?.ability || null; }

// ---- species-aware MOTION PROFILES (type is only the fallback) ----
// A ground dragon should not flap; a serpent should undulate; a boulder
// should barely bob. Ids listed here override the type-derived gait.
const MOTION_PROFILES = {
  serpentine: [23, 24, 95, 130, 147, 148, 149, 206, 230, 336, 350, 384, 634, 635, 691, 704, 705, 706],
  heavy: [74, 75, 76, 143, 208, 306, 376, 377, 464, 486, 68, 112, 232, 248, 526],
  biped: [104, 105, 106, 107, 122, 125, 126, 236, 237, 532, 533, 534, 619, 620],
  quadruped: [58, 59, 77, 78, 111, 128, 133, 134, 135, 136, 155, 156, 157, 209, 210, 234, 261, 262, 447, 448],
};
const MOTION_BY_ID = {};
for (const [prof, ids] of Object.entries(MOTION_PROFILES)) for (const id of ids) MOTION_BY_ID[id] = prof;
// gait families by TYPE — the fallback when no species override exists
const GAIT_FLAP_T = new Set(['flying', 'dragon', 'bug']);
const GAIT_SWIM_T = new Set(['water', 'ice']);
const GAIT_HOVER_T = new Set(['ghost', 'psychic', 'fairy', 'poison']);
function motionProfile(poke) {
  const o = MOTION_BY_ID[poke.id];
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
  arsenal: { name: 'VOLLEY', role: 'VOLUME FIRE', crole: 'BALL CONTROL → BLASTER', family: 'offense', color: '#80d8ff',
    summary: 'RATE OF FIRE · COVER MORE LANES', tell: 'CYAN MULTI-BARREL RIG', tiers: [
    { key: 'coolant',   icon: 'slow',   name: 'COOLANT', cname: 'CONTROL CORE',
      desc: 'BALL SPEED CAP −8% · EASIER RETURNS', sdesc: 'BLASTER HEAT PER SHOT −25%',
      visual: 'CYAN COOLANT HALO AROUND THE WEAPON CORE' },
    { key: 'intercept', icon: 'target', name: 'INTERCEPTOR', cname: 'RALLY GUARD',
      desc: 'RALLY BARRIER +1 CHARGE', sdesc: 'BOLTS DESTROY +1 ENEMY SHOT BEFORE FADING',
      visual: 'CYAN TARGETING PRONGS FRAME THE MUZZLE' },
    { key: 'twin',      icon: 'laser',  name: 'TWIN CANNON',
      desc: 'PERMANENT BLASTER UNLOCK · FIRE TWO BOLTS · 60% DAMAGE',
      sdesc: 'FIRE TWO BOLTS · EACH DEALS 60% DAMAGE', visual: 'TWO SEPARATE CYAN FIRING POINTS' },
    { key: 'hyper',     icon: 'swift',  name: 'HYPER CYCLE', desc: 'FIRES 20% FASTER · HEAT PER SHOT −15%',
      visual: 'CYCLER FINS OPEN BESIDE THE TWIN MUZZLES' },
  ]},
  impact: { name: 'IMPACT', role: 'HEAVY & CHARGE', crole: 'BALL POWER → BLASTER', family: 'offense', color: '#ff8a65',
    summary: 'FEWER, HEAVIER SHOTS · CHARGED HITS DETONATE', tell: 'AMBER HEAVY-BOLT CORE', tiers: [
    { key: 'heavy',   icon: 'target', name: 'HEAVY BOLT', cname: 'HEAVY CORE',
      desc: 'BALL 18% LARGER · BRICK DAMAGE +15%',
      sdesc: 'BOLTS 30% WIDER · DAMAGE +15% · CHARGE BUILDS 35% FASTER',
      visual: 'AMBER HEAVY-BORE RING AROUND THE MUZZLE' },
    { key: 'demo',    icon: 'fire',   name: 'SPLASH CHARGE', cname: 'IMPACT CHARGE',
      desc: 'BALL BRICK DAMAGE +25%', sdesc: 'CHARGED SHOTS DETONATE — SPLASH DAMAGE AROUND THE HIT',
      visual: 'TWO AMBER CHARGE MOTES ORBIT THE HEAVY BORE' },
    { key: 'pulse',   icon: 'laser',  name: 'PULSE ROUND',
      desc: 'PERMANENT BLASTER UNLOCK · EVERY 5TH VOLLEY PIERCES 2 TARGETS',
      sdesc: 'EVERY 5TH VOLLEY PIERCES 2 TARGETS', visual: 'FOUR AMBER PULSE NOTCHES MARK THE BARREL' },
    { key: 'impactX', icon: 'star',   name: 'NOVA ROUND',    desc: 'PULSE EVERY 4TH VOLLEY · 2× DMG · BIGGER CHARGE BLAST',
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
    summary: 'CHARGE MEGA OFTEN · CASH IN A POWER WINDOW', tell: 'GOLD OVERDRIVE CORE', tiers: [
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
// ---- SPACE JUNKIE held items: the SAME skill tree, re-skinned as the
// Pokémon items your pilot would actually hold — one per path tier, each
// appearing as a badge orbiting the ship when earned.
const JUNKIE_ITEMS = {
  arsenal: ['MYSTIC WATER', 'SCOPE LENS', 'CHOICE SPECS', 'QUICK CLAW'],
  impact:  ['MUSCLE BAND', 'BLAST SEED', 'RAZOR CLAW', 'LOADED DICE'],
  prism:   ['PRISM SCALE', 'WISE GLASSES', 'CELL BATTERY', 'LEGEND PLATE'],
  aegis:   ['FOCUS BAND', 'EVIOLITE', 'LEFTOVERS', 'ASSAULT VEST'],
  surge:   ['POWER HERB', 'METRONOME', 'CHARCOAL', 'MEGA STONE'],
  bond:    ['MAGNET', 'SOOTHE BELL', 'AMULET COIN', 'MAX REVIVE'],
};
function junkieTierName(pathKey, tierIdx) {
  const tier = PATHS[pathKey].tiers[tierIdx];
  if (G.mode === 'junkie' && JUNKIE_ITEMS[pathKey] && JUNKIE_ITEMS[pathKey][tierIdx]) {
    return JUNKIE_ITEMS[pathKey][tierIdx];
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
function tierTags(pathKey, tierIdx) {
  const family = PATHS[pathKey].family;
  if (family === 'offense') {
    if (G.mode !== 'classic') return tierIdx === 0 ? ['BLASTER', 'CHARGE'] : ['BLASTER'];
    return tierIdx >= 2 ? ['BALL', 'BLASTER'] : ['BALL'];
  }
  if (family === 'defense') return ['DEFENSE'];
  if (family === 'element') return ['TYPE'];
  if (family === 'tempo') return ['MEGA'];
  return ['ITEM', 'SCORE'];
}
function tierSynergy(pathKey, tierIdx) {
  const family = PATHS[pathKey].family;
  if (family === 'offense' && G.mode === 'classic' && tierIdx === 2) return 'SYNERGY: YOUR BALL UNLOCKS SUPPORT FIRE';
  if (family === 'offense' && pathLvl('surge')) return 'SYNERGY: MORE HITS CHARGE MEGA FASTER';
  if (family === 'defense' && pathLvl('bond')) return 'SYNERGY: SAFER ITEM COLLECTION';
  if (family === 'element' && G.starter) return 'SYNERGY: AMPLIFIES YOUR PARTNER TYPE';
  if (family === 'tempo' && PATH_KEYS.some(k => PATHS[k].family === 'offense' && pathLvl(k))) return 'SYNERGY: ATTACKS FILL THE MEGA RING';
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
];
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

// ============================================================
//  GENERATION JOURNEY — roster, boss & region theme per gen
// ============================================================
const GENS = [
  { name: 'KANTO', scene: 'hills',
    sky: ['#081226', '#10254a', '#16324a'], land: ['#0c2e22', '#0a2118', '#06140f'], accent: '#7ee08a',
    boss: { id: 150, n: 'Mewtwo', t: 'psychic' },
    gauntlet: { subs: [[144,'ice'],[145,'electric'],[146,'fire']], myth: [151,'psychic'] },
    tiers: {
      1: [[16,'flying'],[19,'normal'],[10,'bug'],[41,'poison'],[129,'water'],[43,'grass'],[60,'water'],[74,'rock'],[133,'normal'],[25,'electric'],[7,'water'],[4,'fire'],[1,'grass'],[39,'fairy'],[54,'water'],[92,'ghost'],[52,'normal'],[23,'poison'],[109,'poison'],[35,'fairy']],
      2: [[17,'flying'],[8,'water'],[5,'fire'],[2,'grass'],[64,'psychic'],[93,'ghost'],[67,'fighting'],[61,'water'],[26,'electric'],[75,'rock'],[53,'normal'],[24,'poison'],[110,'poison'],[36,'fairy']],
      3: [[6,'fire'],[9,'water'],[3,'grass'],[65,'psychic'],[94,'ghost'],[68,'fighting'],[130,'water'],[149,'dragon'],[143,'normal'],[144,'ice'],[145,'electric'],[146,'fire']],
    } },
  { name: 'JOHTO', scene: 'pagoda',
    sky: ['#140d26', '#2a1a4a', '#3a2348'], land: ['#241433', '#1a0e26', '#100818'], accent: '#c79bff',
    boss: { id: 249, n: 'Lugia', t: 'psychic' },
    gauntlet: { subs: [[243,'electric'],[244,'fire'],[245,'water']], myth: [251,'grass'] },
    tiers: {
      1: [[152,'grass'],[155,'fire'],[158,'water'],[161,'normal'],[163,'flying'],[167,'bug'],[179,'electric'],[183,'water'],[187,'grass'],[194,'water'],[209,'fairy'],[218,'fire'],[220,'ice'],[228,'dark'],[231,'ground'],[246,'rock']],
      2: [[153,'grass'],[156,'fire'],[159,'water'],[180,'electric'],[176,'fairy'],[196,'psychic'],[197,'dark'],[198,'dark'],[210,'fairy'],[247,'rock']],
      3: [[154,'grass'],[157,'fire'],[160,'water'],[181,'electric'],[169,'poison'],[229,'dark'],[232,'ground'],[230,'dragon'],[248,'rock'],[212,'steel'],[214,'bug'],[227,'steel']],
    } },
  { name: 'HOENN', scene: 'waves',
    sky: ['#04182b', '#0a2f4d', '#0d4a5e'], land: ['#06283d', '#04202f', '#031622'], accent: '#5ad7d2',
    boss: { id: 384, n: 'Rayquaza', t: 'dragon' },
    gauntlet: { subs: [[377,'rock'],[378,'ice'],[379,'steel']], myth: [385,'psychic'] },
    tiers: {
      1: [[252,'grass'],[255,'fire'],[258,'water'],[261,'dark'],[263,'normal'],[265,'bug'],[280,'psychic'],[285,'grass'],[287,'normal'],[304,'steel'],[309,'electric'],[322,'fire'],[363,'ice'],[371,'dragon'],[278,'water'],[300,'normal']],
      2: [[253,'grass'],[256,'fire'],[259,'water'],[281,'psychic'],[286,'grass'],[305,'steel'],[310,'electric'],[323,'fire'],[364,'ice'],[372,'dragon']],
      3: [[254,'grass'],[257,'fire'],[260,'water'],[282,'psychic'],[306,'steel'],[330,'dragon'],[373,'dragon'],[376,'steel'],[350,'water'],[359,'dark'],[334,'dragon']],
    } },
  { name: 'SINNOH', scene: 'mountain',
    sky: ['#0a1126', '#15234d', '#23365e'], land: ['#1b2a4a', '#131f38', '#0c1426'], accent: '#9fb8ff',
    boss: { id: 483, n: 'Dialga', t: 'dragon' },
    gauntlet: { subs: [[480,'psychic'],[481,'psychic'],[482,'psychic']], myth: [491,'dark'] },
    tiers: {
      1: [[387,'grass'],[390,'fire'],[393,'water'],[396,'flying'],[399,'normal'],[403,'electric'],[406,'grass'],[427,'normal'],[431,'normal'],[434,'poison'],[436,'steel'],[447,'fighting'],[449,'ground'],[459,'ice'],[453,'poison'],[418,'water']],
      2: [[388,'grass'],[391,'fire'],[394,'water'],[397,'flying'],[404,'electric'],[426,'ghost'],[428,'normal'],[444,'dragon'],[448,'fighting'],[454,'poison']],
      3: [[389,'grass'],[392,'fire'],[395,'water'],[398,'flying'],[405,'electric'],[407,'grass'],[445,'dragon'],[461,'dark'],[462,'electric'],[468,'fairy'],[473,'ice'],[466,'electric']],
    } },
  { name: 'UNOVA', scene: 'skyline',
    sky: ['#0d0d1a', '#1a1a33', '#26264d'], land: ['#15152b', '#0f0f20', '#090914'], accent: '#ffd166',
    boss: { id: 644, n: 'Zekrom', t: 'electric' },
    gauntlet: { subs: [[638,'steel'],[639,'rock'],[640,'grass']], myth: [494,'fire'] },
    tiers: {
      1: [[495,'grass'],[498,'fire'],[501,'water'],[504,'normal'],[506,'normal'],[509,'dark'],[519,'flying'],[522,'electric'],[524,'rock'],[527,'psychic'],[543,'bug'],[551,'ground'],[570,'dark'],[572,'normal'],[607,'ghost'],[610,'dragon']],
      2: [[496,'grass'],[499,'fire'],[502,'water'],[507,'normal'],[523,'electric'],[552,'ground'],[571,'dark'],[608,'ghost'],[611,'dragon'],[525,'rock']],
      3: [[497,'grass'],[500,'fire'],[503,'water'],[530,'ground'],[534,'fighting'],[553,'ground'],[609,'ghost'],[612,'dragon'],[635,'dark'],[637,'bug'],[628,'flying'],[625,'dark']],
    } },
  { name: 'KALOS', scene: 'tower',
    sky: ['#160d22', '#321a40', '#4a2440'], land: ['#2a1533', '#1d0e24', '#120818'], accent: '#ff9ecb',
    boss: { id: 717, n: 'Yveltal', t: 'dark' },
    gauntlet: { subs: [[718,'dragon']], myth: [719,'fairy'] },
    tiers: {
      1: [[650,'grass'],[653,'fire'],[656,'water'],[659,'normal'],[661,'flying'],[664,'bug'],[667,'fire'],[669,'fairy'],[672,'grass'],[674,'fighting'],[677,'psychic'],[679,'steel'],[686,'dark'],[694,'electric'],[708,'ghost'],[712,'ice']],
      2: [[651,'grass'],[654,'fire'],[657,'water'],[662,'flying'],[675,'fighting'],[680,'steel'],[705,'dragon'],[700,'fairy'],[695,'electric'],[709,'ghost']],
      3: [[652,'grass'],[655,'fire'],[658,'water'],[663,'fire'],[681,'steel'],[706,'dragon'],[697,'rock'],[715,'dragon'],[713,'ice'],[701,'fighting'],[671,'fairy']],
    } },
  { name: 'ALOLA', scene: 'palms',
    sky: ['#1a0d26', '#40204d', '#6e3640'], land: ['#2e1733', '#1f0f24', '#120818'], accent: '#ffb74d',
    boss: { id: 792, n: 'Lunala', t: 'psychic' },
    gauntlet: { subs: [[785,'electric'],[786,'psychic'],[787,'grass']], myth: [802,'fighting'] },
    tiers: {
      1: [[722,'grass'],[725,'fire'],[728,'water'],[731,'flying'],[734,'normal'],[736,'bug'],[744,'rock'],[761,'grass'],[764,'fairy'],[767,'bug'],[769,'ghost'],[775,'normal'],[779,'psychic'],[781,'ghost'],[782,'dragon'],[755,'grass']],
      2: [[723,'grass'],[726,'fire'],[729,'water'],[737,'electric'],[745,'rock'],[762,'grass'],[768,'bug'],[783,'dragon'],[750,'ground'],[741,'fire']],
      3: [[724,'grass'],[727,'fire'],[730,'water'],[738,'electric'],[763,'grass'],[770,'ghost'],[784,'dragon'],[778,'ghost'],[748,'poison'],[758,'poison'],[760,'fighting'],[777,'electric']],
    } },
  { name: 'GALAR', scene: 'stadium',
    sky: ['#0d1218', '#1c2733', '#2c3e4d'], land: ['#16222e', '#101822', '#0a0f16'], accent: '#ff5e7e',
    boss: { id: 890, n: 'Eternatus', t: 'dragon' },
    gauntlet: { subs: [[894,'electric'],[895,'dragon'],[896,'ice']], myth: [893,'grass'] },
    tiers: {
      1: [[810,'grass'],[813,'fire'],[816,'water'],[819,'normal'],[821,'flying'],[824,'bug'],[827,'dark'],[831,'normal'],[835,'electric'],[837,'rock'],[840,'dragon'],[843,'ground'],[856,'psychic'],[859,'dark'],[872,'ice'],[868,'fairy']],
      2: [[811,'grass'],[814,'fire'],[817,'water'],[822,'flying'],[836,'electric'],[838,'rock'],[844,'ground'],[857,'psychic'],[860,'dark'],[825,'bug']],
      3: [[812,'grass'],[815,'fire'],[818,'water'],[823,'steel'],[839,'rock'],[841,'dragon'],[858,'psychic'],[861,'dark'],[869,'fairy'],[879,'steel'],[887,'dragon'],[849,'electric']],
    } },
  { name: 'PALDEA', scene: 'mesa',
    sky: ['#190f1f', '#3a1d33', '#5e2e33'], land: ['#33202a', '#241620', '#150c15'], accent: '#ffcf5e',
    boss: { id: 1007, n: 'Koraidon', t: 'dragon' },
    gauntlet: { subs: [[1001,'grass'],[1002,'ice'],[1003,'ground']], myth: [1025,'poison'] },
    tiers: {
      1: [[906,'grass'],[909,'fire'],[912,'water'],[915,'normal'],[917,'bug'],[919,'bug'],[921,'electric'],[926,'fairy'],[928,'grass'],[932,'rock'],[935,'fire'],[957,'fairy'],[940,'electric'],[971,'ghost'],[996,'dragon'],[978,'dragon']],
      2: [[907,'grass'],[910,'fire'],[913,'water'],[922,'electric'],[933,'rock'],[936,'fire'],[937,'ghost'],[958,'fairy'],[997,'dragon'],[972,'ghost']],
      3: [[908,'grass'],[911,'fire'],[914,'water'],[923,'electric'],[934,'rock'],[959,'fairy'],[998,'dragon'],[979,'ghost'],[983,'dark'],[1000,'steel'],[970,'rock'],[980,'poison']],
    } },
];
// Legendary, mythical, and sentinel species are encounter headliners. Keep
// them out of ordinary ranks, reinforcements, and guard pools so seeing one
// always means a boss round has begun.
const BOSS_ONLY_IDS = new Set(GENS.flatMap(g => [
  g.boss.id,
  ...(g.gauntlet ? g.gauntlet.subs.map(([id]) => id) : []),
  ...(g.gauntlet ? [g.gauntlet.myth[0]] : []),
]));
function isBossOnlyPokemon(id) { return BOSS_ONLY_IDS.has(id); }
// ============================================================
//  ECOLOGY — Pokémon that BELONG together appear together.
//  Each region has curated HABITAT PACKS (the groupings you'd see in the
//  episodes: a starter trio and its trainer's partner, a route's early
//  birds and rodents, a haunted tower, an icy cavern, an elite den) —
//  every id constrained to that region's roster, and packs spanning tiers
//  so a Pidgey squad flies under a Pidgeotto elite of the SAME line.
//  Waves without a pack fall back to a TYPE-CLUSTER habitat.
// ============================================================
const HABITAT_PACKS = [
  [ // KANTO
    { n: "ASH'S PARTNERS", ids: [25, 1, 4, 7, 2, 5, 8, 3, 6, 9] },
    { n: 'TEAM ROCKET', ids: [52, 23, 109, 53, 24, 110] }, // prepare for trouble
    { n: 'ROUTE 1', ids: [16, 19, 10, 17] },
    { n: 'CERULEAN WATERS', ids: [129, 54, 60, 61, 130] },
    { n: 'LAVENDER TOWER', ids: [92, 41, 93, 94] },
    { n: 'MT. MOON', ids: [41, 74, 35, 39, 75, 36] },
    { n: 'SAFFRON DOJO', ids: [64, 67, 65, 68] },
    { n: 'INDIGO ELITE', ids: [133, 143, 130, 149, 144, 145, 146] },
  ],
  [ // JOHTO
    { n: 'NEW BARK TRIO', ids: [152, 155, 158, 153, 156, 159, 154, 157, 160] },
    { n: 'ROUTE 29', ids: [161, 163, 167, 187] },
    { n: 'ECRUTEAK NIGHT', ids: [228, 198, 196, 197, 229] },
    { n: 'FIELDS OF GOLD', ids: [179, 187, 180, 181] },
    { n: 'LAKE OF RAGE', ids: [183, 194, 158, 159, 160, 230] },
    { n: 'MT. SILVER', ids: [246, 231, 247, 212, 248, 227, 232] },
  ],
  [ // HOENN
    { n: 'LITTLEROOT TRIO', ids: [252, 255, 258, 253, 256, 259, 254, 257, 260] },
    { n: 'PETALBURG WOODS', ids: [265, 285, 263, 261, 286] },
    { n: 'COASTAL SWELL', ids: [278, 258, 259, 260, 350] },
    { n: 'MT. CHIMNEY', ids: [322, 255, 323, 256, 257] },
    { n: 'ICY CAVERN', ids: [363, 304, 364, 305, 306] },
    { n: "DRAGON'S DEN", ids: [371, 372, 373, 334, 330, 376] },
  ],
  [ // SINNOH
    { n: 'TWINLEAF TRIO', ids: [387, 390, 393, 388, 391, 394, 389, 392, 395] },
    { n: 'ROUTE 202', ids: [399, 403, 396, 404, 405, 397, 398] },
    { n: 'ETERNA FOREST', ids: [406, 427, 434, 426, 428, 407] },
    { n: 'GREAT MARSH', ids: [453, 434, 418, 454] },
    { n: 'SNOWPOINT PEAK', ids: [459, 436, 473] },
    { n: 'MT. CORONET', ids: [436, 447, 444, 448, 445, 461] },
  ],
  [ // UNOVA
    { n: 'ASPERTIA TRIO', ids: [495, 498, 501, 496, 499, 502, 497, 500, 503] },
    { n: 'ROUTE 19', ids: [504, 506, 509, 519] },
    { n: 'DESERT RESORT', ids: [551, 570, 552, 571, 553, 530] },
    { n: 'CELESTIAL TOWER', ids: [607, 527, 608, 609] },
    { n: 'CHARGESTONE CAVE', ids: [543, 522, 524, 523, 525, 637] },
    { n: 'DRAGONSPIRAL', ids: [610, 611, 612, 635] },
  ],
  [ // KALOS
    { n: 'VANIVILLE TRIO', ids: [650, 653, 656, 651, 654, 657, 652, 655, 658] },
    { n: 'SANTALUNE FOREST', ids: [664, 661, 659, 662, 650] },
    { n: 'FAIRY GARDEN', ids: [669, 677, 700, 671] },
    { n: 'WINTER WOODS', ids: [712, 708, 713, 709] },
    { n: 'SWORD & FIST', ids: [674, 679, 675, 680, 681, 701] },
    { n: 'DRAGON MARSH', ids: [705, 706, 715] },
  ],
  [ // ALOLA
    { n: 'MELEMELE TRIO', ids: [722, 725, 728, 723, 726, 729, 724, 727, 730] },
    { n: 'ROUTE 1 TRIAL', ids: [731, 734, 736, 744, 745] },
    { n: 'LUSH JUNGLE', ids: [761, 755, 764, 762, 763] },
    { n: 'HAUNTED SHORES', ids: [769, 778, 781, 770] },
    { n: "KAHUNA'S DRAGONS", ids: [782, 783, 784] },
  ],
  [ // GALAR
    { n: 'GALAR TRIO', ids: [810, 813, 816, 811, 814, 817, 812, 815, 818] },
    { n: 'ROUTE 1 GALAR', ids: [819, 821, 824, 827, 822, 825] },
    { n: 'GALAR MINE', ids: [837, 843, 838, 844, 839, 879] },
    { n: 'GLIMWOOD TANGLE', ids: [856, 859, 857, 860, 858, 861] },
    { n: 'CHAMPION CUP', ids: [887, 823, 849, 879] },
  ],
  [ // PALDEA
    { n: 'MESAGOZA TRIO', ids: [906, 909, 912, 907, 910, 913, 908, 911, 914] },
    { n: 'POCO PATH', ids: [915, 917, 919, 921] },
    { n: 'ELECTRIC RAVE', ids: [921, 940, 922, 923] },
    { n: 'GHOST HUNT', ids: [971, 972, 937, 979] },
    { n: 'FROZEN FANGS', ids: [996, 978, 997, 998] },
  ],
];
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
  const packs = HABITAT_PACKS[genIdx] || [];
  if (packs.length && gameRand() < 0.6) {
    const p = packs[Math.floor(gameRand() * packs.length)];
    return { name: p.n, ids: new Set(p.ids), types: null };
  }
  const cl = TYPE_CLUSTERS[Math.floor(gameRand() * TYPE_CLUSTERS.length)];
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
function regionIdx(lvl) { return Math.floor((lvl - 1) / STAGES) % GENS.length; }
function stageIdx(lvl) { return (lvl - 1) % STAGES; } // 0 arrival · 1 challenge · 2 boss
function genFor(level) { return GENS[regionIdx(level)]; }
// ---- THE THREE ACTS. The journey is a three-act play: gens 1–3 teach the
// flocks to ASSEMBLE, 4–6 teach them to TRANSFORM, 7–9 COMBINE everything.
// Act boundaries land exactly on the partner evolutions (regions 4 & 7) and
// are celebrated with a full evolution ceremony between waves.
const ACTS = [
  { n: 'I',   name: 'FORMATION',      color: '#66bb6a', gens: 'GENERATIONS 1–3',
    verb: 'THE FLOCKS LEARN TO ASSEMBLE' },
  { n: 'II',  name: 'TRANSFORMATION', color: '#ffd54f', gens: 'GENERATIONS 4–6',
    verb: 'THE FORMATIONS BEGIN TO TRANSFORM' },
  { n: 'III', name: 'MASTERY',        color: '#ff8a65', gens: 'GENERATIONS 7–9',
    verb: 'EVERY MOTION THEY KNOW, COMBINED' },
];
function actIdx(lvl) { return Math.min(2, Math.floor(regionIdx(lvl) / 3)); }

// signature boss mechanics, keyed by legendary id
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

const BOSS_ABILITIES = {
  150:  { cd: 6,   name: 'TELEPORT' },        // Mewtwo blinks across the arena
  249:  { cd: 7,   name: 'AEROBLAST' },       // Lugia summons gusting winds
  384:  { cd: 8,   name: 'SKY SWEEP' },       // Rayquaza crosses the playfield
  483:  { cd: 8,   name: 'ROAR OF TIME' },    // Dialga warps ball speed
  644:  { cd: 7.5, name: 'BOLT STRIKE' },     // Zekrom calls column lightning
  717:  { cd: 7,   name: 'OBLIVION WING' },   // Yveltal fires a shot fan
  792:  { cd: 8,   name: 'PHANTOM PHASE' },   // Lunala turns intangible
  890:  { cd: 8,   name: 'DYNAMAX CANNON' },  // Eternatus fires a warned beam
  1007: { cd: 7,   name: 'WILD CHARGE' },     // Koraidon dashes across the arena
};
// ---- how each legendary OWNS its arena: a movement archetype that makes
// every fight look and feel different — not every boss looms large up top.
// 'anchor' = the classic high patrol; the rest are read by the boss patrol
// switch in update.js (and 'bastion'/'perimeter' also reshape its base fire).
const BOSS_STYLE = {
  150: 'anchor',     // Mewtwo: still, imperious — teleports do the moving
  249: 'infinity',   // Lugia: a wide figure-eight through mid-air
  384: 'serpent',    // Rayquaza: threads a long wave across the whole width
  483: 'bastion',    // Dialga: locked in the arena's heart, clockwork fire
  644: 'flank',      // Zekrom: slams between the left and right flanks
  717: 'swoop',      // Yveltal: corner-to-corner predator dives along a V
  792: 'phase',      // Lunala: dreamlike lissajous glide between moons
  890: 'perimeter',  // Eternatus: rides the top rim end to end, raining bombs
  1007: 'charge',    // Koraidon: tears back and forth at full sprint
};

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

const BOSS_PROJECTILE_KIND = Object.freeze({
  // Kanto — birds / Mewtwo / Mew
  144: 'crystal', 145: 'needle', 146: 'ember', 150: 'prism', 151: 'bubble',
  // Johto — beasts / Lugia / Celebi
  243: 'needle', 244: 'ember', 245: 'droplet', 249: 'aeroring', 251: 'seed',
  // Hoenn — Regis / Rayquaza / Jirachi
  377: 'boulder', 378: 'crystal', 379: 'lance', 384: 'comet', 385: 'star',
  // Sinnoh — lake trio / Dialga / Darkrai
  480: 'ring', 481: 'ribbon', 482: 'prism', 483: 'time', 491: 'wisp',
  // Unova — swords / Zekrom / Victini
  638: 'lance', 639: 'boulder', 640: 'leaf', 644: 'needle', 494: 'ember',
  // Kalos
  718: 'hex', 717: 'feather', 719: 'crystal',
  // Alola — Tapus / Lunala / Marshadow
  785: 'needle', 786: 'ring', 787: 'seed', 792: 'crescent', 802: 'fist',
  // Galar — new Regis / Glastrier / Eternatus / Zarude
  894: 'needle', 895: 'comet', 896: 'snowball', 890: 'toxic', 893: 'vine',
  // Paldea — treasures / Koraidon / Pecharunt
  1001: 'tablet', 1002: 'crystal', 1003: 'shock', 1007: 'sunwheel', 1025: 'mochi',
});
function projectileKindFor(id, type) {
  return BOSS_PROJECTILE_KIND[id] || TYPE_PROJECTILE_KIND[type] || 'pellet';
}
// SPACE JUNKIE gauntlets are authored as 27 distinct arrival beats: one
// sentinel formation, one legendary entrance, and one mythical entrance per
// region. The keys are read by update.js for motion and render.js for the
// matching arena effect; they deliberately do not affect Breaker/Blaster.
const SENTINEL_ENTRANCE_STYLES = [
  'prism', 'stampede', 'monolith', 'orbit', 'swords', 'cocoon', 'totem', 'stormfront', 'shrine',
];
const LEGENDARY_ENTRANCE_STYLES = {
  150: 'psybreak', 249: 'maelstrom', 384: 'skycoil', 483: 'timesplit', 644: 'thunderhead',
  717: 'blackwing', 792: 'moonrise', 890: 'voidcrown', 1007: 'suncharge',
};
const MYTHIC_ENTRANCE_STYLES = {
  151: 'wishgate', 251: 'timebloom', 385: 'starfall', 491: 'nightmare', 494: 'victorflare',
  719: 'diamondbirth', 802: 'shadowstep', 893: 'junglecall', 1025: 'toxicmask',
};
const MYTHIC_BATTLE_STYLES = {
  151: 'orbit', 251: 'flutter', 385: 'starfall', 491: 'ambush', 494: 'burst',
  719: 'crystal', 802: 'brawler', 893: 'vine', 1025: 'trick',
};
const MYTHIC_ABILITIES = {
  151: { name: 'GENESIS HALO', cd: 5.0 }, 251: { name: 'TIME BLOOM', cd: 6.2 },
  385: { name: 'DOOM DESIRE', cd: 6.0 }, 491: { name: 'NIGHT TERROR', cd: 5.6 },
  494: { name: 'VICTORY BURN', cd: 5.2 }, 719: { name: 'DIAMOND STORM', cd: 6.1 },
  802: { name: 'SPECTRAL COMBO', cd: 5.0 }, 893: { name: 'JUNGLE LASH', cd: 5.8 },
  1025: { name: 'POISON PUPPET', cd: 5.4 },
};
const GAUNTLET_ENTRANCE_NAMES = {
  prism: 'PRISM DESCENT', stampede: 'BEAST STAMPEDE', monolith: 'MONOLITH RISE',
  orbit: 'LAKE ORBIT', swords: 'SACRED CROSSING', cocoon: 'COCOON BREACH',
  totem: 'ISLAND RITE', stormfront: 'CROWNED STORM', shrine: 'SHRINE PROCESSION',
  psybreak: 'PSYCHIC BREAK', maelstrom: 'MAELSTROM ASCENT', skycoil: 'SKY COIL',
  timesplit: 'TIME FRACTURE', thunderhead: 'THUNDERHEAD', blackwing: 'BLACK SUN',
  moonrise: 'MOONRISE', voidcrown: 'VOID CROWN', suncharge: 'SUN CHARGE',
  wishgate: 'WISH GATE', timebloom: 'TIME BLOOM', starfall: 'STARFALL',
  nightmare: 'NIGHTMARE STEP', victorflare: 'VICTORY FLARE', diamondbirth: 'DIAMOND BIRTH',
  shadowstep: 'SHADOW STEP', junglecall: 'JUNGLE CALL', toxicmask: 'TOXIC MASQUERADE',
  maxrift: 'MAX RIFT',
};
function gauntletEntranceName(style) { return GAUNTLET_ENTRANCE_NAMES[style] || 'BOSS ARRIVAL'; }

// names for everything in the rosters — the Pokédex shows them
const NAMES = {
  // iconic starter-partner lines not otherwise in the wave rosters
  12:'Butterfree',18:'Pidgeot',32:'Nidoran',33:'Nidorino',34:'Nidoking',63:'Abra',66:'Machop',
  81:'Magnemite',82:'Magneton',111:'Rhyhorn',112:'Rhydon',137:'Porygon',147:'Dratini',148:'Dragonair',
  175:'Togepi',233:'Porygon2',365:'Walrein',464:'Rhyperior',474:'Porygon-Z',
  243:'Raikou',244:'Entei',245:'Suicune',251:'Celebi',377:'Regirock',378:'Regice',379:'Registeel',385:'Jirachi',480:'Uxie',481:'Mesprit',482:'Azelf',491:'Darkrai',494:'Victini',638:'Cobalion',639:'Terrakion',640:'Virizion',718:'Zygarde',719:'Diancie',785:'Tapu Koko',786:'Tapu Lele',787:'Tapu Bulu',802:'Marshadow',893:'Zarude',894:'Regieleki',895:'Regidrago',896:'Glastrier',1001:'Wo-Chien',1002:'Chien-Pao',1003:'Ting-Lu',1025:'Pecharunt',
  1:'Bulbasaur',2:'Ivysaur',3:'Venusaur',4:'Charmander',5:'Charmeleon',6:'Charizard',7:'Squirtle',8:'Wartortle',9:'Blastoise',10:'Caterpie',
  16:'Pidgey',17:'Pidgeotto',19:'Rattata',23:'Ekans',24:'Arbok',25:'Pikachu',26:'Raichu',35:'Clefairy',36:'Clefable',39:'Jigglypuff',41:'Zubat',43:'Oddish',52:'Meowth',53:'Persian',54:'Psyduck',60:'Poliwag',
  61:'Poliwhirl',64:'Kadabra',65:'Alakazam',67:'Machoke',68:'Machamp',74:'Geodude',75:'Graveler',92:'Gastly',93:'Haunter',94:'Gengar',109:'Koffing',110:'Weezing',
  129:'Magikarp',130:'Gyarados',132:'Ditto',133:'Eevee',143:'Snorlax',144:'Articuno',145:'Zapdos',146:'Moltres',149:'Dragonite',150:'Mewtwo',151:'Mew',
  152:'Chikorita',153:'Bayleef',154:'Meganium',155:'Cyndaquil',156:'Quilava',157:'Typhlosion',158:'Totodile',159:'Croconaw',160:'Feraligatr',
  161:'Sentret',163:'Hoothoot',167:'Spinarak',169:'Crobat',176:'Togetic',179:'Mareep',180:'Flaaffy',181:'Ampharos',183:'Marill',187:'Hoppip',
  194:'Wooper',196:'Espeon',197:'Umbreon',198:'Murkrow',209:'Snubbull',210:'Granbull',212:'Scizor',214:'Heracross',218:'Slugma',220:'Swinub',
  227:'Skarmory',228:'Houndour',229:'Houndoom',230:'Kingdra',231:'Phanpy',232:'Donphan',246:'Larvitar',247:'Pupitar',248:'Tyranitar',249:'Lugia',
  252:'Treecko',253:'Grovyle',254:'Sceptile',255:'Torchic',256:'Combusken',257:'Blaziken',258:'Mudkip',259:'Marshtomp',260:'Swampert',
  261:'Poochyena',263:'Zigzagoon',265:'Wurmple',278:'Wingull',280:'Ralts',281:'Kirlia',282:'Gardevoir',285:'Shroomish',286:'Breloom',
  287:'Slakoth',300:'Skitty',304:'Aron',305:'Lairon',306:'Aggron',309:'Electrike',310:'Manectric',322:'Numel',323:'Camerupt',330:'Flygon',
  334:'Altaria',350:'Milotic',359:'Absol',363:'Spheal',364:'Sealeo',371:'Bagon',372:'Shelgon',373:'Salamence',376:'Metagross',384:'Rayquaza',
  387:'Turtwig',388:'Grotle',389:'Torterra',390:'Chimchar',391:'Monferno',392:'Infernape',393:'Piplup',394:'Prinplup',395:'Empoleon',
  396:'Starly',397:'Staravia',398:'Staraptor',399:'Bidoof',403:'Shinx',404:'Luxio',405:'Luxray',406:'Budew',407:'Roserade',418:'Buizel',
  426:'Drifblim',427:'Buneary',428:'Lopunny',431:'Glameow',434:'Stunky',436:'Bronzor',444:'Gabite',445:'Garchomp',447:'Riolu',448:'Lucario',
  449:'Hippopotas',453:'Croagunk',454:'Toxicroak',459:'Snover',461:'Weavile',462:'Magnezone',466:'Electivire',468:'Togekiss',473:'Mamoswine',483:'Dialga',
  495:'Snivy',496:'Servine',497:'Serperior',498:'Tepig',499:'Pignite',500:'Emboar',501:'Oshawott',502:'Dewott',503:'Samurott',504:'Patrat',
  506:'Lillipup',507:'Herdier',509:'Purrloin',519:'Pidove',522:'Blitzle',523:'Zebstrika',524:'Roggenrola',525:'Boldore',527:'Woobat',
  530:'Excadrill',534:'Conkeldurr',543:'Venipede',551:'Sandile',552:'Krokorok',553:'Krookodile',570:'Zorua',571:'Zoroark',572:'Minccino',
  607:'Litwick',608:'Lampent',609:'Chandelure',610:'Axew',611:'Fraxure',612:'Haxorus',625:'Bisharp',628:'Braviary',635:'Hydreigon',637:'Volcarona',644:'Zekrom',
  650:'Chespin',651:'Quilladin',652:'Chesnaught',653:'Fennekin',654:'Braixen',655:'Delphox',656:'Froakie',657:'Frogadier',658:'Greninja',
  659:'Bunnelby',661:'Fletchling',662:'Fletchinder',663:'Talonflame',664:'Scatterbug',667:'Litleo',669:'Flabébé',671:'Florges',672:'Skiddo',
  674:'Pancham',675:'Pangoro',677:'Espurr',679:'Honedge',680:'Doublade',681:'Aegislash',686:'Inkay',694:'Helioptile',695:'Heliolisk',
  697:'Tyrantrum',700:'Sylveon',701:'Hawlucha',705:'Sliggoo',706:'Goodra',708:'Phantump',709:'Trevenant',712:'Bergmite',713:'Avalugg',715:'Noivern',717:'Yveltal',
  722:'Rowlet',723:'Dartrix',724:'Decidueye',725:'Litten',726:'Torracat',727:'Incineroar',728:'Popplio',729:'Brionne',730:'Primarina',
  731:'Pikipek',734:'Yungoos',736:'Grubbin',737:'Charjabug',738:'Vikavolt',741:'Oricorio',744:'Rockruff',745:'Lycanroc',748:'Toxapex',
  750:'Mudsdale',755:'Morelull',758:'Salazzle',760:'Bewear',761:'Bounsweet',762:'Steenee',763:'Tsareena',764:'Comfey',767:'Wimpod',
  768:'Golisopod',769:'Sandygast',770:'Palossand',775:'Komala',777:'Togedemaru',778:'Mimikyu',779:'Bruxish',781:'Dhelmise',782:'Jangmo-o',
  783:'Hakamo-o',784:'Kommo-o',792:'Lunala',
  810:'Grookey',811:'Thwackey',812:'Rillaboom',813:'Scorbunny',814:'Raboot',815:'Cinderace',816:'Sobble',817:'Drizzile',818:'Inteleon',
  819:'Skwovet',821:'Rookidee',822:'Corvisquire',823:'Corviknight',824:'Blipbug',825:'Dottler',827:'Nickit',831:'Wooloo',835:'Yamper',
  836:'Boltund',837:'Rolycoly',838:'Carkol',839:'Coalossal',840:'Applin',841:'Flapple',843:'Silicobra',844:'Sandaconda',849:'Toxtricity',
  856:'Hatenna',857:'Hattrem',858:'Hatterene',859:'Impidimp',860:'Morgrem',861:'Grimmsnarl',868:'Milcery',869:'Alcremie',872:'Snom',
  879:'Copperajah',887:'Dragapult',890:'Eternatus',
  906:'Sprigatito',907:'Floragato',908:'Meowscarada',909:'Fuecoco',910:'Crocalor',911:'Skeledirge',912:'Quaxly',913:'Quaxwell',914:'Quaquaval',
  915:'Lechonk',917:'Tarountula',919:'Nymble',921:'Pawmi',922:'Pawmo',923:'Pawmot',926:'Fidough',928:'Smoliv',932:'Nacli',933:'Naclstack',
  934:'Garganacl',935:'Charcadet',936:'Armarouge',937:'Ceruledge',940:'Wattrel',957:'Tinkatink',958:'Tinkatuff',959:'Tinkaton',970:'Glimmora',
  971:'Greavard',972:'Houndstone',978:'Tatsugiri',979:'Annihilape',980:'Clodsire',983:'Kingambit',996:'Frigibax',997:'Arctibax',998:'Baxcalibur',
  1000:'Gholdengo',1007:'Koraidon',
};
// full region roster (unique, dex-ordered) — used by the Pokédex progress view
function regionRoster(g) {
  const ids = new Set();
  Object.values(g.tiers).flat().forEach(([id]) => ids.add(id));
  ids.add(g.boss.id);
  return [...ids].sort((a, b) => a - b);
}
function dexTotal() { return GENS.reduce((n, g) => n + regionRoster(g).length, 0); }

// sprites live in the repo (assets/sprites/, fetched by tools/fetch-sprites.js);
// if a file is missing we fall back to PokeAPI's hosted artwork. shinies are
// rare jackpot moments, so those stay remote rather than doubling the repo.
const SPRITE_REMOTE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/';
const spriteCache = {};
const MEW_VMAX_IMG = new Image();
MEW_VMAX_IMG.src = 'assets/sprites/mew-vmax.png';
function getSprite(id, shiny) {
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
preloadGen(GENS[0]); preloadGen(GENS[1]);

// ---- Pokédex (persistent collection, shinies tracked separately) ----
const DEX = new Set((v => Array.isArray(v) ? v : [])(loadStore('pkbrk-dex', '[]')));
const DEXS = new Set((v => Array.isArray(v) ? v : [])(loadStore('pkbrk-dexs', '[]')));
// Persistent research rewards turn the collection into useful progression.
// They are deliberately modest: a new player still gets the intended run,
// while long-term catches create visible, mode-agnostic advantages.
const DEX_REWARDS = [
  { at: 10,  key: 'fieldKit', name: 'FIELD KIT',    icon: 'shield', color: '#66bb6a', desc: 'NEW JOURNEYS START WITH 1 SHIELD' },
  { at: 35,  key: 'lucky',    name: 'LUCKY CHARM',  icon: 'pokeball', color: '#ef5350', desc: '+25% CHANCE TO FIND NEW POKÉMON' },
  { at: 75,  key: 'megaSpark',name: 'MEGA SPARK',   icon: 'mega', color: '#ab47bc', desc: 'NEW JOURNEYS START 25% MEGA CHARGED' },
  { at: 150, key: 'veteran',  name: 'VETERAN BADGE',icon: 'heart', color: '#ff8a65', desc: 'NEW JOURNEYS START WITH +1 LIFE' },
  { at: 250, key: 'shinyCharm', name: 'SHINY CHARM', icon: 'fairy', color: '#ffd700', desc: 'SHINY POKÉMON APPEAR TWICE AS OFTEN' },
];
function dexRewardActive(key) {
  const r = DEX_REWARDS.find(x => x.key === key);
  return !!r && DEX.size >= r.at;
}
function dexRewardAt(n) { return DEX_REWARDS.find(r => r.at === n) || null; }
function nextDexReward() { return DEX_REWARDS.find(r => DEX.size < r.at) || null; }
function addToDex(id, shiny) {
  const isNew = !DEX.has(id) || (shiny && !DEXS.has(id));
  DEX.add(id);
  saveStore('pkbrk-dex', [...DEX]);
  if (shiny) { DEXS.add(id); saveStore('pkbrk-dexs', [...DEXS]); }
  return isNew;
}
