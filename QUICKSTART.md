# CC Router Bridge

This is a TypeScript/React application for routing Launch Control XL3 MIDI CC messages to Ableton Live via WebMIDI and OSC.

## Quick Setup

1. **Install pnpm** (if not already installed):
   ```bash
   npm install -g pnpm
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Start development server**:
   ```bash
   pnpm dev
   ```

4. **Install Max for Live device**:
   - Copy `max-device/osc-receiver.js` to your Live set
   - Create Max patcher with `[js osc-receiver.js]`

5. **Open browser** and go to `http://localhost:3000`

## Requirements

- Node.js 18+
- pnpm 8+
- Chrome, Edge, or Opera browser (WebMIDI support)
- Ableton Live with Max for Live
- Launch Control XL3

See README.md for complete documentation.
