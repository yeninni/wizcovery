# WIZMATE character art

`wizmate-walk-atlas.png` is the generated transparent original used by the local pixel-store prototype. The original image is retained unchanged.

- 4 × 4 atlas; 1254 × 1254 RGBA pixels
- Rows: front, right, back, left
- Columns: four walking poses
- One character: chestnut bob, white/red KT fan jersey, navy trousers, red/white sneakers
- Generated specifically for this prototype, inspired by the user's chibi pixel-art direction

`character-art.js` renders the atlas into runtime textures, using a consistent scale, head center and planted-foot baseline. No image-processing service or new package is needed. Fractional cell dimensions are handled at load time. The same source supports the map sprite, guide portrait and enlarged character viewer.

The character is a fictional navigation mascot and does not represent a player or live location.
