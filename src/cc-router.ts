/**
 * CC Router for Max for Live - TypeScript Implementation
 * Routes MIDI CC messages to parameters on the currently selected track
 */

import { ParameterMapping, LiveAPIObject, TrackInfo, DeviceInfo } from '@/types';
import { CANONICAL_PLUGIN_MAPS, getPluginMapping } from '@/canonical-plugin-maps';

export class CCRouter {
  private mappings: ParameterMapping[] = [];
  private selectedTrackId: number = -1;
  private liveAPI: LiveAPIObject | null = null;
  private debugMode: boolean = true;

  constructor() {
    this.initializeDefaultMappings();
    // Don't call setupLiveAPI in constructor - causes crash
    // Call it explicitly from loadbang() instead
  }

  /**
   * Initialize default Launch Control XL3 mappings
   * NOTE: Device index 0 is the cc-router itself, so we target device 1 (first plugin after cc-router)
   */
  private initializeDefaultMappings(): void {
    this.mappings = [
      { ccNumber: 13, deviceIndex: 1, parameterIndex: 0, parameterName: 'Knob 1', curve: 'linear' },
      { ccNumber: 14, deviceIndex: 1, parameterIndex: 1, parameterName: 'Knob 2', curve: 'linear' },
      { ccNumber: 15, deviceIndex: 1, parameterIndex: 2, parameterName: 'Knob 3', curve: 'linear' },
      { ccNumber: 16, deviceIndex: 1, parameterIndex: 3, parameterName: 'Knob 4', curve: 'linear' },
      { ccNumber: 17, deviceIndex: 1, parameterIndex: 4, parameterName: 'Knob 5', curve: 'linear' },
      { ccNumber: 18, deviceIndex: 1, parameterIndex: 5, parameterName: 'Knob 6', curve: 'linear' },
      { ccNumber: 19, deviceIndex: 1, parameterIndex: 6, parameterName: 'Knob 7', curve: 'linear' },
      { ccNumber: 20, deviceIndex: 1, parameterIndex: 7, parameterName: 'Knob 8', curve: 'linear' }
    ];
  }

  /**
   * Set up Live API connection and observers
   * Must be called after constructor completes
   */
  public setupLiveAPI(): void {
    try {
      this.liveAPI = new LiveAPI("live_set");

      // Skip track observer - causes crash
      // this.setupTrackObserver();

      if (this.debugMode) {
        post("CC Router: Live API initialized (no observer)\n");
      }
    } catch (error) {
      post("CC Router: Failed to initialize Live API - " + error + "\n");
    }
  }

  /**
   * Set up track selection observer
   */
  private setupTrackObserver(): void {
    try {
      const observer = new LiveAPI("live_set view");
      observer.property = "selected_track";
      observer.id = "track_observer";
      
      if (this.debugMode) {
        post("CC Router: Track observer setup complete\n");
      }
    } catch (error) {
      error("CC Router: Failed to setup track observer - " + error + "\n");
    }
  }

  /**
   * Handle incoming MIDI CC message
   */
  public handleCCMessage(ccNumber: number, value: number, channel: number): void {
    const mapping = this.findMapping(ccNumber);

    if (!mapping) {
      if (this.debugMode) {
        post("CC Router: No mapping found for CC " + ccNumber + "\n");
        outlet(0, "set", "CC" + ccNumber + " - No mapping");
      }
      return;
    }

    if (this.debugMode) {
      post("CC Router: Processing CC " + ccNumber + " = " + value + " -> Device[" + mapping.deviceIndex + "] Param[" + mapping.parameterIndex + "]\n");
    }

    this.routeToSelectedTrack(mapping, value);
  }

  /**
   * Find mapping for given CC number
   */
  private findMapping(ccNumber: number): ParameterMapping | null {
    for (let i = 0; i < this.mappings.length; i++) {
      if (this.mappings[i].ccNumber === ccNumber) {
        return this.mappings[i];
      }
    }
    return null;
  }

  /**
   * Route CC value to parameter on selected track
   */
  private routeToSelectedTrack(mapping: ParameterMapping, value: number): void {
    try {
      const selectedTrack = new LiveAPI("live_set view selected_track");

      if (!selectedTrack || selectedTrack.id === "0") {
        if (this.debugMode) {
          post("CC Router: No track selected\n");
          outlet(0, "set", "ERROR: No track selected");
        }
        return;
      }

      // Check if device exists
      const devices = selectedTrack.get("devices");
      const trackName = selectedTrack.get("name");

      if (this.debugMode) {
        post("CC Router: Track '" + trackName + "' has " + devices.length + " devices\n");
      }

      if (mapping.deviceIndex >= devices.length) {
        if (this.debugMode) {
          post("CC Router: ERROR - Device[" + mapping.deviceIndex + "] not found\n");
          post("  Track: " + trackName + "\n");
          post("  Available devices: " + devices.length + " (indices 0-" + (devices.length - 1) + ")\n");

          // List all devices
          for (let i = 0; i < devices.length; i++) {
            const dev = new LiveAPI("live_set view selected_track devices " + i);
            post("    Device[" + i + "]: " + dev.get("name") + "\n");
          }

          outlet(0, "set", "ERROR: Dev[" + mapping.deviceIndex + "] not found (have " + devices.length + ")");
        }
        return;
      }

      // Get target device
      const devicePath = "live_set view selected_track devices " + mapping.deviceIndex;
      const targetDevice = new LiveAPI(devicePath);
      const deviceName = targetDevice.get("name");

      // Check if parameter exists
      const parameters = targetDevice.get("parameters");
      if (mapping.parameterIndex >= parameters.length) {
        if (this.debugMode) {
          post("CC Router: ERROR - Parameter[" + mapping.parameterIndex + "] not found\n");
          post("  Device[" + mapping.deviceIndex + "]: " + deviceName + "\n");
          post("  Available parameters: " + parameters.length + " (indices 0-" + (parameters.length - 1) + ")\n");

          // List first 10 params
          const maxShow = Math.min(10, parameters.length);
          for (let i = 0; i < maxShow; i++) {
            const pName = targetDevice.get("parameters " + i + " name");
            post("    Param[" + i + "]: " + pName + "\n");
          }
          if (parameters.length > 10) {
            post("    ... and " + (parameters.length - 10) + " more\n");
          }

          outlet(0, "set", "ERROR: Param[" + mapping.parameterIndex + "] not found (have " + parameters.length + ")");
        }
        return;
      }

      // Transform value
      const normalizedValue = this.transformValue(value, mapping);

      // Create LiveAPI for the specific parameter
      const parameterPath = "live_set view selected_track devices " + mapping.deviceIndex + " parameters " + mapping.parameterIndex;
      const parameter = new LiveAPI(parameterPath);

      // Set parameter value
      parameter.set("value", normalizedValue);

      if (this.debugMode) {
        const paramName = parameter.get("name");

        post("CC Router: SUCCESS!\n");
        post("  Track: " + trackName + "\n");
        post("  Device[" + mapping.deviceIndex + "]: " + deviceName + "\n");
        post("  Param[" + mapping.parameterIndex + "]: " + paramName + "\n");
        post("  Value: " + value + " (MIDI) -> " + normalizedValue.toFixed(3) + " (normalized)\n");

        // Send success message to display
        outlet(0, "set", "OK: Dev[" + mapping.deviceIndex + "]:" + deviceName + " > " + paramName + "=" + normalizedValue.toFixed(2));
      }

    } catch (error) {
      error("CC Router: Error routing CC - " + error + "\n");
      outlet(0, "set", "ERROR: " + error);
    }
  }

  /**
   * Transform MIDI value (0-127) to parameter value with curve and range
   */
  private transformValue(midiValue: number, mapping: ParameterMapping): number {
    // Normalize to 0-1
    let normalized = midiValue / 127.0;
    
    // Apply curve
    switch (mapping.curve) {
      case 'exponential':
        normalized = normalized * normalized;
        break;
      case 'logarithmic':
        normalized = Math.sqrt(normalized);
        break;
      case 'linear':
      default:
        // No transformation needed
        break;
    }
    
    // Apply min/max range if specified
    if (mapping.minValue !== undefined && mapping.maxValue !== undefined) {
      normalized = mapping.minValue + (normalized * (mapping.maxValue - mapping.minValue));
    }
    
    return normalized;
  }

  /**
   * Add or update a parameter mapping
   */
  public setMapping(ccNumber: number, deviceIndex: number, parameterIndex: number, parameterName?: string, curve?: 'linear' | 'exponential' | 'logarithmic'): void {
    const existingIndex = this.mappings.findIndex(m => m.ccNumber === ccNumber);
    
    const mapping: ParameterMapping = {
      ccNumber: ccNumber,
      deviceIndex: deviceIndex,
      parameterIndex: parameterIndex,
      parameterName: parameterName || ("CC " + ccNumber + " -> Param " + parameterIndex),
      curve: curve || 'linear'
    };

    if (existingIndex >= 0) {
      this.mappings[existingIndex] = mapping;
    } else {
      this.mappings.push(mapping);
    }

    if (this.debugMode) {
      post("CC Router: Updated mapping CC " + ccNumber + " -> Device " + deviceIndex + " Param " + parameterIndex + "\n");
    }
  }

  /**
   * Remove a parameter mapping
   */
  public removeMapping(ccNumber: number): void {
    this.mappings = this.mappings.filter(m => m.ccNumber !== ccNumber);

    if (this.debugMode) {
      post("CC Router: Removed mapping for CC " + ccNumber + "\n");
    }
  }

  /**
   * Auto-detect plugin on selected track and apply canonical mapping if available
   */
  public autoApplyCanonicalMapping(deviceIndex?: number): void {
    try {
      const selectedTrack = new LiveAPI("live_set view selected_track");

      if (!selectedTrack || selectedTrack.id === "0") {
        post("CC Router: No track selected\n");
        return;
      }

      const devices = selectedTrack.get("devices");
      const targetDeviceIndex = deviceIndex !== undefined ? deviceIndex : 1; // Default to first plugin after cc-router

      if (targetDeviceIndex >= devices.length) {
        post("CC Router: Device index " + targetDeviceIndex + " not found (only " + devices.length + " devices)\n");
        return;
      }

      // Get device name
      const devicePath = "live_set view selected_track devices " + targetDeviceIndex;
      const device = new LiveAPI(devicePath);
      const deviceName = device.get("name");

      post("CC Router: Detected plugin: " + deviceName + "\n");

      // Try to find canonical mapping
      const canonicalMapping = getPluginMapping(deviceName);

      if (canonicalMapping) {
        post("CC Router: Found canonical mapping for " + canonicalMapping.pluginName + "\n");

        // Clear existing mappings
        this.mappings = [];

        // Apply canonical mappings
        const mappingKeys = Object.keys(canonicalMapping.mappings);
        for (let i = 0; i < mappingKeys.length; i++) {
          const ccNumber = parseInt(mappingKeys[i], 10);
          const mapping = canonicalMapping.mappings[ccNumber];

          this.setMapping(
            ccNumber,
            mapping.deviceIndex,
            mapping.parameterIndex,
            mapping.parameterName,
            mapping.curve
          );
        }

        post("CC Router: Applied " + mappingKeys.length + " canonical mappings for " + canonicalMapping.pluginName + "\n");
      } else {
        post("CC Router: No canonical mapping found for " + deviceName + "\n");
        post("CC Router: Available mappings: " + Object.keys(CANONICAL_PLUGIN_MAPS).join(", ") + "\n");
      }
    } catch (error) {
      post("CC Router: Error auto-applying canonical mapping - " + error + "\n");
    }
  }

  /**
   * Get all current mappings
   */
  public getMappings(): ParameterMapping[] {
    return this.mappings.slice(); // Return copy
  }

  /**
   * Set debug mode
   */
  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    post("CC Router: Debug mode " + (enabled ? "enabled" : "disabled") + "\n");
  }

  /**
   * Get information about the currently selected track
   */
  public getSelectedTrackInfo(): TrackInfo | null {
    try {
      const selectedTrack = new LiveAPI("live_set view selected_track");
      
      if (!selectedTrack || selectedTrack.id === "0") {
        return null;
      }

      return {
        id: parseInt(selectedTrack.get("id")),
        name: selectedTrack.get("name"),
        deviceCount: selectedTrack.get("devices").length
      };
    } catch (error) {
      error("CC Router: Error getting track info - " + error + "\n");
      return null;
    }
  }

  /**
   * Get information about devices on the selected track
   */
  public getSelectedTrackDevices(): DeviceInfo[] {
    try {
      const selectedTrack = new LiveAPI("live_set view selected_track");
      
      if (!selectedTrack || selectedTrack.id === "0") {
        return [];
      }

      const devices = selectedTrack.get("devices");
      const deviceInfo: DeviceInfo[] = [];

      for (let i = 0; i < devices.length; i++) {
        const device = new LiveAPI("live_set view selected_track devices " + i);
        const parameters = device.get("parameters");
        
        deviceInfo.push({
          index: i,
          name: device.get("name"),
          parameterCount: parameters.length
        });
      }

      return deviceInfo;
    } catch (error) {
      error("CC Router: Error getting device info - " + error + "\n");
      return [];
    }
  }

  /**
   * Print current configuration for debugging
   */
  public printConfiguration(): void {
    post("=== CC Router Configuration ===\n");
    post("Mappings: " + this.mappings.length + "\n");
    
    for (let i = 0; i < this.mappings.length; i++) {
      const m = this.mappings[i];
      post("  CC " + m.ccNumber + " -> Device " + m.deviceIndex + " Param " + m.parameterIndex + " (" + m.curve + ")\n");
    }
    
    const trackInfo = this.getSelectedTrackInfo();
    if (trackInfo) {
      post("Selected Track: " + trackInfo.name + " (" + trackInfo.deviceCount + " devices)\n");
    } else {
      post("No track selected\n");
    }
  }
}

// Export for Max for Live usage
var ccRouter: CCRouter;