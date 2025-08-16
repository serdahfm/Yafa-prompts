import React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { HelpCircle, Zap } from 'lucide-react';

interface AppHeaderProps {
  isDadMode: boolean;
  onModeToggle: (isDad: boolean) => void;
  onHelp: () => void;
}

export function AppHeader({ isDadMode, onModeToggle, onHelp }: AppHeaderProps) {
  return (
    <header className="border-b border-neutral-200 gradient-header backdrop-blur-sm sticky top-0 z-50 motion-safe">
      <div className="container mx-auto px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 gradient-brand rounded-xl flex items-center justify-center elevation-2 interactive">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="space-y-0.5">
              <h1 className="text-xl font-semibold text-neutral-900 text-balance">YAFA-MS</h1>
              <p className="text-sm text-neutral-600 font-medium">AI Business Assistant</p>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4 p-1 bg-neutral-100 rounded-xl">
              <span className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-all motion-fast ${
                isDadMode ? 'text-neutral-600' : 'text-neutral-900 bg-white elevation-1'
              }`}>
                Expert
              </span>
              <Switch 
                checked={isDadMode}
                onCheckedChange={onModeToggle}
                aria-label="Toggle between Expert and Dad mode"
                className="focus-ring"
              />
              <span className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-all motion-fast ${
                isDadMode ? 'text-neutral-900 bg-white elevation-1' : 'text-neutral-600'
              }`}>
                Dad Mode
              </span>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onHelp}
              className="text-neutral-500 hover:text-neutral-900 focus-ring button-apple"
              aria-label="Get help"
            >
              <HelpCircle className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
