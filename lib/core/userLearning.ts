/**
 * User Learning System - Captures preferences and improves routing over time
 * Tracks overrides, satisfaction, and builds personalized domain preferences
 */

import { 
  UserProfile, 
  RoutingResult,
  cartridgeRegistry 
} from './cartridge.js';
import * as fs from 'fs';
import * as path from 'path';

export interface UserOverride {
  timestamp: string;
  session_id: string;
  original_routing: RoutingResult;
  user_choice: {
    primary: string;
    overlays: string[];
    deliverable: string;
  };
  satisfaction_feedback?: number; // 1-5 rating
  text_context: string; // Original question/text
  success_metrics?: {
    used_result: boolean;
    editing_required: boolean;
    regeneration_requested: boolean;
  };
}

export interface LearningSignal {
  user_id: string;
  signal_type: 'override' | 'satisfaction' | 'usage' | 'regeneration';
  routing: RoutingResult;
  feedback_value: number;
  context: Record<string, any>;
  timestamp: string;
}

/**
 * Manages user preferences and learning from interactions
 */
export class UserLearningSystem {
  private profilesPath: string;
  private profiles: Map<string, UserProfile> = new Map();
  private learningSignals: LearningSignal[] = [];
  
  constructor(profilesPath: string = 'user_profiles') {
    this.profilesPath = profilesPath;
    this.ensureDirectoryExists();
    this.loadProfiles();
  }
  
  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.profilesPath)) {
      fs.mkdirSync(this.profilesPath, { recursive: true });
    }
  }
  
  /**
   * Load all user profiles from disk
   */
  private loadProfiles(): void {
    try {
      if (!fs.existsSync(this.profilesPath)) return;
      
      const files = fs.readdirSync(this.profilesPath);
      const profileFiles = files.filter(f => f.endsWith('.json'));
      
      for (const file of profileFiles) {
        const userId = file.replace('.json', '');
        const profilePath = path.join(this.profilesPath, file);
        
        try {
          const data = fs.readFileSync(profilePath, 'utf8');
          const profile = JSON.parse(data) as UserProfile;
          this.profiles.set(userId, profile);
        } catch (error) {
          console.error(`Failed to load profile ${userId}:`, error);
        }
      }
      
      console.log(`📚 Loaded ${this.profiles.size} user profiles`);
    } catch (error) {
      console.error('Failed to load user profiles:', error);
    }
  }
  
  /**
   * Save a user profile to disk
   */
  private saveProfile(userId: string, profile: UserProfile): void {
    try {
      const profilePath = path.join(this.profilesPath, `${userId}.json`);
      fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));
    } catch (error) {
      console.error(`Failed to save profile ${userId}:`, error);
    }
  }
  
  /**
   * Get or create user profile
   */
  getProfile(userId: string): UserProfile {
    if (!this.profiles.has(userId)) {
      const newProfile: UserProfile = {
        user_id: userId,
        domain_preferences: {},
        deliverable_preferences: {},
        style_preferences: {},
        overrides: [],
        typical_domains: [],
        common_overlays: [],
        risk_tolerance: 'balanced'
      };
      
      this.profiles.set(userId, newProfile);
      this.saveProfile(userId, newProfile);
    }
    
    return this.profiles.get(userId)!;
  }
  
  /**
   * Record a user override of the automatic routing
   */
  recordOverride(
    userId: string,
    sessionId: string,
    originalRouting: RoutingResult,
    userChoice: { primary: string; overlays: string[]; deliverable: string },
    textContext: string,
    satisfactionFeedback?: number
  ): void {
    const profile = this.getProfile(userId);
    
    const override: UserOverride = {
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      original_routing: originalRouting,
      user_choice: userChoice,
      satisfaction_feedback: satisfactionFeedback,
      text_context: textContext
    };
    
    profile.overrides.push(override);
    
    // Update preferences based on override
    this.updatePreferencesFromOverride(profile, override);
    
    // Keep only recent overrides (last 100)
    if (profile.overrides.length > 100) {
      profile.overrides = profile.overrides.slice(-100);
    }
    
    this.saveProfile(userId, profile);
    
    // Record learning signal
    this.recordLearningSignal({
      user_id: userId,
      signal_type: 'override',
      routing: originalRouting,
      feedback_value: this.calculateOverrideFeedback(originalRouting, userChoice),
      context: { original: originalRouting, chosen: userChoice, text: textContext },
      timestamp: new Date().toISOString()
    });
    
    console.log(`📝 Recorded override for user ${userId}: ${originalRouting.primary} → ${userChoice.primary}`);
  }
  
  /**
   * Update user preferences based on an override
   */
  private updatePreferencesFromOverride(profile: UserProfile, override: UserOverride): void {
    const { original_routing, user_choice } = override;
    
    // Domain preference adjustment
    if (user_choice.primary !== original_routing.primary) {
      // Decrease preference for originally suggested domain
      profile.domain_preferences[original_routing.primary] = 
        (profile.domain_preferences[original_routing.primary] || 0) - 0.1;
      
      // Increase preference for chosen domain
      profile.domain_preferences[user_choice.primary] = 
        (profile.domain_preferences[user_choice.primary] || 0) + 0.2;
    }
    
    // Deliverable preference adjustment
    if (user_choice.deliverable !== original_routing.deliverable_guess) {
      profile.deliverable_preferences[user_choice.deliverable] = 
        (profile.deliverable_preferences[user_choice.deliverable] || 0) + 0.15;
    }
    
    // Update typical domains and overlays
    if (!profile.typical_domains.includes(user_choice.primary)) {
      profile.typical_domains.push(user_choice.primary);
    }
    
    user_choice.overlays.forEach(overlay => {
      if (!profile.common_overlays.includes(overlay)) {
        profile.common_overlays.push(overlay);
      }
    });
    
    // Clamp preferences to reasonable ranges
    this.clampPreferences(profile);
  }
  
  /**
   * Clamp preference values to reasonable ranges
   */
  private clampPreferences(profile: UserProfile): void {
    Object.keys(profile.domain_preferences).forEach(domain => {
      profile.domain_preferences[domain] = Math.max(-0.5, 
        Math.min(0.5, profile.domain_preferences[domain]));
    });
    
    Object.keys(profile.deliverable_preferences).forEach(deliverable => {
      profile.deliverable_preferences[deliverable] = Math.max(0, 
        Math.min(1.0, profile.deliverable_preferences[deliverable]));
    });
  }
  
  /**
   * Calculate feedback value from override (negative = original was bad)
   */
  private calculateOverrideFeedback(
    original: RoutingResult, 
    chosen: { primary: string; overlays: string[]; deliverable: string }
  ): number {
    let feedback = 0;
    
    // Domain change penalty
    if (chosen.primary !== original.primary) {
      feedback -= 0.3;
    }
    
    // Overlay changes
    const originalOverlays = new Set(original.overlays);
    const chosenOverlays = new Set(chosen.overlays);
    
    // Removed overlays
    originalOverlays.forEach(overlay => {
      if (!chosenOverlays.has(overlay)) {
        feedback -= 0.1;
      }
    });
    
    // Added overlays
    chosenOverlays.forEach(overlay => {
      if (!originalOverlays.has(overlay)) {
        feedback -= 0.05; // Less penalty for additions
      }
    });
    
    // Deliverable change
    if (chosen.deliverable !== original.deliverable_guess) {
      feedback -= 0.1;
    }
    
    return feedback;
  }
  
  /**
   * Record satisfaction feedback
   */
  recordSatisfaction(
    userId: string,
    routing: RoutingResult,
    satisfactionScore: number, // 1-5
    context: Record<string, any> = {}
  ): void {
    const profile = this.getProfile(userId);
    
    // Find most recent override to update
    const recentOverride = profile.overrides
      .slice()
      .reverse()
      .find(o => o.original_routing.primary === routing.primary);
    
    if (recentOverride) {
      recentOverride.satisfaction_feedback = satisfactionScore;
      this.saveProfile(userId, profile);
    }
    
    // Record learning signal
    this.recordLearningSignal({
      user_id: userId,
      signal_type: 'satisfaction',
      routing,
      feedback_value: (satisfactionScore - 3) / 2, // Convert 1-5 to -1 to 1
      context,
      timestamp: new Date().toISOString()
    });
    
    console.log(`⭐ User ${userId} satisfaction: ${satisfactionScore}/5 for ${routing.primary}`);
  }
  
  /**
   * Record a learning signal for analysis
   */
  private recordLearningSignal(signal: LearningSignal): void {
    this.learningSignals.push(signal);
    
    // Keep only recent signals (last 1000)
    if (this.learningSignals.length > 1000) {
      this.learningSignals = this.learningSignals.slice(-1000);
    }
  }
  
  /**
   * Apply user preferences to routing
   */
  applyUserPreferences(userId: string, routing: RoutingResult): RoutingResult {
    const profile = this.getProfile(userId);
    
    // Apply domain preference boost
    const domainBoost = profile.domain_preferences[routing.primary] || 0;
    routing.confidence = Math.max(0, Math.min(1, routing.confidence + domainBoost));
    
    // Add common overlays if confidence is high enough
    if (routing.confidence > 0.7) {
      profile.common_overlays.forEach(overlay => {
        if (!routing.overlays.includes(overlay) && 
            !routing.safety_overlays.includes(overlay)) {
          routing.overlays.push(overlay);
        }
      });
    }
    
    // Apply deliverable preferences
    const preferredDeliverable = Object.entries(profile.deliverable_preferences)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (preferredDeliverable && preferredDeliverable[1] > 0.3) {
      routing.deliverable_guess = preferredDeliverable[0];
    }
    
    return routing;
  }
  
  /**
   * Get personalized domain suggestions for a user
   */
  getPersonalizedSuggestions(userId: string): {
    preferred_domains: string[];
    preferred_deliverables: string[];
    common_overlays: string[];
  } {
    const profile = this.getProfile(userId);
    
    const preferredDomains = Object.entries(profile.domain_preferences)
      .filter(([, score]) => score > 0.1)
      .sort(([, a], [, b]) => b - a)
      .map(([domain]) => domain)
      .slice(0, 3);
    
    const preferredDeliverables = Object.entries(profile.deliverable_preferences)
      .filter(([, score]) => score > 0.2)
      .sort(([, a], [, b]) => b - a)
      .map(([deliverable]) => deliverable)
      .slice(0, 3);
    
    return {
      preferred_domains: preferredDomains,
      preferred_deliverables: preferredDeliverables,
      common_overlays: profile.common_overlays.slice(0, 5)
    };
  }
  
  /**
   * Analyze learning patterns across all users
   */
  analyzeLearningPatterns(): {
    popular_domains: Array<{ domain: string; override_rate: number }>;
    common_override_patterns: Array<{ from: string; to: string; frequency: number }>;
    satisfaction_by_domain: Record<string, number>;
  } {
    const allProfiles = Array.from(this.profiles.values());
    
    // Calculate popular domains by low override rate
    const domainStats = new Map<string, { total: number; overrides: number }>();
    
    allProfiles.forEach(profile => {
      profile.typical_domains.forEach(domain => {
        if (!domainStats.has(domain)) {
          domainStats.set(domain, { total: 0, overrides: 0 });
        }
        domainStats.get(domain)!.total++;
      });
      
      profile.overrides.forEach(override => {
        const original = override.original_routing.primary;
        if (domainStats.has(original)) {
          domainStats.get(original)!.overrides++;
        }
      });
    });
    
    const popularDomains = Array.from(domainStats.entries())
      .map(([domain, stats]) => ({
        domain,
        override_rate: stats.total > 0 ? stats.overrides / stats.total : 0
      }))
      .sort((a, b) => a.override_rate - b.override_rate);
    
    // Common override patterns
    const overridePatterns = new Map<string, number>();
    allProfiles.forEach(profile => {
      profile.overrides.forEach(override => {
        const pattern = `${override.original_routing.primary}→${override.user_choice.primary}`;
        overridePatterns.set(pattern, (overridePatterns.get(pattern) || 0) + 1);
      });
    });
    
    const commonOverridePatterns = Array.from(overridePatterns.entries())
      .map(([pattern, frequency]) => {
        const [from, to] = pattern.split('→');
        return { from, to, frequency };
      })
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
    
    // Satisfaction by domain
    const satisfactionByDomain: Record<string, number> = {};
    allProfiles.forEach(profile => {
      profile.overrides.forEach(override => {
        if (override.satisfaction_feedback) {
          const domain = override.user_choice.primary;
          if (!satisfactionByDomain[domain]) {
            satisfactionByDomain[domain] = 0;
          }
          satisfactionByDomain[domain] += override.satisfaction_feedback;
        }
      });
    });
    
    return {
      popular_domains: popularDomains,
      common_override_patterns: commonOverridePatterns,
      satisfaction_by_domain: satisfactionByDomain
    };
  }
  
  /**
   * Get learning system statistics
   */
  getStats(): {
    total_users: number;
    total_overrides: number;
    total_signals: number;
    recent_activity: number;
  } {
    const allProfiles = Array.from(this.profiles.values());
    const totalOverrides = allProfiles.reduce((sum, p) => sum + p.overrides.length, 0);
    
    const recentThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    const recentActivity = this.learningSignals.filter(s => 
      new Date(s.timestamp) > recentThreshold
    ).length;
    
    return {
      total_users: this.profiles.size,
      total_overrides: totalOverrides,
      total_signals: this.learningSignals.length,
      recent_activity: recentActivity
    };
  }
}

/**
 * Global learning system instance
 */
export const userLearning = new UserLearningSystem();
