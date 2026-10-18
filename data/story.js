/* LAST SEASON: the story told around the rules.
   Transit scenes for the way in and out, scene-setting for each stage (the hour and the weather, then what waits there),
   one line for how a roll went, and the words the after-action report uses. Text only, never rules. Loaded before the
   game script; the game reads them as LS_TEXT.<NAME>. Slots in {braces} are filled in by the game. */
window.LS_TEXT = window.LS_TEXT || {};

LS_TEXT.SCENES = {
  IN: { HELO: ['The helicopter lifts off and banks toward the hills. Through the open door, the lights of the base shrink to nothing.', 'When the rotor noise swallows the talk, whose words stay with you?'],
    GROUND: ['The convoy pulls out of the gate onto the dark road. The trucks rattle; someone checks a radio for the third time.', 'When the talk dies down to engine noise, whose words stay with you?'],
    FOOT: ['The team moves out past the last checkpoint. One last huddle in the treeline before the walk.', 'When the column goes silent, whose words stay with you?'],
    LSV: ['The light strike vehicles slip out of the gate with their lights off. Every rut in the track comes up through the seats.', 'When the engines settle into a growl, whose words stay with you?'],
    BOAT: ['The boat pushes off from the jetty on a muffled motor. Black water, cold spray, and the far bank somewhere ahead.', 'When the motor drops to a murmur, whose words stay with you?'],
    HALO: ['The ramp opens at twenty-five thousand feet. Oxygen hissing, the team waits in the red light for the green.', 'In the last minute before the jump, whose words stay with you?'],
    MRAP: ['The armoured trucks grind out of the gate. Inside it is loud, hot and close, and everyone pretends to sleep.', 'When the armour plates stop rattling, whose words stay with you?'] },
  OUT: { HELO: ['The helicopter claws away from the clearing. Nobody speaks until the ground falls far behind.', 'On the long flight back, whose words stay with you?'],
    GROUND: ['The trucks roar back onto the road. The adrenaline drains out, and the talking starts.', 'On the drive back, whose words stay with you?'],
    FOOT: ['The team pushes through the treeline toward friendly lines. Once it is safe, someone breaks the silence.', 'On the long walk home, whose words stay with you?'],
    LSV: ['The vehicles tear away down the track, guns still trained behind them. Only on the main road does anyone breathe.', 'On the rough ride back, whose words stay with you?'],
    BOAT: ['The boat swings out into the current and the shore falls away into the dark. Somebody bails water and says nothing.', 'On the slow run back across the water, whose words stay with you?'],
    MRAP: ['The armoured trucks roll out, rounds pinging off the plates for the first kilometre. Then just the engines.', 'On the long drive back behind the armour, whose words stay with you?'] },
};

LS_TEXT.TIME_WX = {
  DAY: {
    CLEAR: 'Hard light and long sightlines. Nowhere to hide from a pair of binoculars.',
    WET: 'Grey rain all day, the kind that gets into the weapons and the nerves.',
    MURK: 'Daylight, for what it is worth. The haze eats everything past a hundred metres.',
    DUST: 'The wind carries half the desert in it. Goggles on, mouths shut.',
    HEAT: 'Forty degrees in the shade, and there is no shade.',
  },
  DUSK: {
    CLEAR: 'The sun goes down the colour of a wound. Shadows stretch toward the target.',
    WET: 'Dusk and rain together. The light fails slowly, then all at once.',
    MURK: 'Fog rolls in with the dusk. Shapes become rumours.',
    DUST: 'Dust hangs in the last of the light like smoke after a fire.',
    HEAT: 'The heat does not leave with the sun. It waits, like everyone else.',
  },
  NIGHT: {
    CLEAR: 'No moon. The stars are cold and indifferent.',
    WET: 'Night and rain. Every footstep is a splash, every splash a gamble.',
    MURK: 'Black fog. You hear the generator long before you see a thing.',
    DUST: 'Night and blowing dust. The world shrinks to the operator in front of you.',
    HEAT: 'A hot night. Insects scream. Sweat runs into everything.',
  },
};

LS_TEXT.ARRIVE = {
  FORK: ['Two ways in. {name} looks at both and chooses to believe one of them.', 'Two entry points, each with its own way of killing you.'],
  SENTRY: ['Two cigarettes glow at the sentry hut. {name} counts the seconds between drags.', 'A radio crackles at the post. {name} wraps a hand round the {gear} and waits.'],
  PATROL: ['Boots on gravel, regular as a clock. {name} times the patrol and does not like the number.', 'Torch beams sweep the track. {name} goes flat beside the {gear}.'],
  TOWER: ['The searchlight walks the ground like a slow, bored eye.', '{name} glasses the watchtower. One up there, maybe two, and a lot of open ground.'],
  GATE: ['Chain and padlock on the gate, rusted but new. Someone wants this kept shut.', '{name} runs a gloved hand along the gate chain. Cold steel, no give.'],
  MINES: ['Thin wires catch what little light there is. {name} stops breathing for a moment.', 'The ground is too smooth here. {name} has seen ground like this before, and the people who walked on it.'],
  DOGS: ['A dog barks once, then twice, then stops. That is worse.', 'Kennel smell on the wind. {name} checks the {gear} and thinks about teeth.'],
  CLIFF: ['The rock face goes up into the dark. Somebody built on top of it for a reason.', '{name} puts a palm on the cliff. Wet stone, cold, and a long way down.'],
  RIVERX: ['The ford is wide and slow and lit by a single lamp. Two figures smoke on the far bank.', 'Water to the knees, then to the waist. {name} holds the {gear} high.'],
  DOCKS: ['Floodlights on the pier turn the water into black glass.', 'Diesel and salt. A generator thumps under the dock lights; {name} counts guards by their shadows.'],
  CHECKPOINT: ['Concrete barriers, a burned-out car, a guard who looks bored. Looks.', 'A radio at the checkpoint plays something sentimental. {name} does not find it touching.'],
  ROOFTOP: ['A silhouette on the roof, rifle across the knees. Patient. Professional.', '{name} finds the spotter by the glint of a lens and keeps very still.'],
  OPENGROUND: ['Three hundred metres of nothing between the treeline and the wall.', '{name} looks at the open ground and does the arithmetic nobody wants to do.'],
  FIRELINE: ['The brush fire crawls along the treeline, orange and patient, eating the only cover.', 'Smoke and heat. {name} pulls a wet scarf up and watches the flames walk.'],
  INTEL: ['One lit window in a dark building. Somewhere inside, a safe full of other people\'s secrets.', '{name} runs the floor plan one last time. Second floor, east corner, a safe and a guard who sleeps badly.'],
  HVT: ['The target is in there, asleep or pretending to be. The bodyguards are not asleep.', '{name} checks the {gear} twice. The last door of the night is always the heaviest.'],
  CACHE: ['Crates under tarpaulin, stencils in a language nobody here was born speaking.', 'A weapons cache, badly hidden. {name} wonders who it was hidden from.'],
  BREAK: ['The way out is the way in, only longer, and now everyone knows you are here.', '{name} looks back once. Then forward. The extraction point is a promise, nothing more.'],
};

LS_TEXT.RESULT = {
  ASSAULT: {
    SUCCESS: ['{lead} goes in hard behind the {gear}, and it is over before the echoes are.', 'Muzzle flash, shouting, then nothing. {lead} lowers the {gear}.'],
    PARTIAL: ['{lead} gets it done, ugly and loud, the {gear} hot in their hands.', 'It works. Not cleanly. {lead} will be hearing it for days.'],
    FAIL: ['The plan comes apart in the first three seconds. {lead} is shouting into a wall of noise.', '{lead} pushes in, and the place pushes back.'],
  },
  STEALTH: {
    SUCCESS: ['{lead} is a shadow in {wx}; the rest of the team follows in the gaps.', 'Nobody sees {lead}. Nobody ever will.'],
    PARTIAL: ['{lead} slips through, but leaves something behind: a sound, a print, a doubt.', 'Almost silent. Almost is a dangerous word.'],
    FAIL: ['A boot on loose stone. A shout. {lead} freezes a heartbeat too long.', '{wx} betrays {lead} at the worst possible moment.'],
  },
  RECON: {
    SUCCESS: ['{lead} reads the ground like a confession: every guard, every gap, every habit.', 'Through the {gear}, {lead} sees the whole thing laid open.'],
    PARTIAL: ['{lead} gets most of it. The rest is guesswork, and guesswork gets people killed.', 'A good enough picture. {lead} would rather have a perfect one.'],
    FAIL: ['{wx} swallows everything {lead} needed to see.', '{lead} watches and watches, and learns the wrong thing.'],
  },
  TECH: {
    SUCCESS: ['The lock gives with a sigh. {lead} is already moving.', '{lead} talks to the machine in its own language, and it listens.'],
    PARTIAL: ['It opens, eventually, with a noise {lead} would rather forget.', 'The system gives way, but not before it complains.'],
    FAIL: ['Sparks, a dead circuit, and a long silence. {lead} swears very quietly.', 'The mechanism wins this round. {lead} counts the seconds just lost.'],
  },
};

LS_TEXT.VIA = { FOOT: 'on foot', GROUND: 'by convoy', HELO: 'by helicopter', LSV: 'by light strike vehicle', BOAT: 'by boat', HALO: 'by HALO jump', MRAP: 'by MRAP' };

LS_TEXT.WAY_PAST = { DETOUR: 'detoured to the other way in', BLAST: 'blew a way through', DEMOLITIONS: 'blew a new way in', MARKSMAN: 'cleared a stage from overwatch', CQB: 'cleared it room by room',
  DIVER: 'took the team round through the water', MOUNTAINEER: 'climbed round', INFILTRATOR: 'went in alone and opened the way', SIGNALS: 'spoofed their radio net', LINGUIST: 'talked the team through',
  PATHFINDER: 'found a way off the map', ENDURANCE: 'hauled everyone over', FORCE: 'forced the way through' };

