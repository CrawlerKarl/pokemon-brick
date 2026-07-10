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
};
// ---- starter Pokémon: a partner that rides your paddle for the whole run.
// Each bakes in a paddle ability that grows as you clear regions, and the
// partner itself evolves at regions 4 and 7 — so every run plays differently
// from the first serve depending on who you picked.
const STARTER_MON = {
  fire: {
    ids: [4, 5, 6], names: ['CHARMANDER', 'CHARMELEON', 'CHARIZARD'],
    ability: 'BLAZE',
    blurb: 'RETURNS IGNITE THE BALL',
    tiers: [
      'PADDLE RETURNS IGNITE THE BALL — NEXT HIT +1 DAMAGE',
      'IGNITES THE NEXT 2 HITS',
      'IGNITES THE NEXT 3 HITS AT +2 DAMAGE',
    ],
  },
  water: {
    ids: [7, 8, 9], names: ['SQUIRTLE', 'WARTORTLE', 'BLASTOISE'],
    ability: 'TORRENT',
    blurb: 'COOL BLASTER · SHIELDS',
    tiers: [
      'BLASTER RUNS 25% COOLER · EVERY 5 RETURNS RAISE A SHIELD',
      '30% COOLER · SHIELD EVERY 4 RETURNS',
      '35% COOLER · SHIELD EVERY 3 RETURNS',
    ],
  },
  grass: {
    ids: [1, 2, 3], names: ['BULBASAUR', 'IVYSAUR', 'VENUSAUR'],
    ability: 'OVERGROWTH',
    blurb: 'MORE DROPS · EASY CATCHES',
    tiers: [
      '+20% DROPS · WIDER PICKUP CATCH',
      '+35% DROPS · WIDER CATCH',
      '+50% DROPS · HUGE CATCH RANGE',
    ],
  },
};
// partner ability level: grows with total regions cleared (evolves at 4 & 7)
function starterStage(level) {
  const regionsIn = Math.floor((level - 1) / STAGES);
  return regionsIn >= 6 ? 3 : regionsIn >= 3 ? 2 : 1;
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

// ============================================================
//  RUN UPGRADES — draft one of three after every wave
// ============================================================
const UPGRADES = [
  { key: 'blaze',     icon: 'fire',     color: '#ff7043', max: 3, name: 'BLAZE CORE',      desc: 'FIRE EXPLOSIONS 35% LARGER' },
  { key: 'intercept', icon: 'target',   color: '#80d8ff', max: 2, name: 'INTERCEPTOR',     desc: 'BLASTER BOLTS PIERCE +1 ENEMY SHOT' },
  { key: 'momentum',  icon: 'mega',     color: '#ffd54f', max: 3, name: 'MOMENTUM',        desc: 'PADDLE RETURNS CHARGE MEGA +2%' },
  { key: 'bond',      icon: 'pokeball', color: '#ef5350', max: 2, name: "TRAINER'S BOND",  desc: 'EACH CATCH: PERMANENT +6% SCORE' },
  { key: 'wide',      icon: 'wide',     color: '#42a5f5', max: 2, name: 'LONG FRAME',      desc: 'PADDLE PERMANENTLY 10% WIDER' },
  { key: 'coolant',   icon: 'slow',     color: '#4dd0e1', max: 2, name: 'COOLANT',         desc: 'BLASTER HEAT PER SHOT −30%' },
  { key: 'magnetize', icon: 'magnet',   color: '#ec407a', max: 2, name: 'ITEM MAGNET',     desc: 'PICKUPS DRIFT TOWARD YOUR PADDLE' },
  { key: 'guard',     icon: 'shield',   color: '#66bb6a', max: 2, name: 'HOME GUARD',      desc: 'START EVERY WAVE WITH A SHIELD CHARGE' },
];
function upgN(k) { return G.upg[k] || 0; }

// ============================================================
//  GENERATION JOURNEY — roster, boss & region theme per gen
// ============================================================
const GENS = [
  { name: 'KANTO', scene: 'hills',
    sky: ['#081226', '#10254a', '#16324a'], land: ['#0c2e22', '#0a2118', '#06140f'], accent: '#7ee08a',
    boss: { id: 150, n: 'Mewtwo', t: 'psychic' },
    tiers: {
      1: [[16,'flying'],[19,'normal'],[10,'bug'],[41,'poison'],[129,'water'],[43,'grass'],[60,'water'],[74,'rock'],[133,'normal'],[25,'electric'],[7,'water'],[4,'fire'],[1,'grass'],[39,'fairy'],[54,'water'],[92,'ghost']],
      2: [[17,'flying'],[8,'water'],[5,'fire'],[2,'grass'],[64,'psychic'],[93,'ghost'],[67,'fighting'],[61,'water'],[26,'electric'],[75,'rock']],
      3: [[6,'fire'],[9,'water'],[3,'grass'],[65,'psychic'],[94,'ghost'],[68,'fighting'],[130,'water'],[149,'dragon'],[143,'normal'],[144,'ice'],[145,'electric'],[146,'fire']],
    } },
  { name: 'JOHTO', scene: 'pagoda',
    sky: ['#140d26', '#2a1a4a', '#3a2348'], land: ['#241433', '#1a0e26', '#100818'], accent: '#c79bff',
    boss: { id: 249, n: 'Lugia', t: 'psychic' },
    tiers: {
      1: [[152,'grass'],[155,'fire'],[158,'water'],[161,'normal'],[163,'flying'],[167,'bug'],[179,'electric'],[183,'water'],[187,'grass'],[194,'water'],[209,'fairy'],[218,'fire'],[220,'ice'],[228,'dark'],[231,'ground'],[246,'rock']],
      2: [[153,'grass'],[156,'fire'],[159,'water'],[180,'electric'],[176,'fairy'],[196,'psychic'],[197,'dark'],[198,'dark'],[210,'fairy'],[247,'rock']],
      3: [[154,'grass'],[157,'fire'],[160,'water'],[181,'electric'],[169,'poison'],[229,'dark'],[232,'ground'],[230,'dragon'],[248,'rock'],[212,'steel'],[214,'bug'],[227,'steel']],
    } },
  { name: 'HOENN', scene: 'waves',
    sky: ['#04182b', '#0a2f4d', '#0d4a5e'], land: ['#06283d', '#04202f', '#031622'], accent: '#5ad7d2',
    boss: { id: 384, n: 'Rayquaza', t: 'dragon' },
    tiers: {
      1: [[252,'grass'],[255,'fire'],[258,'water'],[261,'dark'],[263,'normal'],[265,'bug'],[280,'psychic'],[285,'grass'],[287,'normal'],[304,'steel'],[309,'electric'],[322,'fire'],[363,'ice'],[371,'dragon'],[278,'water'],[300,'normal']],
      2: [[253,'grass'],[256,'fire'],[259,'water'],[281,'psychic'],[286,'grass'],[305,'steel'],[310,'electric'],[323,'fire'],[364,'ice'],[372,'dragon']],
      3: [[254,'grass'],[257,'fire'],[260,'water'],[282,'psychic'],[306,'steel'],[330,'dragon'],[373,'dragon'],[376,'steel'],[350,'water'],[359,'dark'],[334,'dragon']],
    } },
  { name: 'SINNOH', scene: 'mountain',
    sky: ['#0a1126', '#15234d', '#23365e'], land: ['#1b2a4a', '#131f38', '#0c1426'], accent: '#9fb8ff',
    boss: { id: 483, n: 'Dialga', t: 'dragon' },
    tiers: {
      1: [[387,'grass'],[390,'fire'],[393,'water'],[396,'flying'],[399,'normal'],[403,'electric'],[406,'grass'],[427,'normal'],[431,'normal'],[434,'poison'],[436,'steel'],[447,'fighting'],[449,'ground'],[459,'ice'],[453,'poison'],[418,'water']],
      2: [[388,'grass'],[391,'fire'],[394,'water'],[397,'flying'],[404,'electric'],[426,'ghost'],[428,'normal'],[444,'dragon'],[448,'fighting'],[454,'poison']],
      3: [[389,'grass'],[392,'fire'],[395,'water'],[398,'flying'],[405,'electric'],[407,'grass'],[445,'dragon'],[461,'dark'],[462,'electric'],[468,'fairy'],[473,'ice'],[466,'electric']],
    } },
  { name: 'UNOVA', scene: 'skyline',
    sky: ['#0d0d1a', '#1a1a33', '#26264d'], land: ['#15152b', '#0f0f20', '#090914'], accent: '#ffd166',
    boss: { id: 644, n: 'Zekrom', t: 'electric' },
    tiers: {
      1: [[495,'grass'],[498,'fire'],[501,'water'],[504,'normal'],[506,'normal'],[509,'dark'],[519,'flying'],[522,'electric'],[524,'rock'],[527,'psychic'],[543,'bug'],[551,'ground'],[570,'dark'],[572,'normal'],[607,'ghost'],[610,'dragon']],
      2: [[496,'grass'],[499,'fire'],[502,'water'],[507,'normal'],[523,'electric'],[552,'ground'],[571,'dark'],[608,'ghost'],[611,'dragon'],[525,'rock']],
      3: [[497,'grass'],[500,'fire'],[503,'water'],[530,'ground'],[534,'fighting'],[553,'ground'],[609,'ghost'],[612,'dragon'],[635,'dark'],[637,'bug'],[628,'flying'],[625,'dark']],
    } },
  { name: 'KALOS', scene: 'tower',
    sky: ['#160d22', '#321a40', '#4a2440'], land: ['#2a1533', '#1d0e24', '#120818'], accent: '#ff9ecb',
    boss: { id: 717, n: 'Yveltal', t: 'dark' },
    tiers: {
      1: [[650,'grass'],[653,'fire'],[656,'water'],[659,'normal'],[661,'flying'],[664,'bug'],[667,'fire'],[669,'fairy'],[672,'grass'],[674,'fighting'],[677,'psychic'],[679,'steel'],[686,'dark'],[694,'electric'],[708,'ghost'],[712,'ice']],
      2: [[651,'grass'],[654,'fire'],[657,'water'],[662,'flying'],[675,'fighting'],[680,'steel'],[705,'dragon'],[700,'fairy'],[695,'electric'],[709,'ghost']],
      3: [[652,'grass'],[655,'fire'],[658,'water'],[663,'fire'],[681,'steel'],[706,'dragon'],[697,'rock'],[715,'dragon'],[713,'ice'],[701,'fighting'],[671,'fairy']],
    } },
  { name: 'ALOLA', scene: 'palms',
    sky: ['#1a0d26', '#40204d', '#6e3640'], land: ['#2e1733', '#1f0f24', '#120818'], accent: '#ffb74d',
    boss: { id: 792, n: 'Lunala', t: 'psychic' },
    tiers: {
      1: [[722,'grass'],[725,'fire'],[728,'water'],[731,'flying'],[734,'normal'],[736,'bug'],[744,'rock'],[761,'grass'],[764,'fairy'],[767,'bug'],[769,'ghost'],[775,'normal'],[779,'psychic'],[781,'ghost'],[782,'dragon'],[755,'grass']],
      2: [[723,'grass'],[726,'fire'],[729,'water'],[737,'electric'],[745,'rock'],[762,'grass'],[768,'bug'],[783,'dragon'],[750,'ground'],[741,'fire']],
      3: [[724,'grass'],[727,'fire'],[730,'water'],[738,'electric'],[763,'grass'],[770,'ghost'],[784,'dragon'],[778,'ghost'],[748,'poison'],[758,'poison'],[760,'fighting'],[777,'electric']],
    } },
  { name: 'GALAR', scene: 'stadium',
    sky: ['#0d1218', '#1c2733', '#2c3e4d'], land: ['#16222e', '#101822', '#0a0f16'], accent: '#ff5e7e',
    boss: { id: 890, n: 'Eternatus', t: 'dragon' },
    tiers: {
      1: [[810,'grass'],[813,'fire'],[816,'water'],[819,'normal'],[821,'flying'],[824,'bug'],[827,'dark'],[831,'normal'],[835,'electric'],[837,'rock'],[840,'dragon'],[843,'ground'],[856,'psychic'],[859,'dark'],[872,'ice'],[868,'fairy']],
      2: [[811,'grass'],[814,'fire'],[817,'water'],[822,'flying'],[836,'electric'],[838,'rock'],[844,'ground'],[857,'psychic'],[860,'dark'],[825,'bug']],
      3: [[812,'grass'],[815,'fire'],[818,'water'],[823,'steel'],[839,'rock'],[841,'dragon'],[858,'psychic'],[861,'dark'],[869,'fairy'],[879,'steel'],[887,'dragon'],[849,'electric']],
    } },
  { name: 'PALDEA', scene: 'mesa',
    sky: ['#190f1f', '#3a1d33', '#5e2e33'], land: ['#33202a', '#241620', '#150c15'], accent: '#ffcf5e',
    boss: { id: 1007, n: 'Koraidon', t: 'dragon' },
    tiers: {
      1: [[906,'grass'],[909,'fire'],[912,'water'],[915,'normal'],[917,'bug'],[919,'bug'],[921,'electric'],[926,'fairy'],[928,'grass'],[932,'rock'],[935,'fire'],[957,'fairy'],[940,'electric'],[971,'ghost'],[996,'dragon'],[978,'dragon']],
      2: [[907,'grass'],[910,'fire'],[913,'water'],[922,'electric'],[933,'rock'],[936,'fire'],[937,'ghost'],[958,'fairy'],[997,'dragon'],[972,'ghost']],
      3: [[908,'grass'],[911,'fire'],[914,'water'],[923,'electric'],[934,'rock'],[959,'fairy'],[998,'dragon'],[979,'ghost'],[983,'dark'],[1000,'steel'],[970,'rock'],[980,'poison']],
    } },
];
// ---- 3-stage journey: every region is ARRIVAL → CHALLENGE → LEGENDARY ----
const STAGES = 3;
const STAGE_NAMES = ['ARRIVAL', 'CHALLENGE', 'LEGENDARY'];
function regionIdx(lvl) { return Math.floor((lvl - 1) / STAGES) % GENS.length; }
function stageIdx(lvl) { return (lvl - 1) % STAGES; } // 0 arrival · 1 challenge · 2 boss
function genFor(level) { return GENS[regionIdx(level)]; }

// signature boss mechanics, keyed by legendary id
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

// names for everything in the rosters — the Pokédex shows them
const NAMES = {
  1:'Bulbasaur',2:'Ivysaur',3:'Venusaur',4:'Charmander',5:'Charmeleon',6:'Charizard',7:'Squirtle',8:'Wartortle',9:'Blastoise',10:'Caterpie',
  16:'Pidgey',17:'Pidgeotto',19:'Rattata',25:'Pikachu',26:'Raichu',39:'Jigglypuff',41:'Zubat',43:'Oddish',54:'Psyduck',60:'Poliwag',
  61:'Poliwhirl',64:'Kadabra',65:'Alakazam',67:'Machoke',68:'Machamp',74:'Geodude',75:'Graveler',92:'Gastly',93:'Haunter',94:'Gengar',
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

// sprites live in the repo (assets/sprites/, fetched by tools/fetch-sprites.js);
// if a file is missing we fall back to PokeAPI's hosted artwork. shinies are
// rare jackpot moments, so those stay remote rather than doubling the repo.
const SPRITE_REMOTE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/';
const spriteCache = {};
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
const DEX = new Set(JSON.parse(localStorage.getItem('pkbrk-dex') || '[]'));
const DEXS = new Set(JSON.parse(localStorage.getItem('pkbrk-dexs') || '[]'));
function addToDex(id, shiny) {
  const isNew = !DEX.has(id) || (shiny && !DEXS.has(id));
  DEX.add(id);
  localStorage.setItem('pkbrk-dex', JSON.stringify([...DEX]));
  if (shiny) { DEXS.add(id); localStorage.setItem('pkbrk-dexs', JSON.stringify([...DEXS])); }
  return isNew;
}
