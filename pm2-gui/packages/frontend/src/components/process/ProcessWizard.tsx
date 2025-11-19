import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Check, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { processesApi, systemApi } from '@/api/endpoints';
import toast from 'react-hot-toast';
import { ProcessConfig } from '@/types';

type Step = 'basic' | 'execution' | 'resources' | 'environment' | 'advanced';

const STEPS: { id: Step; title: string; description: string }[] = [
  { id: 'basic', title: 'Basic Info', description: 'Name and script' },
  { id: 'execution', title: 'Execution', description: 'Mode and instances' },
  { id: 'resources', title: 'Resources', description: 'Memory and restarts' },
  { id: 'environment', title: 'Environment', description: 'Variables' },
  { id: 'advanced', title: 'Advanced', description: 'Watch and cron' },
];

export function ProcessWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('basic');
  const [loading, setLoading] = useState(false);

  const [config, setConfig] = useState<ProcessConfig>({
    name: '',
    script: '',
    cwd: '',
    args: [],
    instances: 1,
    exec_mode: 'fork',
    env: {},
    max_memory_restart: '',
    max_restarts: 10,
    min_uptime: 1000,
    autorestart: true,
    watch: false,
    ignore_watch: ['node_modules', '.git'],
    cron_restart: '',
    interpreter: 'node',
  });

  const [envKey, setEnvKey] = useState('');
  const [envValue, setEnvValue] = useState('');
  const [argsInput, setArgsInput] = useState('');

  // Port conflict checking
  const [portCheck, setPortCheck] = useState<{
    checking: boolean;
    available: boolean | null;
    suggestions: number[];
  }>({ checking: false, available: null, suggestions: [] });

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  const canProceed = () => {
    switch (currentStep) {
      case 'basic':
        return config.name.trim() !== '' && config.script.trim() !== '';
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1 && canProceed()) {
      setCurrentStep(STEPS[currentStepIndex + 1].id);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(STEPS[currentStepIndex - 1].id);
    }
  };

  const handleSubmit = async () => {
    if (!canProceed()) return;

    setLoading(true);
    try {
      // Clean up config before sending
      const cleanConfig = {
        ...config,
        args: config.args?.length ? config.args : undefined,
        cwd: config.cwd || undefined,
        max_memory_restart: config.max_memory_restart || undefined,
        cron_restart: config.cron_restart || undefined,
        ignore_watch: config.watch ? config.ignore_watch : undefined,
      };

      await processesApi.start(cleanConfig);
      toast.success(`Process ${config.name} started successfully`);
      navigate('/');
    } catch (error) {
      toast.error(`Failed to start: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const addEnvVar = () => {
    if (envKey && envValue) {
      setConfig({
        ...config,
        env: { ...config.env, [envKey]: envValue },
      });
      setEnvKey('');
      setEnvValue('');
    }
  };

  const removeEnvVar = (key: string) => {
    const newEnv = { ...config.env };
    delete newEnv[key];
    setConfig({ ...config, env: newEnv });
  };

  const addArg = () => {
    if (argsInput.trim()) {
      setConfig({
        ...config,
        args: [...(config.args || []), argsInput.trim()],
      });
      setArgsInput('');
    }
  };

  const removeArg = (index: number) => {
    setConfig({
      ...config,
      args: config.args?.filter((_, i) => i !== index),
    });
  };

  // Check port availability with debounce
  const checkPortAvailability = useCallback(async (port: string) => {
    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      setPortCheck({ checking: false, available: null, suggestions: [] });
      return;
    }

    setPortCheck({ checking: true, available: null, suggestions: [] });

    try {
      const result = await systemApi.checkPort(portNum);
      if (result.available) {
        setPortCheck({ checking: false, available: true, suggestions: [] });
      } else {
        // Port is occupied, get suggestions
        const suggestions = await systemApi.suggestPorts(portNum, 3);
        setPortCheck({
          checking: false,
          available: false,
          suggestions: suggestions.suggestions,
        });
      }
    } catch (error) {
      console.error('Port check failed:', error);
      setPortCheck({ checking: false, available: null, suggestions: [] });
    }
  }, []);

  // Debounced port checking when PORT env var is being entered
  useEffect(() => {
    if (envKey === 'PORT' && envValue) {
      const timer = setTimeout(() => {
        checkPortAvailability(envValue);
      }, 500); // 500ms debounce

      return () => clearTimeout(timer);
    } else {
      setPortCheck({ checking: false, available: null, suggestions: [] });
    }
  }, [envKey, envValue, checkPortAvailability]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    index < currentStepIndex
                      ? 'bg-green-500 text-white'
                      : index === currentStepIndex
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {index < currentStepIndex ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="mt-2 text-center">
                  <div className="text-sm font-medium">{step.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {step.description}
                  </div>
                </div>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-24 h-1 mx-2 ${
                    index < currentStepIndex ? 'bg-green-500' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="rounded-lg border bg-card p-6 min-h-[400px]">
        {currentStep === 'basic' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Basic Information</h2>
            <p className="text-muted-foreground">
              Enter the basic details for your process.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Process Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={config.name}
                  onChange={(e) => setConfig({ ...config, name: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 focus:ring-2 focus:ring-primary"
                  placeholder="my-api-server"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  A unique name to identify your process
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Script Path <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={config.script}
                  onChange={(e) => setConfig({ ...config, script: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 focus:ring-2 focus:ring-primary"
                  placeholder="/home/user/app/server.js"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Absolute path to the script file
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Working Directory
                </label>
                <input
                  type="text"
                  value={config.cwd || ''}
                  onChange={(e) => setConfig({ ...config, cwd: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 focus:ring-2 focus:ring-primary"
                  placeholder="/home/user/app"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Directory where the script will be executed
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Interpreter
                </label>
                <select
                  value={config.interpreter || 'node'}
                  onChange={(e) => setConfig({ ...config, interpreter: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2"
                >
                  <option value="node">Node.js</option>
                  <option value="python">Python</option>
                  <option value="python3">Python 3</option>
                  <option value="bash">Bash</option>
                  <option value="none">None (binary)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {currentStep === 'execution' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Execution Mode</h2>
            <p className="text-muted-foreground">
              Choose how your process should run.
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div
                  onClick={() =>
                    setConfig({ ...config, exec_mode: 'fork', instances: 1 })
                  }
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    config.exec_mode === 'fork'
                      ? 'border-primary bg-primary/10'
                      : 'border-muted hover:border-primary/50'
                  }`}
                >
                  <div className="font-semibold">Fork Mode</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Single instance, suitable for most applications
                  </p>
                </div>
                <div
                  onClick={() => setConfig({ ...config, exec_mode: 'cluster' })}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    config.exec_mode === 'cluster'
                      ? 'border-primary bg-primary/10'
                      : 'border-muted hover:border-primary/50'
                  }`}
                >
                  <div className="font-semibold">Cluster Mode</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Multiple instances, load balancing enabled
                  </p>
                </div>
              </div>

              {config.exec_mode === 'cluster' && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Number of Instances
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={1}
                      max={16}
                      value={
                        config.instances === 'max' ? 16 : (config.instances as number)
                      }
                      onChange={(e) =>
                        setConfig({ ...config, instances: parseInt(e.target.value) })
                      }
                      className="flex-1"
                    />
                    <input
                      type="number"
                      min={1}
                      value={
                        config.instances === 'max' ? '' : (config.instances as number)
                      }
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          instances: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-20 rounded-md border bg-background px-3 py-2"
                    />
                    <button
                      onClick={() => setConfig({ ...config, instances: 'max' })}
                      className={`px-3 py-2 rounded-md ${
                        config.instances === 'max'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      Max CPUs
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 'resources' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Resource Management</h2>
            <p className="text-muted-foreground">
              Configure memory limits and restart behavior.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Max Memory Restart
                </label>
                <input
                  type="text"
                  value={config.max_memory_restart || ''}
                  onChange={(e) =>
                    setConfig({ ...config, max_memory_restart: e.target.value })
                  }
                  className="w-full rounded-md border bg-background px-3 py-2"
                  placeholder="512M or 1G"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Restart when memory exceeds this limit (e.g., 512M, 1G)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Max Restarts
                </label>
                <input
                  type="number"
                  value={config.max_restarts || 10}
                  onChange={(e) =>
                    setConfig({ ...config, max_restarts: parseInt(e.target.value) || 10 })
                  }
                  min={0}
                  className="w-full rounded-md border bg-background px-3 py-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Stop trying to restart after this many consecutive restarts
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Min Uptime (ms)
                </label>
                <input
                  type="number"
                  value={config.min_uptime || 1000}
                  onChange={(e) =>
                    setConfig({ ...config, min_uptime: parseInt(e.target.value) || 1000 })
                  }
                  min={0}
                  className="w-full rounded-md border bg-background px-3 py-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Consider started stable after this uptime
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autorestart"
                  checked={config.autorestart}
                  onChange={(e) =>
                    setConfig({ ...config, autorestart: e.target.checked })
                  }
                  className="rounded"
                />
                <label htmlFor="autorestart" className="font-medium">
                  Auto Restart on Failure
                </label>
              </div>
            </div>
          </div>
        )}

        {currentStep === 'environment' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Environment Variables</h2>
            <p className="text-muted-foreground">
              Set environment variables for your process.
            </p>

            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={envKey}
                  onChange={(e) => setEnvKey(e.target.value.toUpperCase())}
                  placeholder="KEY"
                  className="flex-1 rounded-md border bg-background px-3 py-2 font-mono"
                />
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={envValue}
                    onChange={(e) => setEnvValue(e.target.value)}
                    placeholder="value"
                    className={`w-full rounded-md border bg-background px-3 py-2 ${
                      envKey === 'PORT' && portCheck.available === false
                        ? 'border-red-500 pr-10'
                        : envKey === 'PORT' && portCheck.available === true
                        ? 'border-green-500 pr-10'
                        : ''
                    }`}
                  />
                  {envKey === 'PORT' && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {portCheck.checking ? (
                        <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                      ) : portCheck.available === true ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" title="Port available" />
                      ) : portCheck.available === false ? (
                        <AlertCircle className="h-4 w-4 text-red-500" title="Port in use" />
                      ) : null}
                    </div>
                  )}
                </div>
                <button
                  onClick={addEnvVar}
                  className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Add
                </button>
              </div>

              {/* Port conflict warning and suggestions */}
              {envKey === 'PORT' && portCheck.available === false && portCheck.suggestions.length > 0 && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">
                        Port {envValue} is already in use
                      </p>
                      <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                        Try one of these available ports:
                      </p>
                      <div className="flex gap-2 mt-2">
                        {portCheck.suggestions.map((port) => (
                          <button
                            key={port}
                            onClick={() => setEnvValue(port.toString())}
                            className="px-3 py-1 rounded bg-white dark:bg-gray-800 border border-red-300 dark:border-red-800 text-sm font-mono hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            {port}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Port available confirmation */}
              {envKey === 'PORT' && portCheck.available === true && (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-md p-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Port {envValue} is available
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      setEnvKey('NODE_ENV');
                      setEnvValue(e.target.value);
                    }
                  }}
                  className="flex-1 rounded-md border bg-background px-3 py-2"
                  defaultValue=""
                >
                  <option value="">Quick Add NODE_ENV...</option>
                  <option value="development">development</option>
                  <option value="production">production</option>
                  <option value="staging">staging</option>
                  <option value="test">test</option>
                </select>
              </div>

              {Object.entries(config.env || {}).length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {Object.entries(config.env || {}).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between bg-muted p-3 rounded"
                    >
                      <span className="font-mono text-sm">
                        <span className="text-primary font-semibold">{key}</span>=
                        {value}
                      </span>
                      <button
                        onClick={() => removeEnvVar(key)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No environment variables configured
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 'advanced' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Advanced Options</h2>
            <p className="text-muted-foreground">
              Configure watching, cron restart, and script arguments.
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="watch"
                  checked={config.watch}
                  onChange={(e) => setConfig({ ...config, watch: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="watch" className="font-medium">
                  Enable Watch Mode
                </label>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Automatically restart when file changes are detected
              </p>

              {config.watch && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Ignore Patterns
                  </label>
                  <input
                    type="text"
                    value={config.ignore_watch?.join(', ') || 'node_modules, .git'}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        ignore_watch: e.target.value.split(',').map((s) => s.trim()),
                      })
                    }
                    className="w-full rounded-md border bg-background px-3 py-2"
                    placeholder="node_modules, .git, logs"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">
                  Cron Restart Pattern
                </label>
                <input
                  type="text"
                  value={config.cron_restart || ''}
                  onChange={(e) =>
                    setConfig({ ...config, cron_restart: e.target.value })
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 font-mono"
                  placeholder="0 0 * * *"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Automatically restart at scheduled times (cron format)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Script Arguments
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={argsInput}
                    onChange={(e) => setArgsInput(e.target.value)}
                    className="flex-1 rounded-md border bg-background px-3 py-2"
                    placeholder="--port 3000"
                    onKeyPress={(e) => e.key === 'Enter' && addArg()}
                  />
                  <button
                    onClick={addArg}
                    className="px-4 py-2 rounded-md bg-muted hover:bg-muted/80"
                  >
                    Add
                  </button>
                </div>
                {config.args && config.args.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {config.args.map((arg, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1 bg-muted px-2 py-1 rounded"
                      >
                        <span className="font-mono text-sm">{arg}</span>
                        <button
                          onClick={() => removeArg(i)}
                          className="text-red-500 hover:text-red-700"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button
          onClick={handleBack}
          disabled={currentStepIndex === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-md bg-gray-600 text-white hover:bg-gray-700"
          >
            Cancel
          </button>

          {currentStepIndex < STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading || !canProceed()}
              className="flex items-center gap-2 px-6 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Starting...' : 'Start Process'}
              <Check className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
