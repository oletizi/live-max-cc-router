/// <reference path="./types.ts" />

/**
 * CC Router for Max for Live - TypeScript Implementation
 * Routes MIDI CC messages to parameters on the currently selected track
 */

class CCRouter {
  private mappings: ParameterMapping[] = [];
  private selectedTrackId: number = -1;
  private liveAPI: LiveAPIObject | null = null;
  private debugMode: boolean = true;

  constructor() {
    this.initializeDefaultMappings();
    this.setupLiveAPI();
  }

  /**
   * Initialize default Launch Control XL3 mappings
   */
  private initializeDefaultMappings(): void {
    this.mappings = [
      { ccNumber: 13, deviceIndex: 0, parameterIndex: 0, parameterName: 'Knob 1', curve: 'linear' },
      { ccNumber: 14, deviceIndex: 0, parameterIndex: 1, parameterName: 'Knob 2', curve: 'linear' },
      { ccNumber: 15, deviceIndex: 0, parameterIndex: 2, parameterName: 'Knob 3', curve: 'linear' },
      { ccNumber: 16, deviceIndex: 0, parameterIndex: 3, parameterName: 'Knob 4', curve: 'linear' },
      { ccNumber: 17, deviceIndex: 0, parameterIndex: 4, parameterName: 'Knob 5', curve: 'linear' },
      { ccNumber: 18, deviceIndex: 0, parameterIndex: 5, parameterName: 'Knob 6', curve: 'linear' },
      { ccNumber: 19, deviceIndex: 0, parameterIndex: 6, parameterName: 'Knob 7', curve: 'linear' },
      { ccNumber: 20, deviceIndex: 0, parameterIndex: 7, parameterName: 'Knob 8', curve: 'linear' }
    ];
  }

  /**
   * Set up Live API connection and observers
   */
  private setupLiveAPI(): void {
    try {
      this.liveAPI = new LiveAPI("live_set");
      this.setupTrackObserver();
      
      if (this.debugMode) {
        post("CC Router: Live API initialized\n");
      }
    } catch (error) {
      error("CC Router: Failed to initialize Live API - " + error + "\n");
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
      }
      return;
    }

    if (this.debugMode) {
      post("CC Router: Processing CC " + ccNumber + " = " + value + " -> " + mapping.parameterName + "\n");
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
        }
        return;
      }

      // Check if device exists
      const devices = selectedTrack.get("devices");
      if (mapping.deviceIndex >= devices.length) {
        if (this.debugMode) {
          post("CC Router: Device " + mapping.deviceIndex + " not found on selected track\n");
        }
        return;
      }

      // Get target device
      const devicePath = "live_set view selected_track devices " + mapping.deviceIndex;
      const targetDevice = new LiveAPI(devicePath);
      
      // Check if parameter exists
      const parameters = targetDevice.get("parameters");
      if (mapping.parameterIndex >= parameters.length) {
        if (this.debugMode) {
          post("CC Router: Parameter " + mapping.parameterIndex + " not found on device\n");
        }
        return;
      }

      // Transform value
      const normalizedValue = this.transformValue(value, mapping);
      
      // Set parameter value
      const paramPath = "parameters " + mapping.parameterIndex + " value";
      targetDevice.set(paramPath, normalizedValue);

      if (this.debugMode) {
        const trackName = selectedTrack.get("name");
        const deviceName = targetDevice.get("name");
        post("CC Router: Set " + trackName + " > " + deviceName + " param " + mapping.parameterIndex + " = " + normalizedValue.toFixed(3) + "\n");
      }

    } catch (error) {
      error("CC Router: Error routing CC - " + error + "\n");
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