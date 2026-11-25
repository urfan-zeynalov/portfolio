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
// To add pictures or code to a case study, add schematic / photos / code / video to its caseStudy (see Motor Switch Circuit).
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
      { name: 'TMC2209 stepper driver', qty: 1 },
      { name: 'Servo (MG996R / MG90S)', qty: 5 },
      { name: 'MG90S micro servo', qty: 2 },
      { name: 'XL4016 buck converter', qty: 1 },
      { name: 'STM32F103 board', qty: 1 },
    ],
    blurb: 'A desktop robotic arm: a NEMA 17 stepper turns the base, five servos move the joints and gripper, and a tool changer swaps in a small linkage that writes in my handwriting. Run by an STM32F103.',
    repo: null, // add the repo URL here when you make one
    caseStudy: {
      problem: [
        'I wanted one project that teaches the whole of mechatronics at once: motors, kinematics, power and embedded control.',
        'The goal is an arm that picks up small parts and sorts them, then swaps its gripper for a writing tool and writes in my own handwriting.',
      ],
      approach: [
        'A NEMA 17 stepper turns the base through a TMC2209 driver. Five servos, a mix of MG996R and MG90S, drive the shoulder, elbow, wrist pitch, wrist roll and the gripper.',
        'The writing tool is a small 5-bar linkage moved by two more MG90S servos. A tool changer swaps it on in place of the gripper, so the arm makes the big moves and the linkage makes the fine strokes.',
        'An STM32F103 runs everything, and an XL4016 buck converter powers the servos.',
        'Right now the arm is being designed in SolidWorks, and the parts are on their way.',
      ],
      next: 'Assemble the arm when the parts arrive, bring up the stepper and servos on the STM32, then build the tool changer and the handwriting tool.',
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
    blurb: 'Bringing up a bare STM32F103C6T6 board in STM32CubeIDE: flashing it over an ST-Link, blinking the LED, and checking the signals on a 24 MHz logic analyzer.',
    repo: null, // add the repo URL here when you make one
    caseStudy: {
      problem: [
        'Arduino hides most of what a microcontroller is doing. I wanted to learn the layer underneath: clocks, pins, flashing and debugging on a real ARM chip.',
        'The STM32F103 is also the brain of my robotic arm, so learning this board first means the arm starts on solid ground.',
      ],
      approach: [
        'I write the firmware in STM32CubeIDE and flash it over SWD with an ST-Link V2.',
        'The first milestone was the classic one: a blinking LED. Then I put the pin on a 24 MHz USB logic analyzer to see the real timing instead of trusting my eyes.',
      ],
      next: 'Next on the board: UART, timers and PWM, interrupts, I2C and the ADC. After that, STEP and DIR signals to the TMC2209 so it can drive the stepper in the robotic arm.',
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
      { name: 'Transistor', qty: 1 },
      { name: 'Flyback diode', qty: 1 },
      { name: 'Potentiometer', qty: 1 },
    ],
    blurb: 'Speed control for an F130 DC motor from an Arduino Uno R3: the duty cycle of a PWM signal sets the average voltage the motor sees.',
    repo: null, // add the repo URL here when you make one
    caseStudy: {
      problem: [
        'Switching a motor on and off is easy. Controlling how fast it spins is the next step, and an Arduino pin only gives 0 V or 5 V, nothing in between.',
        'PWM gets around that: switch the pin fast enough and the motor responds to the average voltage, so the duty cycle sets the speed.',
      ],
      approach: [
        'A potentiometer on an analog input sets the speed. The Arduino reads it (0 to 1023), maps it to 0 to 255, and writes that duty cycle to a PWM pin with analogWrite.',
        'The PWM pin drives a transistor that switches the F130 motor, with a flyback diode across the motor for the same reason as in my Motor Switch circuit.',
        'I simulated it in Tinkercad first, then built it on a real breadboard.',
      ],
      next: 'Port it to the STM32 and do the same speed control with its hardware timers.',
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
      { name: '2N2222 NPN transistor', qty: 1 },
      { name: '1N4007 flyback diode', qty: 1 },
      { name: '1 kΩ resistor', qty: 1 },
      { name: '9 V battery', qty: 1 },
    ],
    blurb: 'An Arduino switching a DC motor through a transistor, with a flyback diode catching the voltage kick when the motor turns off. Built in Tinkercad.',
    repo: `${GH}/DC-Motor-Switching-Circuit`,
    caseStudy: {
      problem: [
        'A DC motor needs far more current than an Arduino pin can give. The Uno R3 tops out at 40 mA per pin, and pushing a motor straight from it risks the board.',
        'I wanted a small 5 V signal from the Arduino to switch a motor running on its own 9 V battery, and to do it safely. It was also my first time using Tinkercad.',
      ],
      approach: [
        'Pin 9 drives a 2N2222 NPN transistor through a 1 kΩ base resistor. That keeps the base current near 4.3 mA ((5 V − 0.7 V) / 1 kΩ), well inside the pin limit while still switching the transistor fully on.',
        'The motor sits between the battery and the collector, so the transistor works as a low-side switch. The Arduino ground and the battery ground are tied together, otherwise the base current has no return path.',
        'A 1N4007 diode sits across the motor, reverse-biased. When the transistor switches off, the motor coil kicks back with a voltage spike, and the diode gives it a safe path instead of the transistor.',
        'The sketch turns the motor on and off every second, which proves the Arduino is switching the higher-current circuit.',
      ],
      schematic: { src: 'schematic.png', alt: 'Schematic: Arduino Uno pin 9 through a 1 kΩ resistor to an NPN transistor base; the motor between the 9 V battery and the collector, with a diode across the motor.', w: 1240, h: 610, caption: 'Schematic exported from Tinkercad.' },
      code: `// DC Motor Switching Circuit
// Turns a DC motor on and off every second using an NPN transistor (2N2222)
// as a low-side switch. Pin 9 drives the transistor base through a 1 kΩ resistor.

const int MOTOR_PIN = 9;   // Arduino pin connected to the transistor base

void setup() {
  pinMode(MOTOR_PIN, OUTPUT);
}

void loop() {
  digitalWrite(MOTOR_PIN, HIGH);  // Transistor on  → motor runs
  delay(1000);                    // Wait 1 second
  digitalWrite(MOTOR_PIN, LOW);   // Transistor off → motor stops
  delay(1000);                    // Wait 1 second
}`,
      codeNote: 'motor_switching.ino, also in the repo.',
      photos: [
        { src: 'tinkercad-circuit.webp', alt: 'Tinkercad breadboard view: Arduino Uno, NPN transistor, resistor, diode, DC motor and 9 V battery wired together.', w: 800, h: 808, caption: 'The circuit in Tinkercad.' },
        { src: 'tinkercad-sim.webp', alt: 'Tinkercad simulation with the circuit on the left and the Arduino code on the right.', w: 1400, h: 619, caption: 'Circuit and code side by side in the simulator.' },
      ],
      next: 'Rebuild the circuit on a real breadboard and check that it behaves the same as the simulation.',
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
