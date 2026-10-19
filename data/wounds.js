/* LAST SEASON: wounds named by what caused them. Text only, never rules: each wound keeps the effect of the injury it
   names (INJURIES in index.html), so a name must fit that effect (a hand wound slows Tech, a leg wound slows Stealth).
   Causes: GUN (return fire), BLAST (grenades, mines, IEDs, charges), FALL (falls, knocks, bites and cuts), BURN (fire).
   An entry is a name, or [name, how it reads once treated]. Loaded before the game script as LS_TEXT.WOUNDS. */
window.LS_TEXT = window.LS_TEXT || {};

LS_TEXT.WOUNDS = {
  GUN: {
    CUT_HAND: 'Grazed hand', GRAZE: 'Bullet graze', BRUISED_KNEE: 'Grazed shin', RINGING_EARS: 'Ringing ears', SPLIT_BROW: 'Grazed temple', TWISTED_WRIST: 'Jarred wrist',
    BROKEN_FINGER: 'Shot through the hand', SPRAINED_ANKLE: ['Bullet in the calf', 'bandaged'], CRACKED_RIBS: 'Ribs cracked behind the plate', TORN_SHOULDER: ['Shoulder wound', 'in a sling'], BROKEN_NOSE: ['Face wound', 'dressed'],
    BROKEN_ARM: 'Shot through the arm', BROKEN_LEG: ['Bullet in the thigh', 'packed and splinted'], CONCUSSION: ['Head wound', 'dressed and monitored'], BLEEDING: 'Gunshot wound',
  },
  BLAST: {
    CUT_HAND: 'Shrapnel in the hand', GRAZE: 'Fragment graze', BRUISED_KNEE: 'Knee full of grit', RINGING_EARS: 'Blast-deafened', SPLIT_BROW: 'Dust in the eyes', TWISTED_WRIST: 'Wrenched wrist',
    BROKEN_FINGER: 'Mangled fingers', SPRAINED_ANKLE: ['Shrapnel in the leg', 'bandaged'], CRACKED_RIBS: 'Cracked ribs', TORN_SHOULDER: ['Shrapnel in the shoulder', 'dressed'], BROKEN_NOSE: ['Fragments in the face', 'dressed'],
    BROKEN_ARM: 'Shattered arm', BROKEN_LEG: 'Shattered leg', CONCUSSION: 'Blast concussion', BLEEDING: 'Deep shrapnel wound',
  },
  FALL: {
    CUT_HAND: 'Cut hand', GRAZE: 'Skinned forearm', BRUISED_KNEE: 'Bruised knee', RINGING_EARS: 'Dazed', SPLIT_BROW: 'Split eyebrow', TWISTED_WRIST: 'Twisted wrist',
    BROKEN_FINGER: 'Broken finger', SPRAINED_ANKLE: 'Sprained ankle', CRACKED_RIBS: 'Cracked ribs', TORN_SHOULDER: 'Dislocated shoulder', BROKEN_NOSE: 'Broken nose',
    BROKEN_ARM: 'Broken arm', BROKEN_LEG: 'Broken leg', CONCUSSION: 'Concussion', BLEEDING: 'Deep gash',
  },
  BURN: {
    CUT_HAND: 'Burned fingers', GRAZE: 'Scorched forearm', BRUISED_KNEE: 'Blistered feet', RINGING_EARS: 'Smoke-stung eyes', SPLIT_BROW: 'Singed brow', TWISTED_WRIST: 'Burned wrist',
    BROKEN_FINGER: ['Burned hand', 'dressed'], SPRAINED_ANKLE: ['Burned legs', 'dressed'], CRACKED_RIBS: ['Burns across the back', 'dressed'], TORN_SHOULDER: ['Burned arm', 'dressed'], BROKEN_NOSE: ['Burned face', 'dressed'],
    BROKEN_ARM: ['Badly burned arms', 'dressed'], BROKEN_LEG: ['Badly burned legs', 'dressed'], CONCUSSION: 'Smoke inhalation', BLEEDING: ['Severe burns', 'dressed'],
  },
};
