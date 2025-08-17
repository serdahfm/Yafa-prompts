/**
 * Cartridge Loader - Hot-loads domain cartridges from YAML files
 * Automatically discovers and registers cartridges from /domains/ folder
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Cartridge, cartridgeRegistry } from './cartridge.js';

export class CartridgeLoader {
  private cartridgesPath: string;
  private watchMode: boolean = false;
  
  constructor(cartridgesPath: string = 'domains') {
    this.cartridgesPath = cartridgesPath;
  }
  
  /**
   * Load all cartridges from the domains directory
   */
  async loadAll(): Promise<number> {
    const domainsDir = path.resolve(this.cartridgesPath);
    
    if (!fs.existsSync(domainsDir)) {
      console.warn(`Cartridges directory not found: ${domainsDir}`);
      this.loadBuiltinCartridges();
      return cartridgeRegistry.list().length;
    }
    
    const files = fs.readdirSync(domainsDir);
    const yamlFiles = files.filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
    
    let loadedCount = 0;
    
    for (const file of yamlFiles) {
      try {
        const cartridge = await this.loadCartridge(path.join(domainsDir, file));
        if (cartridge) {
          cartridgeRegistry.register(cartridge);
          loadedCount++;
          console.log(`✅ Loaded cartridge: ${cartridge.id} (${cartridge.name})`);
        }
      } catch (error) {
        console.error(`❌ Failed to load cartridge ${file}:`, error);
      }
    }
    
    console.log(`🎯 Loaded ${loadedCount} domain cartridges`);
    return loadedCount;
  }
  
  /**
   * Load a single cartridge from YAML file
   */
  private async loadCartridge(filePath: string): Promise<Cartridge | null> {
    try {
      const yamlContent = fs.readFileSync(filePath, 'utf8');
      const data = yaml.load(yamlContent) as any;
      
      // Validate required fields
      if (!data.id || !data.name || !data.activators) {
        throw new Error(`Invalid cartridge format: missing required fields`);
      }
      
      // Convert YAML to Cartridge interface
      const cartridge: Cartridge = {
        id: data.id,
        name: data.name,
        description: data.description || '',
        version: data.version || '1.0.0',
        
        activators: {
          keywords: data.activators.keywords || [],
          units_regex: data.activators.units_regex,
          doc_shapes: data.activators.doc_shapes || [],
          file_extensions: data.activators.file_extensions || [],
          api_patterns: data.activators.api_patterns || [],
          confidence_threshold: data.activators.confidence_threshold || 0.5
        },
        
        safety: {
          forbid_procedures: data.safety?.forbid_procedures || false,
          forbid_harmful: data.safety?.forbid_harmful || false,
          redact_pii: data.safety?.redact_pii || false,
          topic_blocks: data.safety?.topic_blocks || [],
          required_disclaimers: data.safety?.required_disclaimers || [],
          max_risk_level: data.safety?.max_risk_level || 'medium'
        },
        
        style: {
          tone: data.style?.tone || 'conversational',
          units: data.style?.units,
          citation_style: data.style?.citation_style,
          length_preference: data.style?.length_preference,
          structure: data.style?.structure
        },
        
        templates: {
          system: data.templates?.system || '',
          user: data.templates?.user || '',
          critic: data.templates?.critic || '',
          outline: data.templates?.outline,
          json_spec: data.templates?.json_spec,
          summary: data.templates?.summary
        },
        
        deliverables: {
          default: data.deliverables?.default || 'answer',
          options: data.deliverables?.options || ['answer'],
          schemas: data.deliverables?.schemas || {}
        },
        
        rubrics: data.rubrics || [],
        validators: data.validators || [],
        tool_adapters: data.tool_adapters || [],
        dependencies: data.dependencies || [],
        
        priority: data.priority || 50,
        overlay_compatible: data.overlay_compatible !== false,
        conflicts_with: data.conflicts_with || []
      };
      
      return cartridge;
      
    } catch (error) {
      console.error(`Failed to parse cartridge ${filePath}:`, error);
      return null;
    }
  }
  
  /**
   * Load built-in cartridges if no domains directory exists
   */
  private loadBuiltinCartridges(): void {
    // General purpose cartridge
    const generalCartridge: Cartridge = {
      id: 'general',
      name: 'General Purpose',
      description: 'Default cartridge for general questions',
      version: '1.0.0',
      
      activators: {
        keywords: [],
        confidence_threshold: 0.1
      },
      
      safety: {
        forbid_procedures: false,
        forbid_harmful: true,
        redact_pii: true,
        topic_blocks: [],
        required_disclaimers: [],
        max_risk_level: 'medium'
      },
      
      style: {
        tone: 'conversational',
        length_preference: 'concise',
        structure: 'narrative'
      },
      
      templates: {
        system: 'templates/system.md',
        user: 'templates/user_qa.md',
        critic: 'templates/critic.md'
      },
      
      deliverables: {
        default: 'answer',
        options: ['answer'],
        schemas: {}
      },
      
      rubrics: ['clarity', 'helpfulness'],
      validators: ['basic_safety'],
      
      priority: 10,
      overlay_compatible: true,
      conflicts_with: []
    };
    
    cartridgeRegistry.register(generalCartridge);
    console.log('✅ Loaded built-in general cartridge');
  }
  
  /**
   * Enable hot-reloading of cartridges (for development)
   */
  enableHotReload(): void {
    if (this.watchMode) return;
    
    const domainsDir = path.resolve(this.cartridgesPath);
    if (!fs.existsSync(domainsDir)) return;
    
    this.watchMode = true;
    
    fs.watch(domainsDir, { recursive: false }, (eventType, filename) => {
      if (filename && (filename.endsWith('.yml') || filename.endsWith('.yaml'))) {
        console.log(`🔄 Cartridge file changed: ${filename}`);
        setTimeout(() => this.reloadCartridge(path.join(domainsDir, filename)), 100);
      }
    });
    
    console.log('🔥 Hot-reload enabled for cartridges');
  }
  
  /**
   * Reload a single cartridge file
   */
  private async reloadCartridge(filePath: string): Promise<void> {
    try {
      const cartridge = await this.loadCartridge(filePath);
      if (cartridge) {
        cartridgeRegistry.register(cartridge);
        console.log(`🔄 Reloaded cartridge: ${cartridge.id}`);
      }
    } catch (error) {
      console.error(`❌ Failed to reload cartridge ${filePath}:`, error);
    }
  }
  
  /**
   * Get loader statistics
   */
  getStats(): { total: number; domains: string[]; overlays: string[] } {
    const cartridges = cartridgeRegistry.list();
    const domains = cartridges.filter(c => c.overlay_compatible).map(c => c.id);
    const overlays = cartridges.filter(c => c.id.includes('overlay') || c.id.includes('safety')).map(c => c.id);
    
    return {
      total: cartridges.length,
      domains,
      overlays
    };
  }
}

/**
 * Global loader instance
 */
export const cartridgeLoader = new CartridgeLoader();
