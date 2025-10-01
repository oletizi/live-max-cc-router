#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create proper Max for Live device with binary header
function createAMXDBinary(deviceContent) {
  // Convert the device content to JSON string with proper formatting
  const jsonContent = JSON.stringify(deviceContent, null, '\t');
  const jsonBuffer = Buffer.from(jsonContent, 'utf8');

  // Create the binary header for .amxd format
  // This is based on the structure: ampf [size] aaaa meta [size] [1] ptch [size] [json]
  const header = Buffer.concat([
    Buffer.from('ampf', 'utf8'),           // File signature
    Buffer.from([0x04, 0x00, 0x00, 0x00]), // Size field
    Buffer.from('aaaa', 'utf8'),           // Section marker
    Buffer.from('meta', 'utf8'),           // Metadata section
    Buffer.from([0x04, 0x00, 0x00, 0x00]), // Metadata size
    Buffer.from([0x01, 0x00, 0x00, 0x00]), // Version
    Buffer.from('ptch', 'utf8'),           // Patch section marker
  ]);

  // Calculate the size of the JSON content and create size buffer (little-endian)
  const sizeBuffer = Buffer.allocUnsafe(4);
  sizeBuffer.writeUInt32LE(jsonBuffer.length, 0);

  // Combine header, size, and JSON content
  return Buffer.concat([header, sizeBuffer, jsonBuffer]);
}

// Create the Max for Live device structure
function createMaxForLiveDevice() {
  return {
    "patcher": {
      "fileversion": 1,
      "appversion": {
        "major": 8,
        "minor": 5,
        "revision": 6,
        "architecture": "x64",
        "modernui": 1
      },
      "classnamespace": "box",
      "rect": [85.0, 104.0, 800.0, 600.0],
      "bglocked": 0,
      "openinpresentation": 1,
      "default_fontsize": 12.0,
      "default_fontface": 0,
      "default_fontname": "Arial",
      "gridonopen": 1,
      "gridsize": [15.0, 15.0],
      "gridsnaponopen": 1,
      "objectsnaponopen": 1,
      "statusbarvisible": 2,
      "toolbarvisible": 1,
      "lefttoolbarpinned": 0,
      "toptoolbarpinned": 0,
      "righttoolbarpinned": 0,
      "bottomtoolbarpinned": 0,
      "toolbars_unpinned_last_save": 0,
      "tallnewobj": 0,
      "boxanimatetime": 200,
      "enablehscroll": 1,
      "enablevscroll": 1,
      "devicewidth": 0.0,
      "description": "CC Router for Launch Control XL3",
      "digest": "",
      "tags": "midi controller",
      "style": "",
      "subpatcher_template": "",
      "assistshowspatchername": 0,
      "boxes": [
        // Title in presentation
        {
          "box": {
            "fontface": 1,
            "fontsize": 14.0,
            "id": "obj-title",
            "maxclass": "comment",
            "numinlets": 1,
            "numoutlets": 0,
            "patching_rect": [15.0, 10.0, 300.0, 22.0],
            "presentation": 1,
            "presentation_rect": [10.0, 10.0, 300.0, 22.0],
            "text": "CC Router for Launch Control XL3"
          }
        },
        // Status LED
        {
          "box": {
            "id": "obj-status-led",
            "maxclass": "led",
            "numinlets": 1,
            "numoutlets": 1,
            "outlettype": ["int"],
            "patching_rect": [350.0, 10.0, 24.0, 24.0],
            "presentation": 1,
            "presentation_rect": [320.0, 12.0, 20.0, 20.0],
            "parameter_enable": 0,
            "oncolor": [0.0, 1.0, 0.0, 1.0]
          }
        },
        // Info text
        {
          "box": {
            "id": "obj-info",
            "maxclass": "comment",
            "numinlets": 1,
            "numoutlets": 0,
            "patching_rect": [15.0, 35.0, 400.0, 20.0],
            "presentation": 1,
            "presentation_rect": [10.0, 35.0, 250.0, 20.0],
            "text": "Routes CC 13-20 to device parameters"
          }
        },
        // Build timestamp
        {
          "box": {
            "id": "obj-build-time",
            "maxclass": "comment",
            "fontsize": 9.0,
            "textcolor": [0.5, 0.5, 0.5, 1.0],
            "numinlets": 1,
            "numoutlets": 0,
            "patching_rect": [350.0, 35.0, 200.0, 17.0],
            "presentation": 1,
            "presentation_rect": [265.0, 38.0, 75.0, 15.0],
            "text": "Build: --:--:--"
          }
        },
        // Debug display
        {
          "box": {
            "id": "obj-debug-display",
            "maxclass": "comment",
            "bgcolor": [0.2, 0.2, 0.2, 1.0],
            "textcolor": [0.0, 1.0, 0.0, 1.0],
            "fontname": "Courier",
            "fontsize": 10.0,
            "numinlets": 1,
            "numoutlets": 0,
            "patching_rect": [15.0, 60.0, 500.0, 18.0],
            "presentation": 1,
            "presentation_rect": [10.0, 58.0, 330.0, 18.0],
            "text": "Waiting for MIDI..."
          }
        },
        // live.thisdevice to detect when Live API is ready
        {
          "box": {
            "id": "obj-thisdevice",
            "maxclass": "newobj",
            "numinlets": 1,
            "numoutlets": 2,
            "outlettype": ["", ""],
            "patching_rect": [15.0, 150.0, 110.0, 22.0],
            "text": "live.thisdevice"
          }
        },
        // V8 JavaScript object with correct path (3 outlets: debug, build-time, extra)
        // Now has 2 inlets: inlet 0 for MIDI, inlet 1 for live.thisdevice notifications
        {
          "box": {
            "id": "obj-js",
            "maxclass": "newobj",
            "numinlets": 2,
            "numoutlets": 3,
            "outlettype": ["", "", ""],
            "patching_rect": [15.0, 200.0, 200.0, 22.0],
            "saved_object_attributes": {
              "autowatch": 1,
              "filename": "cc-router.js",
              "parameter_enable": 0
            },
            "text": "v8 cc-router.js @autowatch 1"
          }
        },
        // MIDI input from Live - using notein for all MIDI
        {
          "box": {
            "id": "obj-notein",
            "maxclass": "newobj",
            "numinlets": 1,
            "numoutlets": 3,
            "outlettype": ["int", "int", "int"],
            "patching_rect": [15.0, 90.0, 60.0, 22.0],
            "text": "notein"
          }
        },
        // Also get CC messages with ctlin
        {
          "box": {
            "id": "obj-ctlin",
            "maxclass": "newobj",
            "numinlets": 1,
            "numoutlets": 3,
            "outlettype": ["int", "int", "int"],
            "patching_rect": [100.0, 90.0, 60.0, 22.0],
            "text": "ctlin"
          }
        },
        // Format CC as MIDI message [status, data1, data2]
        {
          "box": {
            "id": "obj-cc-format",
            "maxclass": "newobj",
            "numinlets": 3,
            "numoutlets": 1,
            "outlettype": [""],
            "patching_rect": [100.0, 120.0, 150.0, 22.0],
            "text": "pack 176 0 0"
          }
        },
        // Calculate status byte from channel (0xB0 + channel - 1)
        {
          "box": {
            "id": "obj-channel-calc",
            "maxclass": "newobj",
            "numinlets": 2,
            "numoutlets": 1,
            "outlettype": ["int"],
            "patching_rect": [200.0, 120.0, 50.0, 22.0],
            "text": "+ 175"
          }
        },
        // Debug message for MIDI input
        {
          "box": {
            "id": "obj-debug-midi",
            "maxclass": "message",
            "numinlets": 2,
            "numoutlets": 1,
            "outlettype": [""],
            "patching_rect": [230.0, 160.0, 200.0, 22.0],
            "text": "MIDI: $1 $2 $3"
          }
        },
        // Send to debug display
        {
          "box": {
            "id": "obj-debug-format",
            "maxclass": "newobj",
            "numinlets": 1,
            "numoutlets": 1,
            "outlettype": [""],
            "patching_rect": [230.0, 185.0, 150.0, 22.0],
            "text": "prepend set"
          }
        },
        // LED blink on MIDI
        {
          "box": {
            "id": "obj-led-blink",
            "maxclass": "newobj",
            "numinlets": 2,
            "numoutlets": 1,
            "outlettype": ["bang"],
            "patching_rect": [350.0, 120.0, 60.0, 22.0],
            "text": "del 100"
          }
        },
        // Loadbang
        {
          "box": {
            "id": "obj-loadbang",
            "maxclass": "newobj",
            "numinlets": 1,
            "numoutlets": 1,
            "outlettype": ["bang"],
            "patching_rect": [15.0, 250.0, 60.0, 22.0],
            "text": "loadbang"
          }
        },
        // Loadbang message
        {
          "box": {
            "id": "obj-loadmsg",
            "maxclass": "message",
            "numinlets": 2,
            "numoutlets": 1,
            "outlettype": [""],
            "patching_rect": [15.0, 280.0, 60.0, 22.0],
            "text": "loadbang"
          }
        },
        // Audio inputs for pass-through
        {
          "box": {
            "id": "obj-in-1",
            "maxclass": "newobj",
            "numinlets": 1,
            "numoutlets": 1,
            "outlettype": ["signal"],
            "patching_rect": [500.0, 50.0, 50.0, 22.0],
            "text": "in~ 1"
          }
        },
        {
          "box": {
            "id": "obj-in-2",
            "maxclass": "newobj",
            "numinlets": 1,
            "numoutlets": 1,
            "outlettype": ["signal"],
            "patching_rect": [560.0, 50.0, 50.0, 22.0],
            "text": "in~ 2"
          }
        },
        // MIDI output to pass CC through
        {
          "box": {
            "id": "obj-ctlout",
            "maxclass": "newobj",
            "numinlets": 3,
            "numoutlets": 0,
            "patching_rect": [100.0, 200.0, 60.0, 22.0],
            "text": "ctlout"
          }
        },
        // Audio outputs for pass-through
        {
          "box": {
            "id": "obj-out-1",
            "maxclass": "newobj",
            "numinlets": 1,
            "numoutlets": 0,
            "patching_rect": [500.0, 200.0, 50.0, 22.0],
            "text": "out~ 1"
          }
        },
        {
          "box": {
            "id": "obj-out-2",
            "maxclass": "newobj",
            "numinlets": 1,
            "numoutlets": 0,
            "patching_rect": [560.0, 200.0, 50.0, 22.0],
            "text": "out~ 2"
          }
        }
      ],
      "lines": [
        // ctlin CC value (outlet 0) to pack inlet 2
        {
          "patchline": {
            "destination": ["obj-cc-format", 2],
            "source": ["obj-ctlin", 0]
          }
        },
        // ctlin CC number (outlet 1) to pack inlet 1
        {
          "patchline": {
            "destination": ["obj-cc-format", 1],
            "source": ["obj-ctlin", 1]
          }
        },
        // ctlin channel (outlet 2) to channel calculator
        {
          "patchline": {
            "destination": ["obj-channel-calc", 0],
            "source": ["obj-ctlin", 2]
          }
        },
        // Channel calculator to pack inlet 0 (status byte)
        {
          "patchline": {
            "destination": ["obj-cc-format", 0],
            "source": ["obj-channel-calc", 0]
          }
        },
        // Pack to JS for processing
        {
          "patchline": {
            "destination": ["obj-js", 0],
            "source": ["obj-cc-format", 0]
          }
        },
        // Pack to debug message
        {
          "patchline": {
            "destination": ["obj-debug-midi", 0],
            "source": ["obj-cc-format", 0]
          }
        },
        // Debug message to format
        {
          "patchline": {
            "destination": ["obj-debug-format", 0],
            "source": ["obj-debug-midi", 0]
          }
        },
        // Format to display
        {
          "patchline": {
            "destination": ["obj-debug-display", 0],
            "source": ["obj-debug-format", 0]
          }
        },
        // MIDI to LED (turn on)
        {
          "patchline": {
            "destination": ["obj-status-led", 0],
            "source": ["obj-cc-format", 0]
          }
        },
        // MIDI to LED blink delay
        {
          "patchline": {
            "destination": ["obj-led-blink", 0],
            "source": ["obj-cc-format", 0]
          }
        },
        // LED blink turns off LED
        {
          "patchline": {
            "destination": ["obj-status-led", 0],
            "source": ["obj-led-blink", 0]
          }
        },
        // Loadbang to message
        {
          "patchline": {
            "destination": ["obj-loadmsg", 0],
            "source": ["obj-loadbang", 0]
          }
        },
        // Loadbang message to JS inlet 0 (for loadbang function)
        {
          "patchline": {
            "destination": ["obj-js", 0],
            "source": ["obj-loadmsg", 0]
          }
        },
        // live.thisdevice outlet 0 to JS inlet 1 (for Live API ready notification)
        {
          "patchline": {
            "destination": ["obj-js", 1],
            "source": ["obj-thisdevice", 0]
          }
        },
        // JS outlet 0 to debug display (for status messages from JS)
        {
          "patchline": {
            "destination": ["obj-debug-display", 0],
            "source": ["obj-js", 0]
          }
        },
        // JS outlet 1 to build time display
        {
          "patchline": {
            "destination": ["obj-build-time", 0],
            "source": ["obj-js", 1]
          }
        },
        // Pass MIDI CC through - value to ctlout
        {
          "patchline": {
            "destination": ["obj-ctlout", 0],
            "source": ["obj-ctlin", 0]
          }
        },
        // Pass MIDI CC through - cc number to ctlout
        {
          "patchline": {
            "destination": ["obj-ctlout", 1],
            "source": ["obj-ctlin", 1]
          }
        },
        // Pass MIDI CC through - channel to ctlout
        {
          "patchline": {
            "destination": ["obj-ctlout", 2],
            "source": ["obj-ctlin", 2]
          }
        },
        // Audio pass-through
        {
          "patchline": {
            "destination": ["obj-out-1", 0],
            "source": ["obj-in-1", 0]
          }
        },
        {
          "patchline": {
            "destination": ["obj-out-2", 0],
            "source": ["obj-in-2", 0]
          }
        }
      ],
      "parameters": {},
      "dependency_cache": [
        {
          "name": "cc-router.js",
          "bootpath": ".",
          "patcherrelativepath": ".",
          "type": "TEXT",
          "implicit": 1
        }
      ],
      "autosave": 0
    }
  };
}

// Export functions
module.exports = {
  createAMXDBinary,
  createMaxForLiveDevice
};