/**
 * Main Max for Live integration file
 * This file provides the Max interface functions and handles the integration
 */

import { CCRouter } from '@/cc-router';
import { ParameterMapping } from '@/types';

// Max for Live global configuration
autowatch = 1;
outlets = 2;
inlets = 1;

// Global router instance
const ccRouter = new CCRouter();

/**
 * Called when the Max object loads
 */
function loadbang(): void {
  post("CC Router for Max for Live v1.0 loaded\n");
  post("Launch Control XL3 CC 13-20 mapped to device 0 parameters 0-7\n");
  post("Type 'help' for available commands\n");
  
  // Initialize router
  ccRouter.setDebugMode(true);
  ccRouter.printConfiguration();
}

/**
 * Handle incoming MIDI messages
 * Input format: [status, data1, data2]
 */
function list(): void {
  const args = arrayfromargs(arguments);
  
  if (args.length < 3) {
    error("CC Router: Invalid MIDI message format\n");
    return;
  }
  
  const status = args[0];
  const data1 = args[1];
  const data2 = args[2];
  
  // Check if it's a CC message (0xB0-0xBF)
  if ((status & 0xF0) === 0xB0) {
    const channel = status & 0x0F;
    const ccNumber = data1;
    const value = data2;
    
    ccRouter.handleCCMessage(ccNumber, value, channel);
  }
}

/**
 * Handle integer input (for testing single CC values)
 */
function msg_int(value: number): void {
  // Test with CC 13 by default
  ccRouter.handleCCMessage(13, value, 0);
}

/**
 * Handle float input (for testing normalized values)
 */
function msg_float(value: number): void {
  // Convert float (0-1) to MIDI range (0-127) and test with CC 13
  const midiValue = Math.round(value * 127);
  ccRouter.handleCCMessage(13, midiValue, 0);
}

/**
 * Set a parameter mapping
 * Usage: setmapping <ccNumber> <deviceIndex> <parameterIndex> [parameterName] [curve]
 */
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

/**
 * Remove a parameter mapping
 * Usage: removemapping <ccNumber>
 */
function removemapping(ccNumber: number): void {
  ccRouter.removeMapping(ccNumber);
}

/**
 * Toggle debug mode
 * Usage: debug <0|1>
 */
function debug(enabled: number): void {
  ccRouter.setDebugMode(enabled === 1);
}

/**
 * Test a specific CC message
 * Usage: testcc <ccNumber> <value>
 */
function testcc(ccNumber: number, value: number): void {
  ccRouter.handleCCMessage(ccNumber, value, 0);
}

/**
 * Print current configuration
 */
function config(): void {
  ccRouter.printConfiguration();
}

/**
 * Get track information
 */
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
 * Set up mappings for a specific plugin
 * Usage: setupfor <pluginType>
 */
function setupfor(pluginType: string): void {
  switch (pluginType.toLowerCase()) {
    case 'eq8':
    case 'eq-eight':
      setupEQ8Mappings();
      break;
    case 'compressor':
      setupCompressorMappings();
      break;
    case 'reverb':
      setupReverbMappings();
      break;
    case 'operator':
      setupOperatorMappings();
      break;
    default:
      post("Unknown plugin type: " + pluginType + "\n");
      post("Available presets: eq8, compressor, reverb, operator\n");
      break;
  }
}

/**
 * Set up EQ Eight mappings
 */
function setupEQ8Mappings(): void {
  ccRouter.setMapping(13, 0, 1, "EQ8 - Band 1 Freq", "exponential");
  ccRouter.setMapping(14, 0, 2, "EQ8 - Band 1 Gain", "linear");
  ccRouter.setMapping(15, 0, 4, "EQ8 - Band 2 Freq", "exponential");
  ccRouter.setMapping(16, 0, 5, "EQ8 - Band 2 Gain", "linear");
  ccRouter.setMapping(17, 0, 7, "EQ8 - Band 3 Freq", "exponential");
  ccRouter.setMapping(18, 0, 8, "EQ8 - Band 3 Gain", "linear");
  ccRouter.setMapping(19, 0, 10, "EQ8 - Band 4 Freq", "exponential");
  ccRouter.setMapping(20, 0, 11, "EQ8 - Band 4 Gain", "linear");
  
  post("EQ Eight mappings configured\n");
}

/**
 * Set up Compressor mappings
 */
function setupCompressorMappings(): void {
  ccRouter.setMapping(13, 0, 0, "Compressor - Threshold", "linear");
  ccRouter.setMapping(14, 0, 1, "Compressor - Ratio", "exponential");
  ccRouter.setMapping(15, 0, 2, "Compressor - Attack", "logarithmic");
  ccRouter.setMapping(16, 0, 3, "Compressor - Release", "logarithmic");
  ccRouter.setMapping(17, 0, 4, "Compressor - Makeup", "linear");
  ccRouter.setMapping(18, 0, 5, "Compressor - Knee", "linear");
  ccRouter.setMapping(19, 0, 6, "Compressor - Model", "linear");
  ccRouter.setMapping(20, 0, 7, "Compressor - Peak/RMS", "linear");
  
  post("Compressor mappings configured\n");
}

/**
 * Set up Reverb mappings
 */
function setupReverbMappings(): void {
  ccRouter.setMapping(13, 0, 0, "Reverb - PreDelay", "linear");
  ccRouter.setMapping(14, 0, 1, "Reverb - Input HPF", "exponential");
  ccRouter.setMapping(15, 0, 2, "Reverb - Input LPF", "exponential");
  ccRouter.setMapping(16, 0, 3, "Reverb - DecayTime", "exponential");
  ccRouter.setMapping(17, 0, 4, "Reverb - Freeze", "linear");
  ccRouter.setMapping(18, 0, 5, "Reverb - Room Size", "linear");
  ccRouter.setMapping(19, 0, 6, "Reverb - Stereo Image", "linear");
  ccRouter.setMapping(20, 0, 7, "Reverb - Dry/Wet", "linear");
  
  post("Reverb mappings configured\n");
}

/**
 * Set up Operator mappings
 */
function setupOperatorMappings(): void {
  ccRouter.setMapping(13, 0, 0, "Operator - A Level", "linear");
  ccRouter.setMapping(14, 0, 1, "Operator - A Coarse", "linear");
  ccRouter.setMapping(15, 0, 2, "Operator - A Fine", "linear");
  ccRouter.setMapping(16, 0, 3, "Operator - B Level", "linear");
  ccRouter.setMapping(17, 0, 4, "Operator - B Coarse", "linear");
  ccRouter.setMapping(18, 0, 5, "Operator - B Fine", "linear");
  ccRouter.setMapping(19, 0, 6, "Operator - Filter Freq", "exponential");
  ccRouter.setMapping(20, 0, 7, "Operator - Filter Res", "linear");
  
  post("Operator mappings configured\n");
}

/**
 * Observer callback for track selection changes
 */
function track_observer(): void {
  const trackInfo = ccRouter.getSelectedTrackInfo();
  
  if (trackInfo) {
    post("Track selection changed to: " + trackInfo.name + "\n");
  }
}

/**
 * Help function - shows available commands
 */
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

/**
 * Bang function - useful for triggering actions
 */
function bang(): void {
  trackinfo();
}

/**
 * Called when the object is deleted
 */
function closebang(): void {
  post("CC Router closed\n");
}

// Export functions for Max to access after bundling
export {
  loadbang,
  bang,
  closebang,
  list,
  msg_int,
  msg_float,
  setmapping,
  removemapping,
  debug,
  testcc,
  config,
  trackinfo,
  setupfor,
  help,
  track_observer
};