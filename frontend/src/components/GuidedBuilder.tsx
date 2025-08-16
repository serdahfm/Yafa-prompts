import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, CheckCircle2 } from 'lucide-react';

interface GuidedBuilderProps {
  isDadMode: boolean;
  onExecute: (plan: any) => void;
}

export function GuidedBuilder({ isDadMode, onExecute }: GuidedBuilderProps) {
  const [mission, setMission] = useState('');
  const [mode, setMode] = useState('Standard');
  const [yafa, setYafa] = useState('Off');
  const [dial, setDial] = useState('Plan+Drafts');
  const [plan, setPlan] = useState(null);
  const [isPlanning, setIsPlanning] = useState(false);

  const generatePlan = async () => {
    if (!mission.trim()) return;
    
    setIsPlanning(true);
    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mission, mode, yafa, dial })
      });
      
      const result = await response.json();
      setPlan(result);
    } catch (error) {
      console.error('Planning failed:', error);
    } finally {
      setIsPlanning(false);
    }
  };

  const handleExecute = () => {
    onExecute({ mission, mode, yafa, dial, plan });
  };

  return (
    <div className="space-y-8">
      <Card className="card-apple">
        <CardHeader className="space-y-3">
          <CardTitle className="text-2xl text-balance">
            {isDadMode ? "What would you like to accomplish?" : "Mission Definition"}
          </CardTitle>
          <CardDescription className="text-neutral-600 text-lg leading-relaxed">
            {isDadMode 
              ? "Describe your goal in plain language - I'll handle the details"
              : "Define your objective with context and constraints"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <label htmlFor="mission-input" className="text-sm font-semibold text-neutral-700 block">
              {isDadMode ? "Your Goal" : "Mission Description"}
            </label>
            <Textarea
              id="mission-input"
              placeholder={isDadMode 
                ? "I need help with..." 
                : "Describe your mission, goals, and any specific requirements..."
              }
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              rows={4}
              className="min-h-[120px] focus-ring motion-fast text-base resize-none"
              aria-describedby="mission-help"
            />
            <p id="mission-help" className="text-sm text-neutral-500">
              {isDadMode 
                ? "Be as specific or general as you'd like - I'll ask clarifying questions if needed"
                : "Include any constraints, deadlines, or specific requirements"
              }
            </p>
          </div>
          
          {!isDadMode && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <label htmlFor="mode-select" className="text-sm font-semibold text-neutral-700 block">
                  Mode
                  <span className="text-neutral-500 font-normal ml-1">(How to approach)</span>
                </label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger id="mode-select" className="focus-ring">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="Brainstorm">Brainstorm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-3">
                <label htmlFor="yafa-select" className="text-sm font-semibold text-neutral-700 block">
                  YAFA Protocol
                  <span className="text-neutral-500 font-normal ml-1">(Risk checking)</span>
                </label>
                <Select value={yafa} onValueChange={setYafa}>
                  <SelectTrigger id="yafa-select" className="focus-ring">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Off">Off</SelectItem>
                    <SelectItem value="On">High-Stakes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-3">
                <label htmlFor="dial-select" className="text-sm font-semibold text-neutral-700 block">
                  Execution Level
                  <span className="text-neutral-500 font-normal ml-1">(How much to do)</span>
                </label>
                <Select value={dial} onValueChange={setDial}>
                  <SelectTrigger id="dial-select" className="focus-ring">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Plan+Drafts">Plan + Drafts</SelectItem>
                    <SelectItem value="Full Exec">Full Execution</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <div className="pt-2">
            <Button 
              onClick={generatePlan}
              disabled={!mission.trim() || isPlanning}
              className={`h-12 px-8 text-base font-semibold button-apple interactive ${
                isDadMode ? 'w-full' : 'w-full md:w-auto'
              } ${
                !mission.trim() || isPlanning ? 'loading' : ''
              }`}
              size="lg"
            >
              {isPlanning ? "Analyzing..." : (isDadMode ? "Let's Go!" : "Generate Plan")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {plan && (
        <Card className="card-apple">
          <CardHeader className="space-y-3">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <CheckCircle2 className="w-6 h-6 text-accent-600" />
              Execution Plan Ready
            </CardTitle>
            <CardDescription className="text-neutral-600 text-lg leading-relaxed">
              {isDadMode ? "Here's what I'll do for you" : "Review and modify the proposed approach"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-neutral-50 rounded-xl p-6 border border-neutral-200">
              <h4 className="font-semibold text-neutral-900 mb-3">Summary</h4>
              <p className="text-neutral-700 leading-relaxed">{plan.summary}</p>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold text-neutral-900">Deliverables</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {plan.deliverables?.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-accent-50 rounded-lg border border-accent-200">
                    <CheckCircle2 className="w-4 h-4 text-accent-600 flex-shrink-0" />
                    <span className="text-accent-900 font-medium">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="pt-2">
              <Button 
                onClick={handleExecute} 
                className="h-12 px-8 text-base font-semibold button-apple interactive w-full md:w-auto bg-accent-600 hover:bg-accent-700 text-white"
                size="lg"
              >
                <Play className="w-5 h-5 mr-2" />
                {isDadMode ? "Let's Do This!" : "Execute Plan"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
