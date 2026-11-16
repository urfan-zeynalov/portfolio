// Site-wide facts. Only things you told me; everything else is a [PLACEHOLDER].
export const site = {
  name: 'Urfan Zeynalov',
  handle: '13',
  title: '13 SYSTEM · Urfan Zeynalov',
  description: 'Portfolio of Urfan Zeynalov (13): EEE student at ADA University building embedded systems and robots. Pick a project on the 13 SYSTEM console and play it.',
  github: 'https://github.com/urfan-zeynalov',
  linkedin: 'https://www.linkedin.com/in/urfan-zeynalov',
  email: 'urfanzeynalov7@gmail.com',
};

// Inventory tiers. `icon` picks a pixel glyph from src/pages/icons.js.
export const skills = {
  unlocked: [
    { name: 'Arduino Uno R3', icon: 'board' },
    { name: 'SolidWorks', icon: 'cube' },
    { name: 'Soldering', icon: 'iron' },
    { name: 'Tinkercad', icon: 'breadboard' },
    { name: 'Multimeter + logic analyzer', icon: 'probe' },
  ],
  leveling: [
    { name: 'STM32', icon: 'chip' },
    { name: 'Embedded C', icon: 'code' },
    { name: 'Circuit theory', icon: 'circuit' },
    { name: 'LTspice', icon: 'wave' },
    { name: 'Python', icon: 'code' },
  ],
  locked: [
    { name: 'KiCad', icon: 'pcb' },
    { name: 'Motor control', icon: 'gear' },
    { name: 'RTOS', icon: 'clock' },
    { name: 'ROS', icon: 'robot' },
    { name: 'Sensor fusion', icon: 'compass' },
    { name: 'Embedded Linux', icon: 'term' },
  ],
};
