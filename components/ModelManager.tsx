
import React, { useState, useEffect } from 'react';
import { Theme, LLMProvider, LLMModel, ModelType, Language, ProviderAdapter, McpServer, McpStats, McpRegistrationConfig } from '../types';
import { PixelButton, PixelInput, PixelCard, PixelSelect, PixelBadge } from './PixelUI';
import { THEME_STYLES, TRANSLATIONS, getProviderIcon, getBackendConfig, saveBackendConfig, clearBackendConfig } from '../constants';
import { Trash2, Plus, Zap, X, Save, Edit, Smile, Star, Activity, Wifi, Loader2, Server, Terminal, Box, Play, PauseCircle } from 'lucide-react';
import { apiClient } from '../services/apiClient';

interface ModelManagerProps {
  theme: Theme;
  language: Language;
  providers: LLMProvider[];
  models: LLMModel[];
  onUpdateProviders: (providers: LLMProvider[]) => void;
  onUpdateModels: (models: LLMModel[]) => void;
  onClose: () => void;
}

export const ModelManager: React.FC<ModelManagerProps> = ({
  theme,
  language,
  providers,
  models,
  onUpdateProviders,
  onUpdateModels,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'providers' | 'models' | 'mascot' | 'mcp' | 'backend'>('providers');
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const styles = THEME_STYLES[theme];
  const t = TRANSLATIONS[language];

  // Data State
  const [providerAdapters, setProviderAdapters] = useState<ProviderAdapter[]>([]);
  
  // Connection Test State
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{success: boolean, message: string, latency?: number, hint?: string} | null>(null);

  // Model Test State
  const [isTestingModel, setIsTestingModel] = useState(false);
  const [modelTestResult, setModelTestResult] = useState<{success: boolean, message: string, latency: number} | null>(null);

  // Edit Mode States
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);

  // Form State for Provider
  const [newProvider, setNewProvider] = useState<Partial<LLMProvider>>({ type: 'custom' });
  // Form State for Model
  const [newModel, setNewModel] = useState<Partial<LLMModel>>({ 
    type: 'chat',
    contextLength: 4096, 
    temperature: 0.7,
    maxTokens: 2048,
    dimensions: 1536,
    isDefault: false
  });

  // Mascot Config State
  const [mascotSystemPrompt, setMascotSystemPrompt] = useState('');

  // MCP State
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [mcpStats, setMcpStats] = useState<McpStats | null>(null);
  const [selectedMcpServer, setSelectedMcpServer] = useState<McpServer | null>(null);
  const [newMcpServer, setNewMcpServer] = useState<{
      id: string, command: string, args: string, env: string
  }>({ id: '', command: '', args: '', env: '{}' });

  // Backend Config State
  const [backendConfig, setBackendConfig] = useState({
    apiBaseUrl: '',
    apiKey: '',
  });
  const [backendSaveStatus, setBackendSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Load Backend Config on mount
  useEffect(() => {
    const config = getBackendConfig();
    setBackendConfig({
      apiBaseUrl: config.apiBaseUrl,
      apiKey: config.apiKey,
    });
  }, []);

  // Fetch Data on Open
  useEffect(() => {
      const loadData = async () => {
          const fetchedProviders = await apiClient.getProviders();
          onUpdateProviders(fetchedProviders);
          
          const fetchedModels = await apiClient.getAllModels();
          onUpdateModels(fetchedModels);

          const adapters = await apiClient.getProviderAdapters();
          setProviderAdapters(adapters);

          // Load Mascot Config
          const storedMascotPrompt = localStorage.getItem('pixel_mascot_system_prompt');
          if (storedMascotPrompt) setMascotSystemPrompt(storedMascotPrompt);
      };
      loadData();
  }, []);

  // Fetch MCP Data when tab is active
  useEffect(() => {
      if (activeTab === 'mcp') {
          loadMcpData();
      }
  }, [activeTab]);

  const loadMcpData = async () => {
      const servers = await apiClient.Mcp.getServers();
      setMcpServers(servers);
      const stats = await apiClient.Mcp.getStats();
      setMcpStats(stats);
  };

  const chatModels = models.filter(m => m.type === 'chat' || (m.type as any) === 'nlp' || !m.type || m.type === 'multimodal');

  const handleEditProvider = (p: LLMProvider) => {
      setEditingProviderId(p.id);
      setConnectionResult(null); 
      setNewProvider({ ...p, apiKey: '' }); 
  };

  const handleCancelProvider = () => {
      setEditingProviderId(null);
      setConnectionResult(null);
      setNewProvider({ type: 'custom', name: '', baseUrl: '', apiKey: '' });
  };

  const handleSaveProvider = async () => {
    if (!newProvider.name || !newProvider.baseUrl) return;
    try {
        if (editingProviderId) {
            const updated = await apiClient.updateProvider(editingProviderId, newProvider);
            onUpdateProviders(providers.map(p => p.id === editingProviderId ? updated : p));
            setEditingProviderId(null);
        } else {
            const created = await apiClient.createProvider(newProvider.name, newProvider.type, newProvider.baseUrl, newProvider.apiKey);
            onUpdateProviders([...providers, created]);
        }
        setNewProvider({ type: 'custom', name: '', baseUrl: '', apiKey: '' });
    } catch (e) {
        alert(t.saveFailed);
    }
  };

  const handleTestConnection = async () => {
      if (!newProvider.type || !newProvider.baseUrl) return;
      
      setIsTestingConnection(true);
      setConnectionResult(null);
      
      const payload = {
          provider: newProvider.type,
          baseConfig: {
              apiKey: newProvider.apiKey || '',
              baseURL: newProvider.baseUrl
          }
      };

      try {
          const result = await apiClient.testProviderConfiguration(payload);
          setConnectionResult({
              success: result.success,
              message: result.message,
              hint: result.hint
          });
      } catch (e) {
          setConnectionResult({
              success: false,
              message: t.connectionFailed
          });
      } finally {
          setIsTestingConnection(false);
      }
  };

  const handleEditModel = (m: LLMModel) => {
      setEditingModelId(m.id);
      setModelTestResult(null);
      let type = m.type;
      if ((type as any) === 'nlp') type = 'chat';
      setNewModel({ ...m, type }); 
  };

  const handleCancelModel = () => {
      setEditingModelId(null);
      setModelTestResult(null);
      setNewModel({ 
        type: 'chat',
        name: '', 
        modelId: '',
        contextLength: 4096,
        temperature: 0.7,
        maxTokens: 2048,
        dimensions: 1536,
        providerId: '',
        isDefault: false
      });
  };

  const handleSaveModel = async () => {
    if (!newModel.name || !newModel.modelId || !newModel.providerId) return;
    const type = newModel.type as ModelType || 'chat';
    
    const modelPayload: any = {
      providerId: newModel.providerId,
      name: newModel.name,
      modelId: newModel.modelId,
      type: type === 'chat' ? 'nlp' : type,
      contextLength: newModel.contextLength,
      maxTokens: newModel.maxTokens,
      temperature: newModel.temperature,
      dimensions: newModel.dimensions,
      isDefault: newModel.isDefault
    };

    try {
        if (editingModelId) {
            const updated = await apiClient.updateModel(editingModelId, modelPayload);
            onUpdateModels(models.map(m => m.id === editingModelId ? updated : m));
            setEditingModelId(null);
        } else {
            const created = await apiClient.createModel(modelPayload.providerId, modelPayload.name, modelPayload.modelId, modelPayload.type);
            onUpdateModels([...models, created]);
        }
        
        setNewModel({ 
            ...newModel, 
            name: '', 
            modelId: '',
            isDefault: false
        });
        setModelTestResult(null);
    } catch (e) {
        alert(t.saveFailed);
    }
  };

  const handleDeleteProvider = async (id: string) => {
    if (!confirm(t.deleteProviderConfirm)) return;
    try {
        await apiClient.deleteProvider(id);
        onUpdateProviders(providers.filter(p => p.id !== id));
        onUpdateModels(models.filter(m => m.providerId !== id));
        if (editingProviderId === id) handleCancelProvider();
    } catch (e) {
        alert(t.saveFailed);
    }
  };

  const handleDeleteModel = async (model: LLMModel) => {
      if (!confirm(t.deleteModelConfirm)) return;
      try {
          await apiClient.deleteModel(model.id);
          onUpdateModels(models.filter(x => x.id !== model.id));
          if (editingModelId === model.id) handleCancelModel();
      } catch (e) {
          alert(t.saveFailed);
      }
  };

  // Backend Config Handlers
  const handleSaveBackendConfig = () => {
    setBackendSaveStatus('saving');
    try {
      saveBackendConfig(backendConfig);
      setTimeout(() => setBackendSaveStatus('saved'), 500);
      setTimeout(() => setBackendSaveStatus('idle'), 2000);
    } catch (error) {
      alert(t.saveFailed);
      setBackendSaveStatus('idle');
    }
  };

  const handleResetBackendConfig = () => {
    clearBackendConfig();
    const defaultConfig = getBackendConfig();
    setBackendConfig({
      apiBaseUrl: defaultConfig.apiBaseUrl,
      apiKey: defaultConfig.apiKey,
    });
    setBackendSaveStatus('saved');
    setTimeout(() => setBackendSaveStatus('idle'), 2000);
  };

  const handleTestModel = async () => {
    if (!newModel.providerId || !newModel.modelId) return;
    
    const provider = providers.find(p => p.id === newModel.providerId);
    if (!provider) return;

    setIsTestingModel(true);
    setModelTestResult(null);

    const payload = {
        provider: provider.type,
        baseConfig: {
            apiKey: provider.apiKey || '',
            baseURL: provider.baseUrl
        },
        model: newModel.modelId
    };

    try {
        const result = await apiClient.validateModel(payload);
        setModelTestResult(result);
    } catch(e) {
        setModelTestResult({ success: false, message: 'Client Error', latency: 0 });
    } finally {
        setIsTestingModel(false);
    }
  };

  const handleSaveMascotConfig = () => {
      localStorage.setItem('pixel_mascot_system_prompt', mascotSystemPrompt);
      setTestStatus('mascot_saved');
      setTimeout(() => setTestStatus(null), 2000);
  };

  // MCP Actions
  const handleRegisterMcpServer = async () => {
      try {
          let envObj = {};
          try {
              envObj = JSON.parse(newMcpServer.env);
          } catch(e) {
              alert('Invalid JSON in Env Variables');
              return;
          }

          const config: McpRegistrationConfig = {
              id: newMcpServer.id,
              type: 'stdio',
              command: newMcpServer.command,
              args: newMcpServer.args.split(',').map(s => s.trim()).filter(Boolean),
              env: envObj
          };

          await apiClient.Mcp.registerServer(config);
          await loadMcpData();
          setNewMcpServer({ id: '', command: '', args: '', env: '{}' });
      } catch(e) {
          alert(t.saveFailed);
      }
  };

  const handleDeleteMcpServer = async (id: string) => {
      if(!confirm('Delete MCP Server?')) return;
      try {
          await apiClient.Mcp.deleteServer(id);
          await loadMcpData();
          if (selectedMcpServer?.id === id) setSelectedMcpServer(null);
      } catch(e) {
          alert(t.saveFailed);
      }
  };

  const handleRestartMcpServer = async (id: string) => {
      try {
          await apiClient.Mcp.restartServer(id);
          await loadMcpData();
      } catch(e) {
          alert(t.saveFailed);
      }
  }

  const getModelTypeColor = (type?: ModelType) => {
      switch(type) {
          case 'chat': case 'nlp' as any: return 'bg-blue-400 text-black';
          case 'embedding': return 'bg-purple-400 text-black';
          case 'rerank': return 'bg-orange-400 text-black';
          case 'multimodal': return 'bg-pink-400 text-black';
          default: return 'bg-gray-400 text-black';
      }
  };

  const groupedModels = {
      chat: models.filter(m => m.type === 'chat' || m.type === 'nlp' as any || !m.type),
      multimodal: models.filter(m => m.type === 'multimodal'),
      embedding: models.filter(m => m.type === 'embedding'),
      rerank: models.filter(m => m.type === 'rerank')
  };

  const renderModelItem = (m: LLMModel) => {
    const parent = providers.find(p => p.id === m.providerId);
    const isEditing = editingModelId === m.id;
    return (
      <div key={m.id} className={`border-2 border-black p-2 mb-2 flex justify-between items-center group bg-white/50 ${isEditing ? 'bg-blue-100/50 border-blue-500' : 'hover:bg-black/5'}`}>
        <div>
          <div className="font-bold flex items-center gap-2">
               <div className="w-5 h-5">{getProviderIcon(parent?.type || 'custom')}</div>
              {m.name}
              {m.isDefault && (
                  <PixelBadge theme={theme} color="bg-yellow-400 text-black border-yellow-600">
                      {t.default}
                  </PixelBadge>
              )}
          </div>
          <div className="text-xs opacity-70">{parent?.name} / {m.modelId}</div>
          <div className="text-[10px] opacity-50 mt-1 font-mono">
             {(m.type === 'chat' || m.type === 'multimodal' || (m.type as any) === 'nlp') && m.contextLength && `CTX: ${m.contextLength}`}
             {m.type === 'embedding' && m.dimensions && `DIM: ${m.dimensions}`}
          </div>
        </div>
        <div className="flex items-center">
            <button onClick={() => handleEditModel(m)} className="opacity-0 group-hover:opacity-100 text-blue-500 mr-2 hover:scale-110 transition-transform" title="Edit">
              <Edit size={16} />
            </button>
            <button onClick={() => handleDeleteModel(m)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:scale-110 transition-transform" title="Delete">
              <Trash2 size={16} />
            </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <PixelCard theme={theme} className={`w-full max-w-4xl h-[80vh] flex flex-col ${styles.bg} ${styles.text} overflow-hidden`}>
        <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-2">
          <h2 className={`text-2xl font-bold flex items-center gap-2`}>
            <Zap className="w-6 h-6" /> {t.llmConfig}
          </h2>
          <PixelButton theme={theme} onClick={onClose} variant="secondary">
            <X className="w-4 h-4" /> {t.close}
          </PixelButton>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <PixelButton 
            theme={theme} 
            onClick={() => setActiveTab('providers')} 
            variant={activeTab === 'providers' ? 'primary' : 'secondary'}
          >
            {t.providers}
          </PixelButton>
          <PixelButton
            theme={theme}
            onClick={() => setActiveTab('models')}
            variant={activeTab === 'models' ? 'primary' : 'secondary'}
          >
            {t.models}
          </PixelButton>
           <PixelButton 
            theme={theme} 
            onClick={() => setActiveTab('mascot')} 
            variant={activeTab === 'mascot' ? 'primary' : 'secondary'}
          >
            {t.mascotConfig}
          </PixelButton>
          <PixelButton 
            theme={theme} 
            onClick={() => setActiveTab('mcp')} 
            variant={activeTab === 'mcp' ? 'primary' : 'secondary'}
          >
            {t.mcp}
          </PixelButton>
          <PixelButton
            theme={theme}
            onClick={() => setActiveTab('backend')}
            variant={activeTab === 'backend' ? 'primary' : 'secondary'}
          >
            {t.backend}
          </PixelButton>
        </div>

        {activeTab === 'mascot' ? (
             <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center">
                 <div className="max-w-2xl w-full space-y-8">
                    <div className="border-b-2 border-black pb-2 mb-4">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Smile size={24} /> {t.mascotConfig}
                        </h3>
                    </div>

                    <div className="space-y-4">
                        <label className={`text-sm font-bold uppercase ${styles.text}`}>{t.mascotSystemPrompt}</label>
                        <textarea
                            className={`
                                w-full p-4 h-64 outline-none border-2 border-black
                                ${styles.inputBg} ${styles.text}
                                resize-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]
                                transition-all duration-200 font-mono text-sm
                            `}
                            placeholder={t.mascotPromptPlaceholder}
                            value={mascotSystemPrompt}
                            onChange={(e) => setMascotSystemPrompt(e.target.value)}
                        />
                    </div>

                     <div className="flex justify-end gap-4 items-center border-t-4 border-black pt-4">
                        {testStatus === 'mascot_saved' && <span className="text-green-500 font-bold animate-pulse">{t.configSaved}</span>}
                        <PixelButton theme={theme} onClick={handleSaveMascotConfig}>
                              <Save className="w-4 h-4" /> {t.saveConfig}
                        </PixelButton>
                    </div>
                  </div>
              </div>
        ) : activeTab === 'backend' ? (
             <div className="flex-1 overflow-y-auto p-4">
                 <div className="max-w-2xl w-full space-y-6">
                    <div className="border-b-4 border-black pb-2 mb-4">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Server size={24} /> {t.backendConfig}
                        </h3>
                        <p className={`text-sm mt-1 ${styles.textMuted}`}>{t.backendNote}</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className={`text-sm font-bold uppercase block mb-2 ${styles.text}`}>
                                {t.apiBaseUrl}
                            </label>
                            <input
                                type="text"
                                value={backendConfig.apiBaseUrl}
                                onChange={(e) => setBackendConfig(prev => ({ ...prev, apiBaseUrl: e.target.value }))}
                                className={`
                                    w-full p-3 outline-none border-2 border-black
                                    ${styles.inputBg} ${styles.text}
                                    focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]
                                    transition-all duration-200
                                `}
                                placeholder="http://localhost:3000"
                            />
                        </div>

                        <div>
                            <label className={`text-sm font-bold uppercase block mb-2 ${styles.text}`}>
                                {t.apiKey}
                            </label>
                            <input
                                type="password"
                                value={backendConfig.apiKey}
                                onChange={(e) => setBackendConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                                className={`
                                    w-full p-3 outline-none border-2 border-black
                                    ${styles.inputBg} ${styles.text}
                                    focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]
                                    transition-all duration-200
                                `}
                                placeholder="Enter API key"
                            />
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t-4 border-black">
                        <PixelButton
                            theme={theme}
                            variant="secondary"
                            onClick={handleResetBackendConfig}
                        >
                            {t.resetToDefault}
                        </PixelButton>
                        <div className="flex items-center gap-4">
                            {backendSaveStatus === 'saved' && (
                                <span className="text-green-500 font-bold animate-pulse">{t.configSaved}</span>
                            )}
                            <PixelButton theme={theme} onClick={handleSaveBackendConfig}>
                                <Save className="w-4 h-4" /> {t.saveConfig}
                            </PixelButton>
                        </div>
                    </div>
                 </div>
             </div>
        ) : activeTab === 'mcp' ? (
             <div className="flex-1 overflow-y-auto flex gap-4">
                 <div className="w-1/3 border-r-4 border-black pr-4 flex flex-col overflow-y-auto">
                    <div className="mb-4 bg-black/10 p-2 border border-black/20">
                        <div className="text-[10px] uppercase font-bold opacity-60 mb-1">{t.mcpStats}</div>
                        <div className="flex justify-between text-xs">
                            {/* CRITICAL FIX: 全链路可选链保护，防止嵌套属性读取错误 */}
                            <span>{t.mcpServers}: {mcpStats?.servers?.total ?? mcpServers.length}</span>
                            <span className="text-green-600 font-bold">{t.running}: {mcpStats?.servers?.running ?? mcpServers.filter(s => s.status.phase === 'running').length}</span>
                            <span>{t.totalTools}: {mcpStats?.tools?.total ?? mcpServers.reduce((acc, s) => acc + (s.tools?.length || 0), 0)}</span>
                        </div>
                    </div>
                    {mcpServers.map(server => (
                        <div 
                            key={server.id} 
                            onClick={() => setSelectedMcpServer(server)}
                            className={`
                                border-2 border-black p-2 mb-2 cursor-pointer transition-all
                                ${selectedMcpServer?.id === server.id ? 'bg-blue-500/10 border-blue-500' : 'hover:bg-black/5'}
                            `}
                        >
                            <div className="flex justify-between items-start">
                                <div className="font-bold flex items-center gap-2">
                                    <Server size={14} />
                                    {server.id}
                                </div>
                                <div className={`text-[10px] px-1 font-bold rounded ${server.status.phase === 'running' ? 'bg-green-200 text-green-900' : 'bg-red-200 text-red-900'}`}>
                                    {server.status.phase.toUpperCase()}
                                </div>
                            </div>
                            <div className="text-xs opacity-60 mt-1 flex gap-2">
                                <span>{t.tools}: {server.tools?.length || 0}</span>
                            </div>
                        </div>
                    ))}
                    <PixelButton theme={theme} onClick={() => setSelectedMcpServer(null)} variant="secondary" className="mt-2 text-xs">
                        <Plus size={12} /> {t.addServer}
                    </PixelButton>
                 </div>

                 <div className="w-2/3 pl-2 overflow-y-auto">
                    {selectedMcpServer ? (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b-2 border-black mb-4 pb-2">
                                <div>
                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                        <Server className="text-blue-500"/> {selectedMcpServer.id}
                                    </h3>
                                    <div className="text-xs opacity-50">{selectedMcpServer.status.message}</div>
                                </div>
                                <div className="flex gap-2">
                                    <PixelButton theme={theme} variant="secondary" onClick={() => handleRestartMcpServer(selectedMcpServer.id)}>
                                        <Play size={14} /> {t.restart}
                                    </PixelButton>
                                    <PixelButton theme={theme} variant="danger" onClick={() => handleDeleteMcpServer(selectedMcpServer.id)}>
                                        <Trash2 size={14} />
                                    </PixelButton>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-bold border-b border-black/20 mb-2 flex items-center gap-2"><Terminal size={14}/> {t.tools}</h4>
                                <div className="space-y-2">
                                    {selectedMcpServer.tools && selectedMcpServer.tools.length > 0 ? (
                                        selectedMcpServer.tools.map(tool => (
                                            <div key={tool.name} className="p-2 border border-black/20 bg-white/5">
                                                <div className="font-bold text-sm text-blue-600">{tool.name}</div>
                                                <div className="text-xs opacity-70 mb-1">{tool.description}</div>
                                                {tool.inputSchema && (
                                                    <div className="bg-black/5 p-1 text-[10px] font-mono whitespace-pre-wrap">
                                                        {JSON.stringify(tool.inputSchema, null, 2)}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-sm opacity-50 italic">No tools advertised.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="border-b-2 border-black mb-4 pb-2">
                                <h3 className="text-xl font-bold">{t.addServer}</h3>
                                <p className="text-sm opacity-60">{t.mcpDesc}</p>
                            </div>
                            
                            <PixelInput 
                                theme={theme} 
                                label="Server ID" 
                                value={newMcpServer.id} 
                                onChange={e => setNewMcpServer({...newMcpServer, id: e.target.value})} 
                                placeholder="e.g. filesystem-mcp"
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <PixelInput 
                                    theme={theme} 
                                    label={t.command} 
                                    value={newMcpServer.command} 
                                    onChange={e => setNewMcpServer({...newMcpServer, command: e.target.value})} 
                                    placeholder="e.g. npx, uvx"
                                />
                                <PixelInput 
                                    theme={theme} 
                                    label={t.args} 
                                    value={newMcpServer.args} 
                                    onChange={e => setNewMcpServer({...newMcpServer, args: e.target.value})} 
                                    placeholder="e.g. -y @modelcontextprotocol/server-filesystem"
                                />
                            </div>

                            <div>
                                <label className={`text-xs font-bold uppercase ${styles.textMuted}`}>{t.envVars}</label>
                                <textarea 
                                    className={`
                                        w-full p-2 h-32 outline-none 
                                        ${styles.borderWidth} ${styles.borderColor} ${styles.radius}
                                        ${styles.inputBg} ${styles.text} font-mono text-sm
                                    `}
                                    value={newMcpServer.env}
                                    onChange={e => setNewMcpServer({...newMcpServer, env: e.target.value})}
                                    placeholder='{"API_KEY": "..."}'
                                />
                            </div>

                            <div className="flex justify-end pt-4">
                                <PixelButton theme={theme} onClick={handleRegisterMcpServer} disabled={!newMcpServer.id || !newMcpServer.command}>
                                    <Plus size={14} /> {t.addServer}
                                </PixelButton>
                            </div>
                        </div>
                    )}
                 </div>
             </div>
        ) : (
          <div className="flex-1 overflow-y-auto flex gap-4">
            <div className="w-1/3 border-r-4 border-black pr-4 flex flex-col overflow-y-auto">
              {activeTab === 'providers' ? (
                providers.map(p => (
                  <div key={p.id} className={`border-2 border-black p-2 mb-2 flex justify-between items-center group ${editingProviderId === p.id ? 'bg-blue-100/50 border-blue-500' : 'hover:bg-black/5'}`}>
                    <div>
                      <div className="font-bold flex items-center gap-2">
                        <div className="w-5 h-5">{getProviderIcon(p.type)}</div>
                        {p.name}
                      </div>
                      <div className="text-xs opacity-70">{p.baseUrl}</div>
                    </div>
                    <div className="flex items-center">
                        <button onClick={() => handleEditProvider(p)} className="opacity-0 group-hover:opacity-100 text-blue-500 mr-2 hover:scale-110 transition-transform">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDeleteProvider(p.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:scale-110 transition-transform">
                          <Trash2 size={16} />
                        </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="space-y-4">
                   {groupedModels.chat.length > 0 && (
                      <div>
                          <div className="flex items-center gap-2 mb-2">
                               <PixelBadge theme={theme} color={getModelTypeColor('chat')}>CHAT</PixelBadge>
                               <div className="h-1 bg-black/20 flex-1"></div>
                          </div>
                          {groupedModels.chat.map(renderModelItem)}
                      </div>
                   )}
                   
                   {groupedModels.multimodal.length > 0 && (
                      <div>
                          <div className="flex items-center gap-2 mb-2 mt-4">
                               <PixelBadge theme={theme} color={getModelTypeColor('multimodal')}>VL</PixelBadge>
                               <div className="h-1 bg-black/20 flex-1"></div>
                          </div>
                          {groupedModels.multimodal.map(renderModelItem)}
                      </div>
                   )}
                   
                   {groupedModels.embedding.length > 0 && (
                      <div>
                          <div className="flex items-center gap-2 mb-2 mt-4">
                               <PixelBadge theme={theme} color={getModelTypeColor('embedding')}>EMBED</PixelBadge>
                               <div className="h-1 bg-black/20 flex-1"></div>
                          </div>
                          {groupedModels.embedding.map(renderModelItem)}
                      </div>
                   )}
  
                   {groupedModels.rerank.length > 0 && (
                      <div>
                          <div className="flex items-center gap-2 mb-2 mt-4">
                               <PixelBadge theme={theme} color={getModelTypeColor('rerank')}>RERANK</PixelBadge>
                               <div className="h-1 bg-black/20 flex-1"></div>
                          </div>
                          {groupedModels.rerank.map(renderModelItem)}
                      </div>
                   )}
  
                   {models.length === 0 && (
                       <div className="text-center opacity-50 py-10">{t.noModelsConfigured}</div>
                   )}
                </div>
              )}
            </div>
  
            <div className="w-2/3 pl-2 overflow-y-auto">
               {activeTab === 'providers' ? (
                 <div className="space-y-4">
                   <div className="flex justify-between items-center border-b-2 border-black mb-2">
                       <h3 className="text-xl font-bold">
                           {editingProviderId ? t.editProvider : t.addProvider}
                       </h3>
                       {editingProviderId && (
                           <button onClick={handleCancelProvider} className="text-xs text-red-500 font-bold hover:underline">{t.cancel}</button>
                       )}
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <PixelInput theme={theme} label={t.name} placeholder="e.g. Local DeepSeek" value={newProvider.name || ''} onChange={e => setNewProvider({...newProvider, name: e.target.value})} />
                      <PixelSelect 
                        theme={theme} 
                        label={t.type} 
                        value={newProvider.type} 
                        onChange={e => {
                            const newType = e.target.value;
                            const adapter = providerAdapters.find(a => a.provider === newType);
                            setNewProvider({
                                ...newProvider, 
                                type: newType,
                                baseUrl: adapter?.defaultBaseURL || newProvider.baseUrl || ''
                            });
                        }} 
                        disabled={!!editingProviderId}
                      >
                          {providerAdapters.length > 0 ? (
                              providerAdapters.map(adapter => (
                                  <option key={adapter.provider} value={adapter.provider}>{adapter.name}</option>
                              ))
                          ) : (
                              <option value="custom">Custom</option>
                          )}
                      </PixelSelect>
                   </div>
                   <PixelInput theme={theme} label={t.apiBaseUrl} placeholder="https://..." value={newProvider.baseUrl || ''} onChange={e => setNewProvider({...newProvider, baseUrl: e.target.value})} />
                   <PixelInput theme={theme} label={t.apiKey} type="password" placeholder={editingProviderId ? "(Leave empty to keep existing)" : "sk-..."} value={newProvider.apiKey || ''} onChange={e => setNewProvider({...newProvider, apiKey: e.target.value})} />
                   
                   <div className="flex flex-col gap-2 mt-4">
                        <div className="flex gap-2">
                            <PixelButton theme={theme} onClick={handleSaveProvider} disabled={!newProvider.name || !newProvider.baseUrl}>
                                {editingProviderId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {editingProviderId ? t.updateProvider : t.saveProvider}
                            </PixelButton>
                            
                            <PixelButton theme={theme} variant="secondary" onClick={handleTestConnection} disabled={isTestingConnection || !newProvider.type}>
                                {isTestingConnection ? <Activity className="w-4 h-4 animate-spin"/> : <Wifi className="w-4 h-4" />} {t.testConnection}
                            </PixelButton>
                        </div>
                        
                        {connectionResult && (
                            <div className={`
                                p-2 text-xs font-bold border-2 border-black flex flex-col gap-1
                                ${connectionResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                            `}>
                                <div className="flex justify-between">
                                    <span>{connectionResult.success ? t.connectionSuccess : t.connectionFailed}: {connectionResult.message}</span>
                                    {connectionResult.latency && (
                                        <span className="bg-black/10 px-2 py-0.5 rounded">{t.latency}: {connectionResult.latency}ms</span>
                                    )}
                                </div>
                                {connectionResult.hint && (
                                    <div className="text-[10px] opacity-80 border-t border-black/20 pt-1">
                                        Hint: {connectionResult.hint}
                                    </div>
                                )}
                            </div>
                        )}
                   </div>
                 </div>
               ) : (
                 <div className="space-y-4">
                   <div className="flex justify-between items-center border-b-2 border-black mb-2">
                        <h3 className="text-xl font-bold">
                           {editingModelId ? t.editModel : t.addModel} <span className="text-sm font-normal opacity-50 ml-2">({newModel.type?.toUpperCase()})</span>
                        </h3>
                        {editingModelId && (
                           <button onClick={handleCancelModel} className="text-xs text-red-500 font-bold hover:underline">{t.cancel}</button>
                       )}
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                      <PixelSelect theme={theme} label={t.providers} value={newModel.providerId || ''} onChange={e => setNewModel({...newModel, providerId: e.target.value})}>
                          <option value="">{t.selectProvider}</option>
                          {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </PixelSelect>
                      <PixelSelect theme={theme} label={t.type} value={newModel.type || 'chat'} onChange={e => setNewModel({...newModel, type: e.target.value as ModelType})} disabled={!!editingModelId}>
                          <option value="chat">Chat Completion</option>
                          <option value="multimodal">Multimodal (VL)</option>
                          <option value="embedding">Embedding</option>
                          <option value="rerank">Rerank</option>
                      </PixelSelect>
                   </div>
  
                   <div className="grid grid-cols-2 gap-4">
                      <PixelInput theme={theme} label={t.displayName} placeholder="e.g. GPT-4 Turbo" value={newModel.name || ''} onChange={e => setNewModel({...newModel, name: e.target.value})} />
                      <PixelInput theme={theme} label={t.modelId} placeholder="e.g. gpt-4-1106-preview" value={newModel.modelId || ''} onChange={e => setNewModel({...newModel, modelId: e.target.value})} />
                   </div>
  
                   {(newModel.type === 'chat' || newModel.type === 'multimodal') && (
                      <div className="grid grid-cols-3 gap-4">
                          <PixelInput theme={theme} label={t.context} type="number" value={newModel.contextLength || ''} onChange={e => setNewModel({...newModel, contextLength: parseInt(e.target.value)})} />
                          <PixelInput theme={theme} label={t.maxOutput} type="number" value={newModel.maxTokens || ''} onChange={e => setNewModel({...newModel, maxTokens: parseInt(e.target.value)})} />
                          <PixelInput theme={theme} label={t.temp} type="number" step="0.1" value={newModel.temperature} onChange={e => setNewModel({...newModel, temperature: parseFloat(e.target.value)})} />
                      </div>
                   )}
  
                   {newModel.type === 'embedding' && (
                       <div className="grid grid-cols-2 gap-4">
                           <PixelInput theme={theme} label={t.dimensions} type="number" value={newModel.dimensions || ''} onChange={e => setNewModel({...newModel, dimensions: parseInt(e.target.value)})} placeholder="1536" />
                       </div>
                   )}
                   
                   <div className="flex items-center gap-2 mt-4">
                      <input 
                         type="checkbox" 
                         id="isDefault" 
                         className="w-5 h-5 accent-pink-500 border-2 border-black cursor-pointer mt-0"
                         checked={newModel.isDefault || false}
                         onChange={e => setNewModel({...newModel, isDefault: e.target.checked})}
                      />
                      <label htmlFor="isDefault" className="text-sm font-bold uppercase cursor-pointer select-none pt-0.5">
                          {t.setAsDefault}
                      </label>
                   </div>

                   <div className="flex gap-2 mt-4">
                     <PixelButton theme={theme} onClick={handleTestModel} disabled={!newModel.providerId || !newModel.modelId || isTestingModel}>
                       {isTestingModel ? <Loader2 className="w-4 h-4 animate-spin"/> : null} {isTestingModel ? t.testing : t.testModel}
                     </PixelButton>
                     <PixelButton theme={theme} onClick={handleSaveModel} disabled={!newModel.providerId || !newModel.name}>
                       {editingModelId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {editingModelId ? t.editModel : t.addModel}
                     </PixelButton>
                   </div>
                   
                   {modelTestResult && (
                        <div className={`
                            mt-2 p-2 text-xs font-bold border-2 border-black
                            ${modelTestResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                        `}>
                             <div className="flex justify-between items-center">
                                 <span>{modelTestResult.message}</span>
                                 {modelTestResult.latency > 0 && <span>{modelTestResult.latency}ms</span>}
                             </div>
                        </div>
                   )}
                 </div>
               )}
            </div>
          </div>
        )}
      </PixelCard>
    </div>
  );
};
