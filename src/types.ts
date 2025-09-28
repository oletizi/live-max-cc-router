// Max for Live TypeScript definitions
// These types provide IntelliSense and type safety for Max's JavaScript environment

declare global {
  // Max global variables
  var outlets: number;
  var inlets: number;
  var autowatch: number;
  
  // Max global functions
  function post(message: string): void;
  function error(message: string): void;
  function arrayfromargs(args: IArguments, start?: number): any[];
  function outlet(outlet: number, ...args: any[]): void;
  
  // Max object constructor
  var LiveAPI: {
    new (path: string): LiveAPIObject;
  };
}

// LiveAPI object interface
interface LiveAPIObject {
  id: string;
  property: string;
  get(property: string): any;
  set(property: string, value: any): void;
  call(method: string, ...args: any[]): any;
}

// MIDI Message interface
interface MIDIMessage {
  ccNumber: number;
  value: number;
  channel: number;
  timestamp: number;
}

// Parameter mapping configuration
interface ParameterMapping {
  ccNumber: number;
  deviceIndex: number;
  parameterIndex: number;
  parameterName: string;
  minValue?: number;
  maxValue?: number;
  curve: 'linear' | 'exponential' | 'logarithmic';
}

// Track information
interface TrackInfo {
  id: number;
  name: string;
  deviceCount: number;
}

// Device information
interface DeviceInfo {
  index: number;
  name: string;
  parameterCount: number;
}

// Configuration object for the CC router
interface CCRouterConfig {
  mappings: ParameterMapping[];
  debugMode: boolean;
  selectedTrackOnly: boolean;
}

export {
  MIDIMessage,
  ParameterMapping,
  TrackInfo,
  DeviceInfo,
  CCRouterConfig,
  LiveAPIObject
};
