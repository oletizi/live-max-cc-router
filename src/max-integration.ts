/**
 * Main Max for Live integration file
 * This file provides the Max interface functions and handles the integration
 */

import { CCRouter } from '@/cc-router';

// Max for Live global configuration
autowatch = 1;
outlets = 3; // 0: debug display, 1: build timestamp, 2: extra
inlets = 2; // inlet 0: MIDI, inlet 1: live.thisdevice notifications

// Global router instance - used by all functions below
// @ts-ignore - prevent tree-shaking removal
var ccRouter: CCRouter;
var liveReady = false;

/**
 * Called when live.thisdevice sends a bang (Live API is ready)
 */
function bang(): void {
  if (!liveReady) {
    liveReady = true;
    post("CC Router: Live API ready (bang received), initializing...\n");
    initializeRouter();
  }
}

/**
 * Called for other messages from live.thisdevice
 */
function anything(): void {
  const message = messagename;
  post("CC Router: Received message '" + message + "' from live.thisdevice\n");
}

/**
 * Called when the Max object loads
 */
function loadbang(): void {
  post("CC Router: Waiting for Live API to initialize...\n");
  outlet(0, "set", "Initializing...");
}

/**
 * Initialize the router once Live API is ready
 */
function initializeRouter(): void {
  ccRouter = new CCRouter();
  ccRouter.setupLiveAPI();

  // Get current timestamp
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const timestamp = hours + ":" + minutes + ":" + seconds;

  post("CC Router for Max for Live v1.0 loaded at " + timestamp + "\n");
  post("Launch Control XL3 CC 13-20 mapped to device 0 parameters 0-7\n");
  post("Type 'help' for available commands\n");

  // Initialize router
  ccRouter.setDebugMode(true);
  ccRouter.printConfiguration();

  // Send status to display
  outlet(0, "set", "CC Router v1.0 - Ready");

  // Send build timestamp to display
  outlet(1, "set", "Build: " + timestamp);

  // Show available devices on the track
  post("\n=== Track Device Chain ===\n");
  const devices = ccRouter.getSelectedTrackDevices();
  if (devices.length > 0) {
    for (let i = 0; i < devices.length; i++) {
      post("Device " + i + ": " + devices[i].name + " (" + devices[i].parameterCount + " params)\n");
    }
  } else {
    post("No devices found on track\n");
  }
  post("========================\n\n");
}

/**
 * Handle incoming MIDI CC messages from midiparse
 * Input format: [ccNumber, value] where midiparse outlet 2 sends controller messages
 */
function list(): void {
  const args = arrayfromargs(arguments);

  if (args.length < 2) {
    post("Invalid MIDI format (expected 2 values, got " + args.length + ")\n");
    return;
  }

  // midiparse outlet 2 sends: [ccNumber, value]
  const ccNumber = args[0];
  const value = args[1];

  // Send status to display
  outlet(0, "set", "RX: CC" + ccNumber + "=" + value);

  // Only route if ccRouter is initialized
  if (!ccRouter) {
    post("CC Router: Received MIDI before initialization complete\n");
    return;
  }

  // Route through CCRouter (channel is always 0 since midiparse strips it)
  ccRouter.handleCCMessage(ccNumber, value, 0);
}

function setmapping(): void {
  const args = arrayfromargs(arguments);
  if (args.length < 3) {
    error("Usage: setmapping <ccNumber> <deviceIndex> <parameterIndex> [parameterName] [curve]\n");
    return;
  }
  const ccNumber = args[0];
  const deviceIndex = args[1];
  const parameterIndex = args[2];
  const parameterName = args.length > 3 ? args[3] : undefined;
  const curve = args.length > 4 ? args[4] : 'linear';
  ccRouter.setMapping(ccNumber, deviceIndex, parameterIndex, parameterName, curve);
}

function removemapping(ccNumber: number): void {
  ccRouter.removeMapping(ccNumber);
}

function debug(enabled: number): void {
  ccRouter.setDebugMode(enabled === 1);
}

function testcc(ccNumber: number, value: number): void {
  ccRouter.handleCCMessage(ccNumber, value, 0);
}

function config(): void {
  ccRouter.printConfiguration();
}

function trackinfo(): void {
  const trackInfo = ccRouter.getSelectedTrackInfo();
  if (trackInfo) {
    post("Selected Track: " + trackInfo.name + " (ID: " + trackInfo.id + ")\n");
    post("Devices: " + trackInfo.deviceCount + "\n");
    const devices = ccRouter.getSelectedTrackDevices();
    for (let i = 0; i < devices.length; i++) {
      const device = devices[i];
      post("  Device " + device.index + ": " + device.name + " (" + device.parameterCount + " parameters)\n");
    }
  } else {
    post("No track selected\n");
  }
}

/**
 * Auto-apply canonical mapping for detected plugin
 * Usage: automap [deviceIndex]
 */
function automap(deviceIndex?: number): void {
  if (!ccRouter) {
    post("CC Router: Not initialized\n");
    return;
  }
  ccRouter.autoApplyCanonicalMapping(deviceIndex);
}

function setupfor(pluginType: string): void {
  // ...
}

/*
// Unused functions commented out for reference

function msg_int(value: number): void {
  ccRouter.handleCCMessage(13, value, 0);
}

function msg_float(value: number): void {
  const midiValue = Math.round(value * 127);
  ccRouter.handleCCMessage(13, midiValue, 0);
}

function setupEQ8Mappings(): void {
  // ...
}

function setupCompressorMappings(): void {
  // ...
}

function setupReverbMappings(): void {
  // ...
}

function setupOperatorMappings(): void {
  // ...
}

function track_observer(): void {
  const trackInfo = ccRouter.getSelectedTrackInfo();
  if (trackInfo) {
    post("Track selection changed to: " + trackInfo.name + "\n");
  }
}

function help(): void {
  post("=== CC Router Commands ===\n");
  post("loadbang - Reload the router\n");
  post("config - Show current configuration\n");
  post("trackinfo - Show selected track information\n");
  post("debug <0|1> - Toggle debug mode\n");
  post("testcc <ccNumber> <value> - Test a CC message\n");
  post("setmapping <cc> <device> <param> [name] [curve] - Add/update mapping\n");
  post("removemapping <cc> - Remove mapping\n");
  post("setupfor <plugin> - Configure for specific plugin (eq8, compressor, reverb, operator)\n");
  post("help - Show this help\n");
}

function bang(): void {
  trackinfo();
}

function closebang(): void {
  post("CC Router closed\n");
}
*/

// IMPORTANT: Functions are already declared at top level and accessible to Max v8
// No need for explicit global assignment - v8 object sees top-level declarations