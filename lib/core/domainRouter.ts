/**
 * Intelligent Domain Router - Auto-detects domain and snaps in cartridges
 * No dropdowns, just smart recognition from text/files/context
 */

import { 
  DomainFeatures, 
  RoutingResult, 
  CartridgeMatch, 
  UserProfile,
  cartridgeRegistry 
} from './cartridge.js';

/**
 * Feature extraction from user input
 */
export class FeatureExtractor {
  
  extractFromText(text: string): DomainFeatures {
    const words = text.toLowerCase().split(/\s+/);
    
    return {
      keywords: this.extractKeywords(text),
      named_entities: this.extractNamedEntities(text),
      units_detected: this.extractUnits(text),
      doc_shape: this.detectDocShape(text),
      section_headers: this.extractSectionHeaders(text),
      citation_patterns: this.extractCitationPatterns(text),
      file_extensions: [],
      file_metadata: {}
    };
  }
  
  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3)
      .filter(w => !this.isStopWord(w));
    
    return [...new Set(words)];
  }
  
  private extractNamedEntities(text: string): Array<{ text: string; label: string; confidence: number }> {
    const entities: Array<{ text: string; label: string; confidence: number }> = [];
    
    // Chemical entities
    const chemicalPatterns = [
      /\b[A-Z][a-z]?(?:[0-9]+[a-z]*)*\b/g, // Chemical formulas
      /\b(?:mol\/L|M|g\/mol|°C|K|pH|mmol|pKa|NMR)\b/gi, // Chemical units
      /\b(?:catalyst|reagent|titration|molarity)\b/gi // Chemical terms
    ];
    
    chemicalPatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      matches.forEach(match => {
        entities.push({
          text: match,
          label: 'CHEMICAL',
          confidence: 0.8
        });
      });
    });
    
    // Software engineering entities
    const swPatterns = [
      /\b(?:API|REST|GraphQL|JSON|HTTP|HTTPS|TCP|UDP)\b/gi,
      /\b(?:throughput|latency|scalability|microservice)\b/gi,
      /\b(?:React|Node\.js|Python|TypeScript|JavaScript)\b/gi
    ];
    
    swPatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      matches.forEach(match => {
        entities.push({
          text: match,
          label: 'SOFTWARE',
          confidence: 0.8
        });
      });
    });
    
    return entities;
  }
  
  private extractUnits(text: string): string[] {
    const unitPatterns = [
      /\b(?:mol\/L|M|g\/mol|mmol|μmol)\b/gi, // Chemical units
      /\b(?:°C|K|°F)\b/gi, // Temperature
      /\b(?:ms|μs|ns|seconds?|minutes?|hours?)\b/gi, // Time
      /\b(?:MB|GB|TB|kB|bytes?)\b/gi, // Data
      /\b(?:Hz|kHz|MHz|GHz)\b/gi, // Frequency
      /\b(?:V|mV|A|mA|W|kW|MW)\b/gi // Electrical
    ];
    
    const units: string[] = [];
    unitPatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      units.push(...matches);
    });
    
    return [...new Set(units)];
  }
  
  private detectDocShape(text: string): 'imrad' | 'rfc' | 'memo' | 'outline' | 'narrative' | 'unknown' {
    const lowerText = text.toLowerCase();
    
    // IMRaD pattern (scientific papers)
    if (this.containsSequence(lowerText, ['introduction', 'method', 'result', 'discussion']) ||
        this.containsSequence(lowerText, ['abstract', 'introduction', 'conclusion'])) {
      return 'imrad';
    }
    
    // RFC pattern (technical specs)
    if (this.containsSequence(lowerText, ['specification', 'implementation', 'security']) ||
        lowerText.includes('rfc') || lowerText.includes('protocol')) {
      return 'rfc';
    }
    
    // Memo pattern (business docs)
    if (lowerText.includes('memorandum') || lowerText.includes('to:') || lowerText.includes('from:')) {
      return 'memo';
    }
    
    // Outline pattern (structured lists)
    if ((text.match(/^\d+\./gm) || []).length > 2 || 
        (text.match(/^[A-Z]\./gm) || []).length > 2) {
      return 'outline';
    }
    
    return 'narrative';
  }
  
  private containsSequence(text: string, words: string[]): boolean {
    return words.every(word => text.includes(word));
  }
  
  private extractSectionHeaders(text: string): string[] {
    const headers: string[] = [];
    
    // Markdown headers
    const mdHeaders = text.match(/^#{1,6}\s+(.+)$/gm) || [];
    headers.push(...mdHeaders.map(h => h.replace(/^#+\s+/, '')));
    
    // All caps headers
    const capsHeaders = text.match(/^[A-Z\s]{3,}$/gm) || [];
    headers.push(...capsHeaders);
    
    return headers;
  }
  
  private extractCitationPatterns(text: string): string[] {
    const patterns: string[] = [];
    
    // Academic citations
    if (text.match(/\[[0-9]+\]/g)) patterns.push('numeric');
    if (text.match(/\([A-Z][a-z]+,?\s+\d{4}\)/g)) patterns.push('author_year');
    if (text.match(/et al\./gi)) patterns.push('academic');
    
    // Technical citations  
    if (text.match(/\[RFC\s*\d+\]/gi)) patterns.push('rfc');
    if (text.match(/\[policy_\w+#\w+\]/g)) patterns.push('policy');
    
    return patterns;
  }
  
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'
    ]);
    return stopWords.has(word);
  }
  
  extractFromFiles(files: Array<{ name: string; content?: string; metadata?: any }>): Partial<DomainFeatures> {
    const extensions = files.map(f => f.name.split('.').pop()?.toLowerCase() || '');
    const metadata = files.reduce((acc, f) => ({ ...acc, [f.name]: f.metadata }), {});
    
    return {
      file_extensions: [...new Set(extensions)],
      file_metadata: metadata
    };
  }
}

/**
 * Domain scoring and routing logic
 */
export class DomainRouter {
  private featureExtractor = new FeatureExtractor();
  
  async route(
    text: string, 
    files: Array<{ name: string; content?: string; metadata?: any }> = [],
    userProfile?: UserProfile
  ): Promise<RoutingResult> {
    
    // Extract features
    const textFeatures = this.featureExtractor.extractFromText(text);
    const fileFeatures = this.featureExtractor.extractFromFiles(files);
    const features: DomainFeatures = { ...textFeatures, ...fileFeatures };
    
    // Score all cartridges
    const matches = this.scoreCartridges(features, userProfile);
    
    // Select primary cartridge (must have reasonable confidence)
    const primaryMatch = matches.find(m => m.confidence > 0.2) || matches[0];
    const primary = primaryMatch?.cartridge_id || 'general';
    const confidence = primaryMatch?.confidence || 0;
    
    // Detect overlays
    const overlays = this.detectOverlays(features, userProfile);
    
    // Add mandatory safety overlays
    const safetyOverlays = cartridgeRegistry.getMandatorySafetyOverlays(primary);
    const allOverlays = [...new Set([...overlays, ...safetyOverlays])];
    
    // Guess deliverable
    const deliverableGuess = this.guessDeliverable(features, primary);
    
    return {
      primary,
      overlays: allOverlays,
      deliverable_guess: deliverableGuess,
      confidence,
      matches,
      safety_overlays: safetyOverlays
    };
  }
  
  private scoreCartridges(features: DomainFeatures, userProfile?: UserProfile): CartridgeMatch[] {
    const matches: CartridgeMatch[] = [];
    const cartridges = cartridgeRegistry.list();
    
    console.log(`🔍 Scoring ${cartridges.length} cartridges for features:`, {
      keywords: features.keywords.slice(0, 5),
      units: features.units_detected,
      doc_shape: features.doc_shape
    });
    
    for (const cartridge of cartridges) {
      const score = this.scoreCartridge(cartridge.id, features, userProfile);
      console.log(`📊 ${cartridge.id}: ${score.confidence.toFixed(3)} - ${score.rationale}`);
      if (score.confidence > 0.05) { // Lower threshold for testing
        matches.push(score);
      }
    }
    
    return matches.sort((a, b) => b.confidence - a.confidence);
  }
  
  private scoreCartridge(cartridgeId: string, features: DomainFeatures, userProfile?: UserProfile): CartridgeMatch {
    const cartridge = cartridgeRegistry.get(cartridgeId);
    if (!cartridge) {
      return {
        cartridge_id: cartridgeId,
        confidence: 0,
        signals: { keyword_matches: [], unit_matches: [], structure_matches: [], file_matches: [] },
        rationale: 'Cartridge not found'
      };
    }
    
    let score = 0;
    const signals = {
      keyword_matches: [] as string[],
      unit_matches: [] as string[],
      structure_matches: [] as string[],
      file_matches: [] as string[]
    };
    
    // Keyword matching (40% weight)
    const keywordScore = this.scoreKeywords(cartridge.activators.keywords, features.keywords);
    score += keywordScore.score * 0.4;
    signals.keyword_matches = keywordScore.matches;
    
    // Unit pattern matching (20% weight)
    if (cartridge.activators.units_regex) {
      const unitScore = this.scoreUnits(cartridge.activators.units_regex, features.units_detected);
      score += unitScore.score * 0.2;
      signals.unit_matches = unitScore.matches;
    }
    
    // Document structure matching (20% weight)
    if (cartridge.activators.doc_shapes?.includes(features.doc_shape)) {
      score += 0.2;
      signals.structure_matches.push(features.doc_shape);
    }
    
    // File extension matching (10% weight)
    if (cartridge.activators.file_extensions) {
      const fileScore = this.scoreFileExtensions(cartridge.activators.file_extensions, features.file_extensions);
      score += fileScore.score * 0.1;
      signals.file_matches = fileScore.matches;
    }
    
    // User preference boost (10% weight)
    if (userProfile?.domain_preferences[cartridgeId]) {
      score += userProfile.domain_preferences[cartridgeId] * 0.1;
    }
    
    // Apply cartridge priority
    score *= (cartridge.priority / 100);
    
    // Generate rationale
    const rationale = this.generateRationale(signals, score);
    
    return {
      cartridge_id: cartridgeId,
      confidence: Math.min(score, 1.0),
      signals,
      rationale
    };
  }
  
  private scoreKeywords(cartridgeKeywords: string[], textKeywords: string[]): { score: number; matches: string[] } {
    const matches: string[] = [];
    
    for (const ckw of cartridgeKeywords) {
      const ckwLower = ckw.toLowerCase();
      for (const tkw of textKeywords) {
        const tkwLower = tkw.toLowerCase();
        // More flexible matching
        if (tkwLower.includes(ckwLower) || ckwLower.includes(tkwLower) || 
            tkwLower === ckwLower || this.isKeywordSimilar(ckwLower, tkwLower)) {
          matches.push(ckw);
          break;
        }
      }
    }
    
    // Better scoring: each match contributes meaningfully
    // Don't penalize cartridges for having many keywords
    let score = 0;
    if (matches.length > 0) {
      // Base score for any match
      score = 0.3;
      // Additional score for more matches (diminishing returns)
      score += Math.min(matches.length * 0.2, 0.6);
      // Bonus for high match ratio if cartridge has few keywords
      if (cartridgeKeywords.length <= 5) {
        score += (matches.length / cartridgeKeywords.length) * 0.3;
      }
    }
    
    return { score: Math.min(score, 1.0), matches };
  }
  
  private isKeywordSimilar(word1: string, word2: string): boolean {
    // Check for common chemistry/science terms
    const chemSynonyms = [
      ['catalyst', 'catalytic'],
      ['stability', 'stable'],
      ['analysis', 'analyze', 'assess'],
      ['variable', 'parameter'],
      ['control', 'controls']
    ];
    
    for (const group of chemSynonyms) {
      if (group.includes(word1) && group.includes(word2)) {
        return true;
      }
    }
    
    return false;
  }
  
  private scoreUnits(unitsRegex: string, detectedUnits: string[]): { score: number; matches: string[] } {
    const regex = new RegExp(unitsRegex, 'gi');
    const matches = detectedUnits.filter(unit => regex.test(unit));
    const score = matches.length > 0 ? 1 : 0;
    return { score, matches };
  }
  
  private scoreFileExtensions(cartridgeExts: string[], fileExts: string[]): { score: number; matches: string[] } {
    const matches = fileExts.filter(ext => cartridgeExts.includes(ext));
    const score = matches.length / Math.max(fileExts.length, 1);
    return { score, matches };
  }
  
  private detectOverlays(features: DomainFeatures, userProfile?: UserProfile): string[] {
    const overlays: string[] = [];
    
    // PhD research overlay
    if (features.doc_shape === 'imrad' || 
        features.citation_patterns.includes('academic') ||
        features.named_entities.some(e => e.label === 'ACADEMIC')) {
      overlays.push('phd_research');
    }
    
    // Executive overlay
    if (features.keywords.some(k => ['budget', 'roi', 'strategy', 'summary'].includes(k))) {
      overlays.push('executive');
    }
    
    // Patent overlay
    if (features.keywords.some(k => ['patent', 'invention', 'novel', 'claim'].includes(k))) {
      overlays.push('patent_examiner');
    }
    
    // Software engineering overlay
    if (features.named_entities.some(e => e.label === 'SOFTWARE') ||
        features.file_extensions.some(ext => ['py', 'js', 'ts', 'java', 'cpp'].includes(ext))) {
      overlays.push('software_engineering');
    }
    
    return overlays;
  }
  
  private guessDeliverable(features: DomainFeatures, primaryDomain: string): string {
    // Based on document shape
    if (features.doc_shape === 'outline') return 'outline';
    if (features.doc_shape === 'memo') return 'memo';
    
    // Based on domain defaults
    const cartridge = cartridgeRegistry.get(primaryDomain);
    return cartridge?.deliverables.default || 'answer';
  }
  
  private generateRationale(signals: CartridgeMatch['signals'], confidence: number): string {
    const reasons: string[] = [];
    
    if (signals.keyword_matches.length > 0) {
      reasons.push(`Keywords: ${signals.keyword_matches.slice(0, 3).join(', ')}`);
    }
    
    if (signals.unit_matches.length > 0) {
      reasons.push(`Units: ${signals.unit_matches.slice(0, 2).join(', ')}`);
    }
    
    if (signals.structure_matches.length > 0) {
      reasons.push(`Structure: ${signals.structure_matches.join(', ')}`);
    }
    
    if (signals.file_matches.length > 0) {
      reasons.push(`Files: ${signals.file_matches.join(', ')}`);
    }
    
    const confidenceText = confidence > 0.8 ? 'High confidence' : 
                          confidence > 0.5 ? 'Medium confidence' : 'Low confidence';
    
    return reasons.length > 0 
      ? `${confidenceText}: ${reasons.join('; ')}`
      : `${confidenceText}: general language patterns`;
  }
}

/**
 * Global router instance
 */
export const domainRouter = new DomainRouter();
