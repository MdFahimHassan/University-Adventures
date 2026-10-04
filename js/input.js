// input.js - remembers which keys are held, and which were pressed THIS frame.
const held = new Set();     // keys currently down (for movement)
const pressed = new Set();  // keys that went down this frame (for E, F3)

window.addEventListener('keydown', (e) => {
  if (!e.repeat) pressed.add(e.code);   // ignore auto-repeat when holding a key
  held.add(e.code);
  // stop arrow keys from scrolling the page
  if (e.code.startsWith('Arrow')) e.preventDefault();
});
window.addEventListener('keyup', (e) => held.delete(e.code));
window.addEventListener('blur', () => held.clear()); // avoid "stuck" keys on alt-tab

export const input = {
  left:  () => held.has('KeyA') || held.has('ArrowLeft'),
  right: () => held.has('KeyD') || held.has('ArrowRight'),
  up:    () => held.has('KeyW') || held.has('ArrowUp'),
  down:  () => held.has('KeyS') || held.has('ArrowDown'),
  wasPressed: (code) => pressed.has(code),
  endFrame: () => pressed.clear(),      // call once at the end of every frame
};
