#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const SOURCE_FILE = path.join(__dirname, '..', 'dist', 'max-integration.js');
const PROJECT_NAME = 'cc-router';

// Platform-specific Max for Live paths
function getMaxForLivePaths() {
  const platform = os.platform();
  const homeDir = os.homedir();
  
  const paths = [];
  
  if (platform === 'darwin') { // macOS
    paths.push(
      path.join(homeDir, 'Music', 'Ableton', 'User Library', 'Presets', 'Audio Effects', 'Max Audio Effect'),
      path.join(homeDir, 'Documents', 'Max 8', 'Projects'),
      path.join(homeDir, 'Documents', 'Max 9', 'Projects'),
      path.join('/Applications', 'Max.app', 'Contents', 'Resources', 'C74', 'projects')
    );
  } else if (platform === 'win32') { // Windows
    paths.push(
      path.join(homeDir, 'Documents', 'Ableton', 'User Library', 'Presets', 'Audio Effects', 'Max Audio Effect'),
      path.join(homeDir, 'Documents', 'Max 8', 'Projects'),
      path.join(homeDir, 'Documents', 'Max 9', 'Projects'),
      path.join('C:', 'Program Files', 'Cycling \'74', 'Max 8', 'projects'),
      path.join('C:', 'Program Files', 'Cycling \'74', 'Max 9', 'projects')
    );
  }
  
  return paths;
}

// Find the best deployment location
function findDeploymentPath() {
  const possiblePaths = getMaxForLivePaths();
  
  for (const basePath of possiblePaths) {
    if (fs.existsSync(basePath)) {
      const targetDir = path.join(basePath, PROJECT_NAME);
      return { basePath, targetDir };
    }
  }
  
  return null;
}

// Create deployment directory structure
function createProjectStructure(targetDir) {
  const dirs = [
    targetDir,
    path.join(targetDir, 'code'),
    path.join(targetDir, 'patchers'),
    path.join(targetDir, 'docs')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
}

// Copy files to deployment location
function deployFiles(targetDir) {
  const deployments = [
    {
      source: SOURCE_FILE,
      target: path.join(targetDir, 'code', 'cc-router.js'),
      description: 'Main CC Router JavaScript'
    },
    {
      source: path.join(__dirname, '..', 'README.md'),
      target: path.join(targetDir, 'docs', 'README.md'),
      description: 'Documentation'
    }
  ];
  
  deployments.forEach(({ source, target, description }) => {
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, target);
      console.log(`✅ Deployed: ${description} -> ${target}`);
    } else {
      console.log(`⚠️  Source not found: ${source}`);
    }
  });
}

// Create a basic Max patcher
function createMaxPatcher(targetDir) {
  const patcherContent = {
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
      "rect": [59.0, 106.0, 800.0, 600.0],
      "bglocked": 0,
      "openinpresentation": 0,
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
      "description": "",
      "digest": "",
      "tags": "",
      "style": "",
      "subpatcher_template": "",
      "assistshowspatchername": 0,
      "boxes": [
        {
          "box": {
            "id": "obj-1",
            "maxclass": "comment",
            "numinlets": 1,
            "numoutlets": 0,
            "patching_rect": [50.0, 50.0, 300.0, 20.0],
            "text": "CC Router for Launch Control XL3 - TypeScript Version"
          }
        },
        {
          "box": {
            "id": "obj-2",
            "maxclass": "newobj",
            "numinlets": 1,
            "numoutlets": 2,
            "outlettype": ["", ""],
            "patching_rect": [50.0, 100.0, 200.0, 22.0],
            "saved_object_attributes": {
              "autowatch": 1,
              "filename": "cc-router.js",
              "parameter_enable": 0
            },
            "text": "js cc-router.js @autowatch 1"
          }
        },
        {
          "box": {
            "id": "obj-3",
            "maxclass": "comment",
            "numinlets": 1,
            "numoutlets": 0,
            "patching_rect": [50.0, 150.0, 400.0, 20.0],
            "text": "Send MIDI CC messages to inlet - format: [status, cc, value]"
          }
        },
        {
          "box": {
            "id": "obj-4",
            "maxclass": "message",
            "numinlets": 2,
            "numoutlets": 1,
            "outlettype": [""],
            "patching_rect": [50.0, 200.0, 100.0, 22.0],
            "text": "loadbang"
          }
        },
        {
          "box": {
            "id": "obj-5",
            "maxclass": "message",
            "numinlets": 2,
            "numoutlets": 1,
            "outlettype": [""],
            "patching_rect": [160.0, 200.0, 50.0, 22.0],
            "text": "help"
          }
        },
        {
          "box": {
            "id": "obj-6",
            "maxclass": "message",
            "numinlets": 2,
            "numoutlets": 1,
            "outlettype": [""],
            "patching_rect": [220.0, 200.0, 60.0, 22.0],
            "text": "config"
          }
        }
      ],
      "lines": [
        {
          "patchline": {
            "destination": ["obj-2", 0],
            "source": ["obj-4", 0]
          }
        },
        {
          "patchline": {
            "destination": ["obj-2", 0],
            "source": ["obj-5", 0]
          }
        },
        {
          "patchline": {
            "destination": ["obj-2", 0],
            "source": ["obj-6", 0]
          }
        }
      ]
    }
  };
  
  const patcherPath = path.join(targetDir, 'patchers', 'cc-router.maxpat');
  fs.writeFileSync(patcherPath, JSON.stringify(patcherContent, null, 2));
  console.log(`✅ Created Max patcher: ${patcherPath}`);
}

// Main deployment function
function deploy() {
  console.log('🚀 Deploying CC Router to Max for Live...\n');
  
  // Check if compiled JavaScript exists
  if (!fs.existsSync(SOURCE_FILE)) {
    console.error(`❌ Compiled JavaScript not found: ${SOURCE_FILE}`);
    console.log('Run "npm run build" first to compile TypeScript.');
    process.exit(1);
  }
  
  // Find deployment location
  const deploymentInfo = findDeploymentPath();
  if (!deploymentInfo) {
    console.error('❌ Could not find Max for Live installation path.');
    console.log('Please ensure Max for Live is installed and try again.');
    process.exit(1);
  }
  
  const { basePath, targetDir } = deploymentInfo;
  console.log(`📁 Deploying to: ${targetDir}`);
  console.log(`📍 Base path: ${basePath}\n`);
  
  // Create project structure
  createProjectStructure(targetDir);
  
  // Deploy files
  deployFiles(targetDir);
  
  // Create Max patcher
  createMaxPatcher(targetDir);
  
  console.log('\n✅ Deployment complete!');
  console.log('\nNext steps:');
  console.log('1. Open Max for Live');
  console.log(`2. Navigate to: ${targetDir}`);
  console.log('3. Open cc-router.maxpat');
  console.log('4. Save as an Audio Effect in your Live set');
  console.log('5. Send MIDI CC messages to the device');
  
  console.log('\nDevelopment workflow:');
  console.log('- Edit TypeScript files in src/');
  console.log('- Run "npm run watch" for auto-compilation');
  console.log('- Run "npm run deploy" to update Max device');
}

// Run deployment
if (require.main === module) {
  deploy();
}

module.exports = { deploy, getMaxForLivePaths, findDeploymentPath };
