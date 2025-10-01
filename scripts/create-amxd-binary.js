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
        // Info text
        {
          "box": {
            "id": "obj-info",
            "maxclass": "comment",
            "numinlets": 1,
            "numoutlets": 0,
            "patching_rect": [15.0, 35.0, 400.0, 20.0],
            "presentation": 1,
            "presentation_rect": [10.0, 35.0, 400.0, 20.0],
            "text": "Routes CC 13-20 to device parameters on selected track"
          }
        },
        // JavaScript object with correct path
        {
          "box": {
            "id": "obj-js",
            "maxclass": "newobj",
            "numinlets": 1,
            "numoutlets": 2,
            "outlettype": ["", ""],
            "patching_rect": [15.0, 150.0, 200.0, 22.0],
            "saved_object_attributes": {
              "autowatch": 1,
              "filename": "code/cc-router.js",
              "parameter_enable": 0
            },
            "text": "js code/cc-router.js @autowatch 1"
          }
        },
        // Live object for getting MIDI
        {
          "box": {
            "id": "obj-live-object",
            "maxclass": "newobj",
            "numinlets": 2,
            "numoutlets": 1,
            "outlettype": [""],
            "patching_rect": [15.0, 50.0, 100.0, 22.0],
            "text": "live.thisdevice"
          }
        },
        // MIDI input from Live
        {
          "box": {
            "id": "obj-midiin",
            "maxclass": "newobj",
            "numinlets": 1,
            "numoutlets": 1,
            "outlettype": ["int"],
            "patching_rect": [15.0, 80.0, 50.0, 22.0],
            "text": "midiin"
          }
        },
        // MIDI parse
        {
          "box": {
            "id": "obj-midiparse",
            "maxclass": "newobj",
            "numinlets": 1,
            "numoutlets": 7,
            "outlettype": ["", "", "", "int", "int", "int", "int"],
            "patching_rect": [15.0, 110.0, 100.0, 22.0],
            "text": "midiparse"
          }
        },
        // Pack CC data into list
        {
          "box": {
            "id": "obj-pack",
            "maxclass": "newobj",
            "numinlets": 2,
            "numoutlets": 1,
            "outlettype": [""],
            "patching_rect": [130.0, 110.0, 50.0, 22.0],
            "text": "pack 0 0"
          }
        },
        // Prepend 'list' message
        {
          "box": {
            "id": "obj-prepend",
            "maxclass": "newobj",
            "numinlets": 1,
            "numoutlets": 1,
            "outlettype": [""],
            "patching_rect": [130.0, 135.0, 50.0, 22.0],
            "text": "prepend list"
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
            "patching_rect": [250.0, 50.0, 60.0, 22.0],
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
            "patching_rect": [250.0, 80.0, 60.0, 22.0],
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
            "patching_rect": [400.0, 50.0, 50.0, 22.0],
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
            "patching_rect": [460.0, 50.0, 50.0, 22.0],
            "text": "in~ 2"
          }
        },
        // Audio outputs for pass-through
        {
          "box": {
            "id": "obj-out-1",
            "maxclass": "newobj",
            "numinlets": 1,
            "numoutlets": 0,
            "patching_rect": [400.0, 150.0, 50.0, 22.0],
            "text": "out~ 1"
          }
        },
        {
          "box": {
            "id": "obj-out-2",
            "maxclass": "newobj",
            "numinlets": 1,
            "numoutlets": 0,
            "patching_rect": [460.0, 150.0, 50.0, 22.0],
            "text": "out~ 2"
          }
        }
      ],
      "lines": [
        // MIDI input to parse
        {
          "patchline": {
            "destination": ["obj-midiparse", 0],
            "source": ["obj-midiin", 0]
          }
        },
        // CC number to pack
        {
          "patchline": {
            "destination": ["obj-pack", 0],
            "source": ["obj-midiparse", 2]
          }
        },
        // CC value to pack
        {
          "patchline": {
            "destination": ["obj-pack", 1],
            "source": ["obj-midiparse", 3]
          }
        },
        // Pack to prepend
        {
          "patchline": {
            "destination": ["obj-prepend", 0],
            "source": ["obj-pack", 0]
          }
        },
        // Prepend to JS
        {
          "patchline": {
            "destination": ["obj-js", 0],
            "source": ["obj-prepend", 0]
          }
        },
        // Loadbang to message
        {
          "patchline": {
            "destination": ["obj-loadmsg", 0],
            "source": ["obj-loadbang", 0]
          }
        },
        // Loadbang message to JS
        {
          "patchline": {
            "destination": ["obj-js", 0],
            "source": ["obj-loadmsg", 0]
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
          "name": "code/cc-router.js",
          "bootpath": "~/Music/Ableton/User Library/Presets/Audio Effects/Max Audio Effect/cc-router",
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