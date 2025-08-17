/**
 * Cartridge Composer - Merges multiple cartridges with precedence rules
 * Handles overlays, conflicts, and safety enforcement
 */

import { 
  Cartridge, 
  ComposedCartridge, 
  RoutingResult,
  CartridgeSafety,
  CartridgeStyle,
  CartridgeTemplates,
  CartridgeDeliverables,
  cartridgeRegistry 
} from './cartridge.js';

/**
 * Composes multiple cartridges into a single configuration
 * Precedence order: safety > validators > rubrics > style > templates
 */
export class CartridgeComposer {
  
  compose(routing: RoutingResult): ComposedCartridge {
    // Gather all cartridges
    const primary = cartridgeRegistry.get(routing.primary);
    const overlays = routing.overlays.map(id => cartridgeRegistry.get(id)).filter(Boolean) as Cartridge[];
    const safetyOverlays = routing.safety_overlays.map(id => cartridgeRegistry.get(id)).filter(Boolean) as Cartridge[];
    
    if (!primary) {
      throw new Error(`Primary cartridge '${routing.primary}' not found`);
    }
    
    // Determine composition order (safety first, then overlays, then primary)
    const allCartridges = [
      ...safetyOverlays,
      ...overlays,
      primary
    ];
    
    // Check for conflicts
    this.validateNoConflicts(allCartridges);
    
    // Compose with precedence
    const composed = this.mergeCartridges(allCartridges, routing);
    
    return composed;
  }
  
  private validateNoConflicts(cartridges: Cartridge[]): void {
    for (let i = 0; i < cartridges.length; i++) {
      for (let j = i + 1; j < cartridges.length; j++) {
        const cart1 = cartridges[i];
        const cart2 = cartridges[j];
        
        if (cart1.conflicts_with?.includes(cart2.id) || 
            cart2.conflicts_with?.includes(cart1.id)) {
          throw new Error(`Cartridge conflict: ${cart1.id} and ${cart2.id} cannot be used together`);
        }
      }
    }
  }
  
  private mergeCartridges(cartridges: Cartridge[], routing: RoutingResult): ComposedCartridge {
    const conflicts: Array<{ property: string; winner: string; reason: string }> = [];
    
    // Start with empty base
    let safety: CartridgeSafety = {};
    let style: CartridgeStyle = { tone: 'conversational' };
    let templates: CartridgeTemplates = { system: '', user: '', critic: '' };
    let deliverables: CartridgeDeliverables = { 
      default: 'answer', 
      options: ['answer'], 
      schemas: {} 
    };
    let rubrics: string[] = [];
    let validators: string[] = [];
    
    // Merge in reverse order (last wins, but safety has precedence)
    for (let i = cartridges.length - 1; i >= 0; i--) {
      const cartridge = cartridges[i];
      
      // Safety (always takes precedence)
      safety = this.mergeSafety(safety, cartridge.safety, cartridge.id, conflicts);
      
      // Validators (safety cartridges win)
      if (this.isSafetyCartridge(cartridge.id) || validators.length === 0) {
        const newValidators = cartridge.validators.filter(v => !validators.includes(v));
        validators.unshift(...newValidators);
        if (newValidators.length > 0) {
          conflicts.push({
            property: 'validators',
            winner: cartridge.id,
            reason: this.isSafetyCartridge(cartridge.id) ? 'Safety override' : 'First validator'
          });
        }
      }
      
      // Rubrics (merge all, safety first)
      const newRubrics = cartridge.rubrics.filter(r => !rubrics.includes(r));
      if (this.isSafetyCartridge(cartridge.id)) {
        rubrics.unshift(...newRubrics);
      } else {
        rubrics.push(...newRubrics);
      }
      
      // Style (later cartridges override, unless safety)
      if (i === cartridges.length - 1 || this.isSafetyCartridge(cartridge.id)) {
        const oldStyle = { ...style };
        style = this.mergeStyle(style, cartridge.style, cartridge.id, conflicts);
      }
      
      // Templates (later cartridges override, unless safety)
      if (i === cartridges.length - 1 || this.isSafetyCartridge(cartridge.id)) {
        templates = this.mergeTemplates(templates, cartridge.templates, cartridge.id, conflicts);
      }
      
      // Deliverables (merge options, keep primary's default)
      deliverables = this.mergeDeliverables(deliverables, cartridge.deliverables, cartridge.id);
    }
    
    return {
      id: `composed_${Date.now()}`,
      source_cartridges: cartridges.map(c => c.id),
      safety,
      style,
      templates,
      deliverables,
      rubrics: [...new Set(rubrics)], // Deduplicate
      validators: [...new Set(validators)], // Deduplicate
      precedence_order: cartridges.map(c => c.id),
      conflicts_resolved: conflicts
    };
  }
  
  private mergeSafety(
    base: CartridgeSafety, 
    incoming: CartridgeSafety, 
    source: string,
    conflicts: Array<{ property: string; winner: string; reason: string }>
  ): CartridgeSafety {
    const merged = { ...base };
    
    // Safety rules: most restrictive wins
    if (incoming.forbid_procedures !== undefined) {
      if (base.forbid_procedures !== incoming.forbid_procedures) {
        conflicts.push({
          property: 'forbid_procedures',
          winner: source,
          reason: 'Safety override - most restrictive'
        });
      }
      merged.forbid_procedures = base.forbid_procedures || incoming.forbid_procedures;
    }
    
    if (incoming.forbid_harmful !== undefined) {
      merged.forbid_harmful = base.forbid_harmful || incoming.forbid_harmful;
    }
    
    if (incoming.redact_pii !== undefined) {
      merged.redact_pii = base.redact_pii || incoming.redact_pii;
    }
    
    // Merge arrays (union for safety)
    if (incoming.topic_blocks) {
      merged.topic_blocks = [...(base.topic_blocks || []), ...incoming.topic_blocks];
    }
    
    if (incoming.required_disclaimers) {
      merged.required_disclaimers = [...(base.required_disclaimers || []), ...incoming.required_disclaimers];
    }
    
    // Risk level: most restrictive wins
    if (incoming.max_risk_level) {
      const riskOrder = { 'low': 0, 'medium': 1, 'high': 2 };
      const baseRisk = riskOrder[base.max_risk_level || 'high'];
      const incomingRisk = riskOrder[incoming.max_risk_level];
      
      if (incomingRisk < baseRisk) {
        merged.max_risk_level = incoming.max_risk_level;
        conflicts.push({
          property: 'max_risk_level',
          winner: source,
          reason: 'Lower risk limit enforced'
        });
      }
    }
    
    return merged;
  }
  
  private mergeStyle(
    base: CartridgeStyle, 
    incoming: CartridgeStyle, 
    source: string,
    conflicts: Array<{ property: string; winner: string; reason: string }>
  ): CartridgeStyle {
    const merged = { ...base };
    
    // Direct overrides
    const overrideFields: (keyof CartridgeStyle)[] = [
      'tone', 'units', 'citation_style', 'length_preference', 'structure'
    ];
    
    for (const field of overrideFields) {
      if (incoming[field] !== undefined) {
        if (base[field] !== undefined && base[field] !== incoming[field]) {
          conflicts.push({
            property: field,
            winner: source,
            reason: 'Style override'
          });
        }
        (merged as any)[field] = incoming[field];
      }
    }
    
    return merged;
  }
  
  private mergeTemplates(
    base: CartridgeTemplates, 
    incoming: CartridgeTemplates, 
    source: string,
    conflicts: Array<{ property: string; winner: string; reason: string }>
  ): CartridgeTemplates {
    const merged = { ...base };
    
    const templateFields: (keyof CartridgeTemplates)[] = [
      'system', 'user', 'critic', 'outline', 'json_spec', 'summary'
    ];
    
    for (const field of templateFields) {
      if (incoming[field] !== undefined && incoming[field] !== '') {
        if (base[field] !== undefined && base[field] !== '' && base[field] !== incoming[field]) {
          conflicts.push({
            property: `template_${field}`,
            winner: source,
            reason: 'Template override'
          });
        }
        merged[field] = incoming[field];
      }
    }
    
    return merged;
  }
  
  private mergeDeliverables(
    base: CartridgeDeliverables, 
    incoming: CartridgeDeliverables, 
    source: string
  ): CartridgeDeliverables {
    return {
      default: base.default || incoming.default,
      options: [...new Set([...base.options, ...incoming.options])],
      schemas: { ...base.schemas, ...incoming.schemas }
    };
  }
  
  private isSafetyCartridge(cartridgeId: string): boolean {
    return cartridgeId.includes('safety') || 
           cartridgeId.includes('security') ||
           cartridgeId === 'no_procedures' ||
           cartridgeId === 'ethics_review' ||
           cartridgeId === 'medical_disclaimer' ||
           cartridgeId === 'dual_use_block';
  }
  
  /**
   * Get a human-readable explanation of the composition
   */
  explainComposition(composed: ComposedCartridge): string {
    const lines: string[] = [];
    
    lines.push(`Composed from: ${composed.source_cartridges.join(' + ')}`);
    
    if (composed.conflicts_resolved.length > 0) {
      lines.push('\nResolved conflicts:');
      for (const conflict of composed.conflicts_resolved) {
        lines.push(`  • ${conflict.property}: ${conflict.winner} (${conflict.reason})`);
      }
    }
    
    lines.push(`\nActive features:`);
    lines.push(`  • Style: ${composed.style.tone}`);
    lines.push(`  • Templates: ${Object.keys(composed.templates).filter(k => composed.templates[k as keyof CartridgeTemplates]).join(', ')}`);
    lines.push(`  • Validators: ${composed.validators.length}`);
    lines.push(`  • Rubrics: ${composed.rubrics.length}`);
    
    if (composed.safety.forbid_procedures || composed.safety.forbid_harmful) {
      lines.push(`  • Safety: Enhanced restrictions active`);
    }
    
    return lines.join('\n');
  }
}

/**
 * Global composer instance
 */
export const cartridgeComposer = new CartridgeComposer();
