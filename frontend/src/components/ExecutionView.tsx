import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Download, Eye, RotateCcw } from 'lucide-react';

interface ExecutionViewProps {
  runId: string;
  isDadMode: boolean;
  onReset: () => void;
}

export function ExecutionView({ runId, isDadMode, onReset }: ExecutionViewProps) {
  const [status, setStatus] = useState('running');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const pollResults = async () => {
      try {
        const response = await fetch(`/api/results/${runId}`);
        const data = await response.json();
        
        setStatus(data.status);
        setProgress(data.progress || 0);
        setResults(data.results);
        setLogs(data.logs || []);
        
        if (data.status === 'completed' || data.status === 'failed') {
          return; // Stop polling
        }
        
        setTimeout(pollResults, 2000);
      } catch (error) {
        console.error('Polling failed:', error);
        setTimeout(pollResults, 5000);
      }
    };

    pollResults();
  }, [runId]);

  const downloadBundle = async () => {
    try {
      const response = await fetch(`/api/download/${runId}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `yafa-results-${runId}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <div className="space-y-8">
      <Card className="card-apple">
        <CardHeader className="space-y-3">
          <CardTitle className="flex items-center justify-between text-2xl">
            <span className="text-balance">
              {isDadMode ? "Working on it..." : `Execution ${runId}`}
            </span>
            <div className="flex items-center gap-3">
              <Badge 
                variant={status === 'completed' ? 'default' : status === 'failed' ? 'destructive' : 'secondary'}
                className="px-3 py-1 text-sm font-medium"
              >
                {status}
              </Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onReset}
                className="focus-ring button-apple"
                aria-label="Start new task"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </CardTitle>
          <CardDescription className="text-neutral-600 text-lg leading-relaxed">
            {isDadMode 
              ? status === 'completed' 
                ? "All done! Here are your results:"
                : "Please wait while I work on your request..."
              : "Real-time execution progress and logs"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-neutral-700">Progress</span>
              <span 
                className="text-sm font-medium text-neutral-600"
                aria-live="polite"
                aria-label={`${Math.round(progress)}% complete`}
              >
                {Math.round(progress)}%
              </span>
            </div>
            <Progress 
              value={progress} 
              className="w-full h-3 progress-smooth" 
              aria-label="Execution progress"
            />
          </div>
          
          {!isDadMode && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-neutral-700">Activity Log</h4>
              <div 
                className="bg-neutral-50 rounded-xl p-4 max-h-40 overflow-y-auto text-sm font-mono border border-neutral-200 shadow-inner"
                aria-live="polite"
                aria-label="Activity log"
                role="log"
              >
                {logs.length > 0 ? (
                  logs.map((log, idx) => (
                    <div key={idx} className="text-neutral-700 py-1 border-b border-neutral-200 last:border-0">
                      <span className="text-neutral-500">{log.timestamp}:</span> {log.message}
                    </div>
                  ))
                ) : (
                  <div className="text-neutral-500 italic">Waiting for activity...</div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {results && (
        <Card className="card-apple">
          <CardHeader className="space-y-3">
            <CardTitle className="text-2xl text-balance">Results</CardTitle>
            <CardDescription className="text-neutral-600 text-lg leading-relaxed">
              {isDadMode ? "Everything you requested:" : "Generated artifacts and deliverables"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-neutral-50 rounded-xl p-6 border border-neutral-200">
              <h4 className="font-semibold text-neutral-900 mb-3">Preview</h4>
              <div className="prose prose-neutral max-w-none text-neutral-700 leading-relaxed">
                {results.preview}
              </div>
            </div>
            
            {results.files && results.files.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-semibold text-neutral-900">Files Generated</h4>
                <div className="grid grid-cols-1 gap-3">
                  {results.files.map((file, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl border border-neutral-200 interactive"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-accent-500 rounded-full"></div>
                        <span className="text-neutral-900 font-medium">{file.path}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="focus-ring button-apple"
                        aria-label={`Preview ${file.path}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button 
                onClick={downloadBundle}
                className="h-12 px-6 text-base font-semibold button-apple interactive bg-accent-600 hover:bg-accent-700 text-white"
                size="lg"
              >
                <Download className="w-5 h-5 mr-2" />
                Download Bundle
              </Button>
              <Button 
                variant="outline" 
                onClick={onReset}
                className="h-12 px-6 text-base font-semibold button-apple interactive border-2"
                size="lg"
              >
                New Task
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

