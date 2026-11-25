# Dialogue portraits

Conversations show a speech box above the speaker's head, with the **speaker's face on the left** and the **player's face on
the right**. The side that is talking is lit; the other is dimmed. Until a portrait exists, a grey silhouette is shown.

## Format
- **128×128 PNG**, head and shoulders, **facing right** (the game mirrors the player portrait so the two faces look at each other).
- Plain dark slate background is fine (no transparency needed). Keep the same framing and eye height for every portrait.
- Save as `incoming_art/portraits/<file>` and run `python tools/import_art.py`. Portraits go live at once (not staged).

## Optional moods
Add `portraits/<id>_<mood>.png` (for example `n_dockmaster_worried.png`), then set `"mood": "worried"` on a dialogue node in
`world/world.json`. Suggested moods: `worried`, `angry`, `smile`. A missing mood falls back to the normal portrait.

## Files and prompts (13)

### 1. `portraits/n_dockmaster.png`
```
[P1] High-detail pixel art character portrait for a dialogue box, head and shoulders bust, three-quarter view facing RIGHT, soft light from the upper-left, 1-pixel dark selective outline, bleak post-apocalyptic coastal fantasy ("Ashen Wilds, Red Salt Coast"): muted ash-grey palette with red-salt stains, warm lantern amber rim light, plain dark slate-grey background, crisp pixels, no text, no frame, no watermark. Same art style and framing for every portrait. Mara Fen, the Dockmaster: weathered woman in her forties, short salt-grey hair under a teal oilskin hood, rolled sea chart tucked under her arm, steady tired eyes. Square image, 128x128.
```

### 2. `portraits/n_clerk.png`
```
[P1] High-detail pixel art character portrait for a dialogue box, head and shoulders bust, three-quarter view facing RIGHT, soft light from the upper-left, 1-pixel dark selective outline, bleak post-apocalyptic coastal fantasy ("Ashen Wilds, Red Salt Coast"): muted ash-grey palette with red-salt stains, warm lantern amber rim light, plain dark slate-grey background, crisp pixels, no text, no frame, no watermark. Same art style and framing for every portrait. Edda Voss, the Ledger Clerk: thin woman with ink-stained fingers, dark hair pinned up, round spectacles, high-collared rust-red coat, holding a worn ledger. Square image, 128x128.
```

### 3. `portraits/n_quartermaster.png`
```
[P1] High-detail pixel art character portrait for a dialogue box, head and shoulders bust, three-quarter view facing RIGHT, soft light from the upper-left, 1-pixel dark selective outline, bleak post-apocalyptic coastal fantasy ("Ashen Wilds, Red Salt Coast"): muted ash-grey palette with red-salt stains, warm lantern amber rim light, plain dark slate-grey background, crisp pixels, no text, no frame, no watermark. Same art style and framing for every portrait. Neral Brin, the Quartermaster: broad older man, cropped grey beard, ochre canvas apron over a wool coat, pencil behind his ear, practical and stern. Square image, 128x128.
```

### 4. `portraits/n_mechanic.png`
```
[P1] High-detail pixel art character portrait for a dialogue box, head and shoulders bust, three-quarter view facing RIGHT, soft light from the upper-left, 1-pixel dark selective outline, bleak post-apocalyptic coastal fantasy ("Ashen Wilds, Red Salt Coast"): muted ash-grey palette with red-salt stains, warm lantern amber rim light, plain dark slate-grey background, crisp pixels, no text, no frame, no watermark. Same art style and framing for every portrait. Iven Rusk, the Harbor Blacksmith: big man, soot on his face, burn-scarred forearms, leather apron and rust-brown shirt, hammer over his shoulder, short dark beard. Square image, 128x128.
```

### 5. `portraits/n_medic.png`
```
[P1] High-detail pixel art character portrait for a dialogue box, head and shoulders bust, three-quarter view facing RIGHT, soft light from the upper-left, 1-pixel dark selective outline, bleak post-apocalyptic coastal fantasy ("Ashen Wilds, Red Salt Coast"): muted ash-grey palette with red-salt stains, warm lantern amber rim light, plain dark slate-grey background, crisp pixels, no text, no frame, no watermark. Same art style and framing for every portrait. Sera Moll, the Harbor Medic: calm woman, sea-green headscarf, rolled sleeves, satchel strap across her chest, small scar on her cheek, kind but serious eyes. Square image, 128x128.
```

### 6. `portraits/n_guard.png`
```
[P1] High-detail pixel art character portrait for a dialogue box, head and shoulders bust, three-quarter view facing RIGHT, soft light from the upper-left, 1-pixel dark selective outline, bleak post-apocalyptic coastal fantasy ("Ashen Wilds, Red Salt Coast"): muted ash-grey palette with red-salt stains, warm lantern amber rim light, plain dark slate-grey background, crisp pixels, no text, no frame, no watermark. Same art style and framing for every portrait. Orin Hale, the Harbor Guard: grizzled veteran, slate-blue gambeson, dented iron helmet, round shield edge visible, a bell-shaped badge on his chest. Square image, 128x128.
```

### 7. `portraits/n_salvager.png`
```
[P1] High-detail pixel art character portrait for a dialogue box, head and shoulders bust, three-quarter view facing RIGHT, soft light from the upper-left, 1-pixel dark selective outline, bleak post-apocalyptic coastal fantasy ("Ashen Wilds, Red Salt Coast"): muted ash-grey palette with red-salt stains, warm lantern amber rim light, plain dark slate-grey background, crisp pixels, no text, no frame, no watermark. Same art style and framing for every portrait. Talla Cor, the Licensed Salvager: wiry young woman, rust-orange scarf over her mouth pulled down, salt-crusted hood, hook pole over her shoulder, haunted look. Square image, 128x128.
```

### 8. `portraits/n_ropewright.png`
```
[P1] High-detail pixel art character portrait for a dialogue box, head and shoulders bust, three-quarter view facing RIGHT, soft light from the upper-left, 1-pixel dark selective outline, bleak post-apocalyptic coastal fantasy ("Ashen Wilds, Red Salt Coast"): muted ash-grey palette with red-salt stains, warm lantern amber rim light, plain dark slate-grey background, crisp pixels, no text, no frame, no watermark. Same art style and framing for every portrait. Mira Vale, the Ropewright: middle-aged woman with strong hands, coils of rope over her shoulder, blue-grey knitted cap, rough wool sweater. Square image, 128x128.
```

### 9. `portraits/n_tidepilot.png`
```
[P1] High-detail pixel art character portrait for a dialogue box, head and shoulders bust, three-quarter view facing RIGHT, soft light from the upper-left, 1-pixel dark selective outline, bleak post-apocalyptic coastal fantasy ("Ashen Wilds, Red Salt Coast"): muted ash-grey palette with red-salt stains, warm lantern amber rim light, plain dark slate-grey background, crisp pixels, no text, no frame, no watermark. Same art style and framing for every portrait. Teren Sull, the Tide Pilot: lean man, sun-darkened skin, grey-green oilskin coat, brass spyglass on a cord, wind-tangled hair, squinting eyes. Square image, 128x128.
```

### 10. `portraits/n_apprentice.png`
```
[P1] High-detail pixel art character portrait for a dialogue box, head and shoulders bust, three-quarter view facing RIGHT, soft light from the upper-left, 1-pixel dark selective outline, bleak post-apocalyptic coastal fantasy ("Ashen Wilds, Red Salt Coast"): muted ash-grey palette with red-salt stains, warm lantern amber rim light, plain dark slate-grey background, crisp pixels, no text, no frame, no watermark. Same art style and framing for every portrait. Ola Marr, the Workshop Apprentice: teenage girl, soot smudges, oversized leather apron, copper-orange hair tied back, small hammer, eager expression. Square image, 128x128.
```

### 11. `portraits/n_crewhand.png`
```
[P1] High-detail pixel art character portrait for a dialogue box, head and shoulders bust, three-quarter view facing RIGHT, soft light from the upper-left, 1-pixel dark selective outline, bleak post-apocalyptic coastal fantasy ("Ashen Wilds, Red Salt Coast"): muted ash-grey palette with red-salt stains, warm lantern amber rim light, plain dark slate-grey background, crisp pixels, no text, no frame, no watermark. Same art style and framing for every portrait. Senn Bri, the Dock Worker: stocky man, sage-green work jacket, cargo hook on his belt, wool cap, tired honest face. Square image, 128x128.
```

### 12. `portraits/player_male.png`
```
[P1] High-detail pixel art character portrait for a dialogue box, head and shoulders bust, three-quarter view facing RIGHT, soft light from the upper-left, 1-pixel dark selective outline, bleak post-apocalyptic coastal fantasy ("Ashen Wilds, Red Salt Coast"): muted ash-grey palette with red-salt stains, warm lantern amber rim light, plain dark slate-grey background, crisp pixels, no text, no frame, no watermark. Same art style and framing for every portrait. The player salvager (male): young man, hooded grey-blue salvager cloak, leather armor collar, crossbow strap across the chest, determined eyes, short dark hair under the hood. Square image, 128x128.
```

### 13. `portraits/player_female.png`
```
[P1] High-detail pixel art character portrait for a dialogue box, head and shoulders bust, three-quarter view facing RIGHT, soft light from the upper-left, 1-pixel dark selective outline, bleak post-apocalyptic coastal fantasy ("Ashen Wilds, Red Salt Coast"): muted ash-grey palette with red-salt stains, warm lantern amber rim light, plain dark slate-grey background, crisp pixels, no text, no frame, no watermark. Same art style and framing for every portrait. The player salvager (female): young woman, hooded grey-blue salvager cloak, leather armor collar, crossbow strap across the chest, determined eyes, dark hair under the hood. Square image, 128x128.
```
