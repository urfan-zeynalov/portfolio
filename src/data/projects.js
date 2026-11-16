// ─────────────────────────────────────────────────────────────────────────────
// 13 SYSTEM project data. ONE file drives the character select screen,
// the mini-game loader and every case-study page.
//
// To add a project + game later:
//   1. Drop a module in src/games/<id>.js (copy the shape of src/games/pwm.js).
//   2. Add an entry below with game: '<id>' and status 'clear' or 'progress'.
//   3. (Optional) Put a 64×64 portrait in public/assets/portraits/<id>.png.
// That's it: the select screen, the loader and the case-study page pick it up.
//
// status: 'clear' | 'progress' | 'locked'
// Search this file for [PLACEHOLDER] to find what still needs your real details.
// ─────────────────────────────────────────────────────────────────────────────

export const STATUS = {
  clear: { label: 'CLEAR', long: 'Clear' },
  progress: { label: 'IN PROGRESS', long: 'In progress' },
  locked: { label: 'LOCKED', long: 'Locked' },
};

const GH = 'https://github.com/urfan-zeynalov';

export const projects = [
  {
    slug: 'robotic-arm',
    name: 'Robotic Arm',
    short: 'ARM',
    class: 'Mechatronics',
    status: 'progress',
    game: 'arm',
    portrait: 'arm.png',
    components: [
      { name: 'NEMA 17 stepper', qty: 1 },
      { name: 'Servo motor', qty: 5 },
      { name: 'MG90S micro servo', qty: 2 },
      { name: 'XL4016 buck converter', qty: 1 },
      { name: 'STM32F103 board', qty: 1 },
    ],
    blurb: 'A desktop robotic arm: a NEMA 17 stepper turns the base, servos bend the joints, and an STM32F103 runs the show from an XL4016 buck supply.',
    repo: GH, // [PLACEHOLDER] replace with this project's repo URL
    caseStudy: {
      problem: '[PLACEHOLDER] What problem the arm solves, or what you wanted to learn by building it.',
      approach: '[PLACEHOLDER] How you designed it: why a stepper for the base and servos for the joints, how the STM32 drives them, how the XL4016 powers the servos.',
      next: '[PLACEHOLDER] What is next for the arm (for example the automatic tool change and pen tool).',
    },
  },
  {
    slug: 'stm32-bring-up',
    name: 'STM32 Bring-up',
    short: 'STM32',
    class: 'Embedded',
    status: 'progress',
    game: 'stm32',
    portrait: 'stm32.png',
    components: [
      { name: 'STM32F103C6T6 board', qty: 1 },
      { name: 'ST-Link V2', qty: 1 },
      { name: 'USB logic analyzer 24 MHz', qty: 1 },
    ],
    blurb: 'Bringing up a bare STM32F103C6T6 board: flashing it over ST-Link, then proving the clock, GPIO, UART and interrupts on a 24 MHz logic analyzer.',
    repo: GH, // [PLACEHOLDER] replace with this project's repo URL
    caseStudy: {
      problem: '[PLACEHOLDER] Why you moved from Arduino to bare STM32, and what "brought up" means for this board.',
      approach: '[PLACEHOLDER] Toolchain, how you flash with the ST-Link, and what you checked on the logic analyzer.',
      next: '[PLACEHOLDER] Next steps for the STM32 work.',
    },
  },
  {
    slug: 'pwm-motor-control',
    name: 'PWM Motor Control',
    short: 'PWM',
    class: 'Embedded',
    status: 'clear',
    game: 'pwm',
    portrait: 'pwm.png',
    components: [
      { name: 'Arduino Uno R3', qty: 1 },
      { name: 'F130 DC motor', qty: 1 },
      { name: '[ADD DRIVER PART]', qty: 1 }, // [PLACEHOLDER] your motor driver part
    ],
    blurb: 'Speed control for an F130 DC motor from an Arduino Uno R3: the duty cycle of a PWM signal sets the average voltage the motor sees.',
    repo: GH, // [PLACEHOLDER] replace with this project's repo URL
    caseStudy: {
      problem: '[PLACEHOLDER] What you set out to control and why PWM.',
      approach: '[PLACEHOLDER] Wiring, the driver part, the analogWrite values you used and what you measured.',
      next: '[PLACEHOLDER] Next steps (for example closed-loop speed control).',
    },
  },
  {
    slug: 'motor-switch-circuit',
    name: 'Motor Switch Circuit',
    short: 'SWITCH',
    class: 'Electronics',
    status: 'clear',
    game: 'flyback',
    portrait: 'flyback.png',
    components: [
      { name: 'Arduino Uno R3', qty: 1 },
      { name: 'DC motor', qty: 1 },
      { name: 'Transistor', qty: 1 },
      { name: 'Flyback diode', qty: 1 },
    ],
    blurb: 'An Arduino switching a DC motor through a transistor, with a flyback diode catching the voltage kick when the motor turns off.',
    repo: `${GH}/DC-Motor-Switching-Circuit`,
    caseStudy: {
      problem: '[PLACEHOLDER] Why a microcontroller pin cannot drive a motor directly.',
      approach: '[PLACEHOLDER] Which transistor and diode you used, base resistor value, and how you tested it.',
      next: '[PLACEHOLDER] Next steps.',
    },
  },
  {
    slug: 'self-balancing-bot',
    name: 'Self-Balancing Bot',
    short: '???',
    class: 'Robotics',
    status: 'locked',
    game: null,
    portrait: null,
    components: [],
    blurb: 'Coming soon. Unlocks in Torino.',
    repo: null,
    caseStudy: null,
  },
  {
    slug: 'bldc-driver-pcb',
    name: 'BLDC Driver PCB',
    short: '???',
    class: 'Electronics',
    status: 'locked',
    game: null,
    portrait: null,
    components: [],
    blurb: 'Coming soon. Unlocks in Torino.',
    repo: null,
    caseStudy: null,
  },
];

export const playable = p => p.status !== 'locked' && !!p.game;
