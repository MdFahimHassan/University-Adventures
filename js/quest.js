// quest.js - a tiny state machine: start -> find -> return -> done
export const quest = {
  state: 'start',

  // Text shown in the on-screen tracker
  get trackerText() {
    return {
      start:  'Talk to the student near the lifts',
      find:   'Find the lost ID card in the south area',
      return: 'Return the ID card to the student',
      done:   'Quest complete! Enjoy the rooftop.',
    }[this.state];
  },

  // What the NPC says depends on the state. onFinish moves the quest forward.
  talk() {
    switch (this.state) {
      case 'start': return {
        lines: ["Oh no... I think I dropped my student ID card!",
                "I was sitting by the south railing earlier. Could you look for it?",
                "It should be somewhere in the open area down there. Thank you!"],
        next: () => { this.state = 'find'; } };
      case 'find': return {
        lines: ["Any luck? Try the open area by the south railing."], next: null };
      case 'return': return {
        lines: ["That's my ID card! You're a lifesaver!",
                "Now I can get back into the gym. Thanks a lot!"],
        next: () => { this.state = 'done'; } };
      default: return {
        lines: ["Nice weather up here, right? Thanks again!"], next: null };
    }
  },
};