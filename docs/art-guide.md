# LAST SEASON art guide

Direction: **classified dossier**. The dark interface is the desk; on it lie surveillance photos, mosaic personnel files, maps and stamped reports. Maps, weather, insignia, patches, emblems, stamps and redaction are drawn in code. Only the pictures below need making.

## Delivering art

- Save each file as `img/art/<ID>.jpg` (JPEG, quality 80–85) at the size listed. The game picks it up automatically, and until then shows a hatched placeholder labelled with the ID and size.
- Leave out text, logos, watermarks, UI, borders and frames. The game adds its own titles, stamps and grading.
- Paint everything in **neutral daylight and clear weather**. The game tints for dusk and night and draws rain, fog, dust, smoke and heat over the top, so one image serves every mission.
- Keep the subject in the centre band. The game crops banners from 3.2:1 down to 4:1 or 5:1 depending on the screen.

## Shared look (put this at the start of every prompt)

> Declassified surveillance photograph, long-lens reconnaissance print, desaturated muted palette of olive, sand, slate and faded teal, low contrast with deep shadows, fine film grain, slightly soft focus, overcast neutral daylight, documentary realism, no people facing camera, no text, no logos

Use as negative prompt: `text, letters, watermark, logo, frame, border, cartoon, anime, saturated colours, lens flare, HDR, people posing, weapons pointed at camera, gore`

## Location banners: 1600×500 (7)

Wide establishing shots, horizon on the upper third, a small compound or objective visible in the middle distance.

| ID | Prompt (after the shared look) |
|---|---|
| `LOC-FARMLAND` | fortified orchard and farm compound outside a small Eastern European town, rows of fruit trees, low stone walls, a dirt track, flat fields to the horizon |
| `LOC-HIGHLANDS` | rugged mountain valley, a goat path climbing to a stone hillside village, scree slopes, distant snow-dusted ridges |
| `LOC-COAST` | rocky coastline with a small fishing harbour and concrete pier, warehouses on the waterfront, calm grey sea, headland in the distance |
| `LOC-RIVER` | wide slow river delta with reed beds, a wooden jetty and a river barge, a riverside compound among trees |
| `LOC-DESERT` | arid basin with a mud-brick caravan fort, wind-shaped dunes, a lone dirt road, heat-flattened horizon |
| `LOC-FOREST` | dense temperate forest edge, a logging road, a firebreak cutting through pines, a timber camp in a clearing |
| `LOC-URBAN` | dense Middle Eastern or Balkan city block seen from a rooftop, flat roofs, water tanks, satellite dishes, narrow streets, a stairwell tower |

## Key art: 1920×1080 (1)

| ID | Prompt |
|---|---|
| `KEYART` | four special operations soldiers seen from behind, silhouetted on a ridge at first light, looking down at a compound in a valley, helmets, night-vision mounts raised, plate carriers, rifles slung low, mist in the valley, *shared look*, cinematic wide composition, darker on the left third (the title sits there) |

## Hostile portraits: 400×400 (7)

Plain, centred head-and-shoulders photos. Unlike your own operators, hostiles are not censored: their faces are what intel has on file. They are scaled to 400×400, and the game greys, grains and pixelates them like every other picture.

| ID | Prompt (head-and-shoulders, centred, plain dark background, *shared look*) |
|---|---|
| `OFF-SHARPSHOOTER` | lean insurgent marksman, shemagh scarf, boonie hat, weathered face, scoped rifle strap on shoulder |
| `OFF-TACTICIAN` | composed militia officer in a pressed old army jacket, radio handset on the collar, reading glasses |
| `OFF-BRUTE` | huge bearded fighter, chest rig full of grenades, shaved head, scarred knuckles |
| `OFF-COMMANDER` | grey-haired commander in a beret and field jacket with faded insignia, stern bearing |
| `TGT-FINANCIER` | soft-faced man in an expensive open-collar shirt and a gold watch, nervous, holding a phone |
| `TGT-BOMBMAKER` | thin man with burn scars on his hands, safety glasses pushed up on his forehead, wires in a shirt pocket |
| `TGT-WARLORD` | imposing warlord in a mix of military surplus and tribal scarf, bodyguards blurred behind him |

## Department vignettes: 1200×300 (6)

Interiors of a forward operating base, wide and low, no faces.

| ID | Prompt (after the shared look) |
|---|---|
| `DEPT-CMD` | operations room, a map table with pins and string, radios, a wall of monitors in a plywood shelter |
| `DEPT-INTEL` | intelligence cell, satellite photos pinned to a corkboard, a laptop showing a drone feed, coffee cups |
| `DEPT-MED` | field hospital tent, two cots, IV stands, medical crates, a stretcher by the door |
| `DEPT-ENG` | armory and workshop, rifle racks, a workbench with tools, ammunition crates, a stripped engine |
| `DEPT-LOG` | vehicle yard, MRAP and light strike vehicle under camouflage netting, a helicopter pad beyond the HESCO walls |
| `DEPT-BARRACKS` | barracks hut, bunks with kit bags, boots lined up, a dartboard and a kettle |

## Already drawn in code (no art needed)

- **Tactical map:** built in layers from the mission seed. Terrain is shaped per region (rolling farmland, ridged highlands with a valley, a coast with a real sea level and cliffs, a flat delta with braided channels, dune fields along a wind direction, forest, a town grid). Water runs downhill into streams or wadis. Roads follow the easiest ground, with a track to the objective compound. Stages sit where their situation belongs: a watchtower on high ground with its view cone, a ford on the water, a pier on the shore, a checkpoint on the road. Each approach route takes its own line (a ridgeline keeps high, a riverbed follows the water, a track follows the road, rooftops avoid the streets), and both options at every fork are drawn until one is chosen. Insertion and extraction points depend on the vehicle (SP, LZ, DZ, LS, PZ, EP, RV). Hostiles (red diamonds with counts), the officer (a star) and unscouted spots follow the intel bought. Hillshade, contours labelled in metres, spot heights, phase lines and a legend finish it.
- **Weather:** a still overlay, nothing animated: rain and storm streaks and drizzle on the pictures; fog, smoke, dust and heat haze on the pictures and the maps.
- **Photo treatment:** every picture is pixelated into blocks of about 4 screen pixels, mostly desaturated and overlaid with film grain, and darkened under rain, storms and smoke. Deliver clean, full-colour images; the game does the rest.
- **Dossier details:** rank insignia, class patches, faction emblems, rubber stamps (Classified, Mission success or failed, KIA, MIA), redaction bars for unknown intel, paper grain, and a muted pixel-crisp treatment for the portraits.
