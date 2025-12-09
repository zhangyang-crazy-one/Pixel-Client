
import React, { useState, useEffect } from 'react';
import { Theme, LLMProvider, LLMModel, ModelType, AceConfig, Language, ProviderAdapter } from '../types';
import { PixelButton, PixelInput, PixelCard, PixelSelect, PixelBadge } from './PixelUI';
import { THEME_STYLES, TRANSLATIONS } from '../constants';
import { Trash2, Plus, Zap, X, Cpu, Save, AlertTriangle, Edit, Smile, Star, Activity, Wifi, Loader2 } from 'lucide-react';
import { ApiClient } from '../services/apiClient';

interface ModelManagerProps {
  theme: Theme;
  language: Language;
  providers: LLMProvider[];
  models: LLMModel[];
  aceConfig: AceConfig;
  onUpdateProviders: (providers: LLMProvider[]) => void;
  onUpdateModels: (models: LLMModel[]) => void;
  onUpdateAceConfig: (config: AceConfig) => void;
  onClose: () => void;
}

export const ModelManager: React.FC<ModelManagerProps> = ({
  theme,
  language,
  providers,
  models,
  aceConfig,
  onUpdateProviders,
  onUpdateModels,
  onUpdateAceConfig,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'providers' | 'models' | 'ace' | 'mascot'>('providers');
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
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
  // Local State for ACE Config
  const [localAceConfig, setLocalAceConfig] = useState<AceConfig>(aceConfig);

  // Mascot Config State
  const [mascotSystemPrompt, setMascotSystemPrompt] = useState('');

  // Fetch Data on Open
  useEffect(() => {
      const loadData = async () => {
          const fetchedProviders = await ApiClient.getProviders();
          onUpdateProviders(fetchedProviders);
          
          const fetchedModels = await ApiClient.getAllModels();
          onUpdateModels(fetchedModels);

          const adapters = await ApiClient.getProviderAdapters();
          setProviderAdapters(adapters);

          // Load Mascot Config
          const storedMascotPrompt = localStorage.getItem('pixel_mascot_system_prompt');
          if (storedMascotPrompt) setMascotSystemPrompt(storedMascotPrompt);
      };
      loadData();
  }, []);

  const chatModels = models.filter(m => m.type === 'chat' || (m.type as any) === 'nlp' || !m.type);

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
            const updated = await ApiClient.updateProvider(editingProviderId, newProvider);
            onUpdateProviders(providers.map(p => p.id === editingProviderId ? updated : p));
            setEditingProviderId(null);
        } else {
            const created = await ApiClient.createProvider(newProvider);
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
          const result = await ApiClient.testProviderConfiguration(payload);
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
    
    // Prepare payload basics
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
            const updated = await ApiClient.updateModel({ ...modelPayload, id: editingModelId });
            onUpdateModels(models.map(m => m.id === editingModelId ? updated : m));
            setEditingModelId(null);
        } else {
            const created = await ApiClient.createModel(modelPayload);
            onUpdateModels([...models, created]);
        }
        
        // Reset form
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
        await ApiClient.deleteProvider(id);
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
          await ApiClient.deleteModel(model.providerId, model.id);
          onUpdateModels(models.filter(x => x.id !== model.id));
          if (editingModelId === model.id) handleCancelModel();
      } catch (e) {
          alert(t.saveFailed);
      }
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
            apiKey: provider.apiKey || '', // Note: This might be empty if masked
            baseURL: provider.baseUrl
        },
        model: newModel.modelId
    };

    try {
        const result = await ApiClient.validateModel(payload);
        setModelTestResult(result);
    } catch(e) {
        setModelTestResult({ success: false, message: 'Client Error', latency: 0 });
    } finally {
        setIsTestingModel(false);
    }
  };

  const handleSaveAceConfig = () => {
      const isConfigured = aceConfig.fastModelId || aceConfig.reflectorModelId || aceConfig.curatorModelId;
      if (isConfigured) {
          setShowConfirmDialog(true);
      } else {
          confirmSaveAceConfig();
      }
  };

  const confirmSaveAceConfig = () => {
      onUpdateAceConfig(localAceConfig);
      setShowConfirmDialog(false);
      setTestStatus('ace_saved');
      setTimeout(() => setTestStatus(null), 2000);
  };

  const handleSaveMascotConfig = () => {
      localStorage.setItem('pixel_mascot_system_prompt', mascotSystemPrompt);
      setTestStatus('mascot_saved');
      setTimeout(() => setTestStatus(null), 2000);
  };

  const getModelTypeColor = (type?: ModelType) => {
      switch(type) {
          case 'chat': case 'nlp' as any: return 'bg-blue-400 text-black';
          case 'embedding': return 'bg-purple-400 text-black';
          case 'rerank': return 'bg-orange-400 text-black';
          default: return 'bg-gray-400 text-black';
      }
  };

  // Group models by type for display
  const groupedModels = {
      chat: models.filter(m => m.type === 'chat' || m.type === 'nlp' as any || !m.type),
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
              {m.name}
              {m.isDefault && (
                  <PixelBadge theme={theme} color="bg-yellow-400 text-black border-yellow-600">
                      {t.default}
                  </PixelBadge>
              )}
          </div>
          <div className="text-xs opacity-70">{parent?.name} / {m.modelId}</div>
          <div className="text-[10px] opacity-50 mt-1 font-mono">
             {(m.type === 'chat' || (m.type as any) === 'nlp') && m.contextLength && `CTX: ${m.contextLength}`}
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
      {/* CONFIRMATION DIALOG OVERLAY */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <PixelCard theme={theme} className={`w-[90%] max-w-[400px] ${styles.bg} ${styles.text} flex flex-col gap-4 border-4 border-red-500 animate-float`}>
                <div className="flex items-center gap-2 text-red-500 font-bold text-xl border-b-2 border-black pb-2">
                    <AlertTriangle /> {t.warning}
                </div>
                <div className="py-2">
                    <p className="font-bold text-lg leading-tight mb-2">
                        {t.confirmModify}
                    </p>
                    <p className="text-sm opacity-80">
                        {t.confirmModifyDesc}
                    </p>
                </div>
                <div className="flex justify-end gap-4 mt-2">
                    <PixelButton theme={theme} variant="secondary" onClick={() => setShowConfirmDialog(false)}>
                        {t.cancel}
                    </PixelButton>
                    <PixelButton theme={theme} variant="danger" onClick={confirmSaveAceConfig}>
                        {t.confirm}
                    </PixelButton>
                </div>
            </PixelCard>
        </div>
      )}

      <PixelCard theme={theme} className={`w-full max-w-4xl h-[80vh] flex flex-col ${styles.bg} ${styles.text} overflow-hidden`}>
        <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-2">
          <h2 className={`text-2xl font-bold flex items-center gap-2`}>
            <Zap className="w-6 h-6" /> {t.llmConfig}
          </h2>
          <PixelButton theme={theme} onClick={onClose} variant="secondary">
            <X className="w-4 h-4" /> {t.close}
          </PixelButton>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
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
            onClick={() => setActiveTab('ace')} 
            variant={activeTab === 'ace' ? 'primary' : 'secondary'}
          >
            {t.aceAgent}
          </PixelButton>
           <PixelButton 
            theme={theme} 
            onClick={() => setActiveTab('mascot')} 
            variant={activeTab === 'mascot' ? 'primary' : 'secondary'}
          >
            {t.mascotConfig}
          </PixelButton>
        </div>

        {/* Content Area */}
        {activeTab === 'ace' ? (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center">
             <div className="max-w-2xl w-full space-y-8">
                <div className="border-b-2 border-black pb-2 mb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <Cpu size={24} /> {t.aceConfigTitle}
                    </h3>
                    <p className="opacity-70 text-sm mt-1">{t.aceConfigDesc}</p>
                </div>

                <div className="space-y-6">
                    <div className="bg-white/5 p-4 border-2 border-black">
                        <PixelSelect 
                            theme={theme} 
                            label={t.fastModel} 
                            value={localAceConfig.fastModelId} 
                            onChange={(e) => setLocalAceConfig({...localAceConfig, fastModelId: e.target.value})}
                        >
                            <option value="">{t.selectModel}</option>
                            {chatModels.map(m => <option key={m.id} value={m.id}>{m.name} ({m.modelId})</option>)}
                        </PixelSelect>
                        <div className="text-xs opacity-50 mt-1">{t.fastModelDesc}</div>
                    </div>

                    <div className="bg-white/5 p-4 border-2 border-black">
                        <PixelSelect 
                            theme={theme} 
                            label={t.reflectorModel} 
                            value={localAceConfig.reflectorModelId} 
                            onChange={(e) => setLocalAceConfig({...localAceConfig, reflectorModelId: e.target.value})}
                        >
                            <option value="">{t.selectModel}</option>
                            {chatModels.map(m => <option key={m.id} value={m.id}>{m.name} ({m.modelId})</option>)}
                        </PixelSelect>
                        <div className="text-xs opacity-50 mt-1">{t.reflectorModelDesc}</div>
                    </div>

                    <div className="bg-white/5 p-4 border-2 border-black">
                        <PixelSelect 
                            theme={theme} 
                            label={t.curatorModel} 
                            value={localAceConfig.curatorModelId} 
                            onChange={(e) => setLocalAceConfig({...localAceConfig, curatorModelId: e.target.value})}
                        >
                            <option value="">{t.selectModel}</option>
                            {chatModels.map(m => <option key={m.id} value={m.id}>{m.name} ({m.modelId})</option>)}
                        </PixelSelect>
                        <div className="text-xs opacity-50 mt-1">{t.curatorModelDesc}</div>
                    </div>
                </div>
                
                <div className="mt-8 p-4 border-2 border-dashed border-black/30 text-center opacity-50">
                    {t.aceNote}
                </div>

                <div className="flex justify-end gap-4 items-center border-t-4 border-black pt-4">
                    {testStatus === 'ace_saved' && <span className="text-green-500 font-bold animate-pulse">{t.configSaved}</span>}
                    <PixelButton theme={theme} onClick={handleSaveAceConfig}>
                         <Save className="w-4 h-4" /> {t.saveConfig}
                    </PixelButton>
                </div>
             </div>
          </div>
        ) : activeTab === 'mascot' ? (
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
        ) : (
          <div className="flex-1 overflow-y-auto flex gap-4">
            {/* List Column */}
            <div className="w-1/3 border-r-4 border-black pr-4 flex flex-col overflow-y-auto">
              {activeTab === 'providers' ? (
                providers.map(p => (
                  <div key={p.id} className={`border-2 border-black p-2 mb-2 flex justify-between items-center group ${editingProviderId === p.id ? 'bg-blue-100/50 border-blue-500' : 'hover:bg-black/5'}`}>
                    <div>
                      <div className="font-bold">{p.icon} {p.name}</div>
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
  
            {/* Form Column */}
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
                              // Fallback if API hasn't loaded
                              <option value="custom">Custom</option>
                          )}
                      </PixelSelect>
                   </div>
                   <PixelInput theme={theme} label={t.apiBaseUrl} placeholder="https://..." value={newProvider.baseUrl || ''} onChange={e => setNewProvider({...newProvider, baseUrl: e.target.value})} />
                   <PixelInput theme={theme} label={t.apiKey} type="password" placeholder={editingProviderId ? "(Leave empty to keep existing)" : "sk-..."} value={newProvider.apiKey || ''} onChange={e => setNewProvider({...newProvider, apiKey: e.target.value})} />
                   
                   {/* Connection Test & Save */}
                   <div className="flex flex-col gap-2 mt-4">
                        <div className="flex gap-2">
                            <PixelButton theme={theme} onClick={handleSaveProvider} disabled={!newProvider.name || !newProvider.baseUrl}>
                                {editingProviderId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {editingProviderId ? t.updateProvider : t.saveProvider}
                            </PixelButton>
                            
                            <PixelButton theme={theme} variant="secondary" onClick={handleTestConnection} disabled={isTestingConnection || !newProvider.type}>
                                {isTestingConnection ? <Activity className="w-4 h-4 animate-spin"/> : <Wifi className="w-4 h-4" />} {t.testConnection}
                            </PixelButton>
                        </div>
                        
                        {/* Test Result Display */}
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
                          <option value="embedding">Embedding</option>
                          <option value="rerank">Rerank</option>
                      </PixelSelect>
                   </div>
  
                   <div className="grid grid-cols-2 gap-4">
                      <PixelInput theme={theme} label={t.displayName} placeholder="e.g. GPT-4 Turbo" value={newModel.name || ''} onChange={e => setNewModel({...newModel, name: e.target.value})} />
                      <PixelInput theme={theme} label={t.modelId} placeholder="e.g. gpt-4-1106-preview" value={newModel.modelId || ''} onChange={e => setNewModel({...newModel, modelId: e.target.value})} />
                   </div>
  
                   {newModel.type === 'chat' && (
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
