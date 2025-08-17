/**
 * Domain Cartridge System - Plug-and-play domain expertise
 * Each cartridge bundles everything for expert-level responses in a domain
 */

export interface CartridgeActivators {
  keywords: string[];
  units_regex?: string;
  doc_shapes?: string[];
  file_extensions?: string[];
  api_patterns?: string[];
  confidence_threshold?: number;
}

export interface CartridgeSafety {
  forbid_procedures?: boolean;
  forbid_harmful?: boolean;
  redact_pii?: boolean;
  topic_blocks?: string[];
  required_disclaimers?: string[];
  max_risk_level?: 'low' | 'medium' | 'high';
}

export interface CartridgeStyle {
  tone: 'scholarly' | 'technical' | 'executive' | 'conversational' | 'formal';
  units?: 'SI' | 'imperial' | 'mixed';
  citation_style?: 'apa' | 'ieee' | 'nature' | 'chicago';
  length_preference?: 'concise' | 'detailed' | 'comprehensive';
  structure?: 'narrative' | 'bulleted' | 'sectioned' | 'outline';
}

export interface CartridgeTemplates {
  system: string;
  user: string;
  critic: string;
  outline?: string;
  json_spec?: string;
  summary?: string;
}

export interface CartridgeDeliverables {
  default: 'answer' | 'outline' | 'json_spec' | 'memo' | 'analysis';
  options: string[];
  schemas: Record<string, string>; // deliverable -> schema path
}

export interface Cartridge {
  id: string;
  name: string;
  description: string;
  version: string;
  
  // Auto-detection rules
  activators: CartridgeActivators;
  
  // Domain expertise
  safety: CartridgeSafety;
  style: CartridgeStyle;
  templates: CartridgeTemplates;
  deliverables: CartridgeDeliverables;
  
  // Quality assurance
  rubrics: string[];
  validators: string[];
  
  // Integration
  tool_adapters?: string[];
  dependencies?: string[];
  
  // Metadata
  priority: number; // Higher = preferred when multiple match
  overlay_compatible: boolean; // Can this be used as overlay?
  conflicts_with?: string[]; // Incompatible cartridge IDs
}

export interface CartridgeMatch {
  cartridge_id: string;
  confidence: number;
  signals: {
    keyword_matches: string[];
    unit_matches: string[];
    structure_matches: string[];
    file_matches: string[];
  };
  rationale: string;
}

export interface RoutingResult {
  primary: string;
  overlays: string[];
  deliverable_guess: string;
  confidence: number;
  matches: CartridgeMatch[];
  safety_overlays: string[]; // Mandatory safety cartridges
}

export interface ComposedCartridge {
  id: string;
  source_cartridges: string[];
  
  // Merged configuration (with precedence)
  safety: CartridgeSafety;
  style: CartridgeStyle;
  templates: CartridgeTemplates;
  deliverables: CartridgeDeliverables;
  rubrics: string[];
  validators: string[];
  
  // Composition metadata
  precedence_order: string[];
  conflicts_resolved: Array<{
    property: string;
    winner: string;
    reason: string;
  }>;
}

/**
 * Feature extraction from user input
 */
export interface DomainFeatures {
  // Text analysis
  keywords: string[];
  named_entities: Array<{ text: string; label: string; confidence: number }>;
  units_detected: string[];
  
  // Structure analysis
  doc_shape: 'imrad' | 'rfc' | 'memo' | 'outline' | 'narrative' | 'unknown';
  section_headers: string[];
  citation_patterns: string[];
  
  // File analysis
  file_extensions: string[];
  file_metadata: Record<string, any>;
  
  // Context
  user_history?: Array<{ domain: string; satisfaction: number }>;
  session_context?: Record<string, any>;
}

/**
 * User learning and preferences
 */
export interface UserProfile {
  user_id: string;
  
  // Learned preferences
  domain_preferences: Record<string, number>; // domain -> preference score
  deliverable_preferences: Record<string, number>;
  style_preferences: Record<string, number>;
  
  // Override history
  overrides: Array<{
    timestamp: string;
    original_routing: RoutingResult;
    user_choice: { primary: string; overlays: string[]; deliverable: string };
    satisfaction_feedback?: number;
  }>;
  
  // Context patterns
  typical_domains: string[];
  common_overlays: string[];
  
  // Safety settings
  risk_tolerance: 'conservative' | 'balanced' | 'permissive';
}

/**
 * Registry for managing cartridges
 */
export class CartridgeRegistry {
  private cartridges: Map<string, Cartridge> = new Map();
  private safetyOverlays: Map<string, string[]> = new Map();
  
  constructor() {
    this.initializeSafetyOverlays();
  }
  
  private initializeSafetyOverlays() {
    // Mandatory safety overlays for sensitive domains
    this.safetyOverlays.set('chemistry', ['safety_core', 'no_procedures']);
    this.safetyOverlays.set('biology', ['safety_core', 'no_procedures', 'ethics_review']);
    this.safetyOverlays.set('medicine', ['safety_core', 'no_procedures', 'medical_disclaimer']);
    this.safetyOverlays.set('explosives', ['safety_core', 'no_procedures', 'dual_use_block']);
  }
  
  register(cartridge: Cartridge): void {
    this.cartridges.set(cartridge.id, cartridge);
  }
  
  get(id: string): Cartridge | undefined {
    return this.cartridges.get(id);
  }
  
  list(): Cartridge[] {
    return Array.from(this.cartridges.values());
  }
  
  findByKeywords(keywords: string[]): Cartridge[] {
    return this.list().filter(cartridge => 
      cartridge.activators.keywords.some(kw => 
        keywords.some(k => k.toLowerCase().includes(kw.toLowerCase()))
      )
    );
  }
  
  getMandatorySafetyOverlays(primaryDomain: string): string[] {
    return this.safetyOverlays.get(primaryDomain) || [];
  }
}

/**
 * Global registry instance
 */
export const cartridgeRegistry = new CartridgeRegistry();
