// dialogue.js - a tiny line-by-line text box controller. Drawing is in renderer.js.
export const dialogue = {
  active: false,
  speaker: '',
  lines: [],
  index: 0,
  onFinish: null,

  start(speaker, lines, onFinish = null) {
    this.active = true; this.speaker = speaker;
    this.lines = lines; this.index = 0; this.onFinish = onFinish;
  },
  advance() {                                // called when E is pressed
    this.index++;
    if (this.index >= this.lines.length) {
      this.active = false;
      if (this.onFinish) this.onFinish();
    }
  },
  get text() { return this.lines[this.index]; },
};
