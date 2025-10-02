#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

/**
 * Convert canonical MIDI map YAML to cc-router JSON format
 *
 * Canonical format has:
 * - controls[].cc: MIDI CC number
 * - controls[].plugin_parameter: Plugin parameter index (string or number)
 *
 * CC-Router format needs:
 * {
 *   pluginName: string,
 *   mappings: {
 *     [ccNumber]: {
 *       deviceIndex: 0,
 *       parameterIndex: number,
 *       parameterName: string,
 *       curve: 'linear' | 'exponential' | 'logarithmic'
 *     }
 *   }
 * }
 */

const CANONICAL_MAPS_DIR = path.join(__dirname, '../node_modules/@oletizi/canonical-midi-maps/maps');
const OUTPUT_FILE = path.join(__dirname, '../src/canonical-plugin-maps.ts');

function convertCanonicalMap(yamlPath) {
  const yamlContent = fs.readFileSync(yamlPath, 'utf8');
  const canonical = yaml.parse(yamlContent);

  if (!canonical.plugin || !canonical.controls) {
    console.warn(`Skipping ${yamlPath}: missing plugin or controls`);
    return null;
  }

  const mappings = {};

  for (const control of canonical.controls) {
    // Skip controls without CC or plugin_parameter
    if (control.cc === undefined || control.plugin_parameter === undefined) {
      continue;
    }

    // Skip button groups (we only handle encoder/slider CC for now)
    if (control.type === 'button_group') {
      continue;
    }

    const ccNumber = control.cc;
    const paramIndex = typeof control.plugin_parameter === 'string'
      ? parseInt(control.plugin_parameter, 10)
      : control.plugin_parameter;

    // Skip special parameters like "bypass", "window"
    if (isNaN(paramIndex)) {
      continue;
    }

    mappings[ccNumber] = {
      deviceIndex: 0, // Always map to first device in chain
      parameterIndex: paramIndex,
      parameterName: control.name || `CC ${ccNumber}`,
      curve: 'linear' // Default curve, could be enhanced later
    };
  }

  return {
    pluginName: canonical.plugin.name,
    pluginManufacturer: canonical.plugin.manufacturer,
    mappings: mappings,
    metadata: {
      name: canonical.metadata?.name,
      description: canonical.metadata?.description,
      version: canonical.version
    }
  };
}

function findYamlFiles(dir) {
  const files = [];

  function traverse(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        traverse(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.yaml')) {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}

function main() {
  console.log('🔄 Converting canonical MIDI maps to cc-router format...\n');

  if (!fs.existsSync(CANONICAL_MAPS_DIR)) {
    console.error(`❌ Canonical maps directory not found: ${CANONICAL_MAPS_DIR}`);
    process.exit(1);
  }

  const yamlFiles = findYamlFiles(CANONICAL_MAPS_DIR);
  console.log(`📁 Found ${yamlFiles.length} YAML files\n`);

  const pluginMaps = {};
  let convertedCount = 0;

  for (const yamlPath of yamlFiles) {
    const relativePath = path.relative(CANONICAL_MAPS_DIR, yamlPath);

    try {
      const converted = convertCanonicalMap(yamlPath);

      if (converted && converted.pluginName) {
        // Use plugin name as key (could enhance with manufacturer later)
        const key = converted.pluginName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        pluginMaps[key] = converted;
        convertedCount++;
        console.log(`✅ ${relativePath} -> ${converted.pluginName}`);
      }
    } catch (error) {
      console.warn(`⚠️  ${relativePath}: ${error.message}`);
    }
  }

  // Generate TypeScript file
  const tsContent = `/**
 * Auto-generated from canonical MIDI maps
 * DO NOT EDIT MANUALLY - Run 'npm run convert-maps' to regenerate
 */

export interface PluginMapping {
  pluginName: string;
  pluginManufacturer: string;
  mappings: {
    [ccNumber: number]: {
      deviceIndex: number;
      parameterIndex: number;
      parameterName: string;
      curve: 'linear' | 'exponential' | 'logarithmic';
    };
  };
  metadata: {
    name?: string;
    description?: string;
    version?: string;
  };
}

export const CANONICAL_PLUGIN_MAPS: { [key: string]: PluginMapping } = ${JSON.stringify(pluginMaps, null, 2)};

/**
 * Get plugin mapping by plugin name (case-insensitive, fuzzy match)
 */
export function getPluginMapping(pluginName: string): PluginMapping | undefined {
  const normalized = pluginName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return CANONICAL_PLUGIN_MAPS[normalized];
}
`;

  fs.writeFileSync(OUTPUT_FILE, tsContent, 'utf8');

  console.log(`\n✅ Converted ${convertedCount} plugin maps`);
  console.log(`📝 Generated: ${OUTPUT_FILE}`);
}

main();
