
import React, { useState, useEffect } from 'react';
import { Theme, LLMProvider, LLMModel, ModelType, AceConfig, Language } from '../types';
import { PixelButton, PixelInput, PixelCard, PixelSelect, PixelBadge } from './PixelUI';
import { THEME_STYLES, TRANSLATIONS } from '../constants';
import { Trash2, Plus, Zap, X, Cpu, Save, AlertTriangle } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'providers' | 'models' | 'ace'>('providers');
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState(0);
  const [showRocket, setShowRocket] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const styles = THEME_STYLES[theme];
  const t = TRANSLATIONS[language];

  // Form State for New Provider
  const [newProvider, setNewProvider] = useState<Partial<LLMProvider>>({ type: 'custom' });
  // Form State for New Model
  const [newModel, setNewModel] = useState<Partial<LLMModel>>({ 
    type: 'chat',
    contextLength: 4096, 
    temperature: 0.7,
    maxTokens: 2048,
    dimensions: 1536
  });
  // Local State for ACE Config
  const [localAceConfig, setLocalAceConfig] = useState<AceConfig>(aceConfig);

  // Fetch Data on Open
  useEffect(() => {
      const loadData = async () => {
          const fetchedProviders = await ApiClient.getProviders();
          onUpdateProviders(fetchedProviders);
          
          const fetchedModels = await ApiClient.getAllModels();
          onUpdateModels(fetchedModels);
      };
      loadData();
  }, []);

  const chatModels = models.filter(m => m.type === 'chat' || (m.type as any) === 'nlp' || !m.type);

  const handleAddProvider = async () => {
    if (!newProvider.name || !newProvider.baseUrl) return;
    try {
        const created = await ApiClient.createProvider(newProvider);
        onUpdateProviders([...providers, created]);
        setNewProvider({ type: 'custom', name: '', baseUrl: '', apiKey: '' });
    } catch (e) {
        alert("Failed to create provider. Ensure backend is running.");
    }
  };

  const handleAddModel = async () => {
    if (!newModel.name || !newModel.modelId || !newModel.providerId) return;
    const type = newModel.type as ModelType || 'chat';
    
    const modelPayload: Partial<LLMModel> = {
      providerId: newModel.providerId,
      name: newModel.name,
      modelId: newModel.modelId,
      type: type === 'chat' ? 'nlp' as any : type, // API uses 'nlp', UI uses 'chat'
      contextLength: newModel.contextLength,
      maxTokens: newModel.maxTokens,
      temperature: newModel.temperature,
      dimensions: newModel.dimensions
    };

    try {
        const created = await ApiClient.createModel(modelPayload);
        // Normalize type back to UI standard if needed, though map handles it
        onUpdateModels([...models, created]);
        
        setNewModel({ 
            ...newModel, 
            name: '', 
            modelId: '' 
        });
    } catch (e) {
        alert("Failed to create model.");
    }
  };

  const handleDeleteProvider = async (id: string) => {
    if (!confirm("Delete this provider?")) return;
    try {
        await ApiClient.deleteProvider(id);
        onUpdateProviders(providers.filter(p => p.id !== id));
        onUpdateModels(models.filter(m => m.providerId !== id));
    } catch (e) {
        alert("Error deleting provider");
    }
  };

  const handleDeleteModel = async (model: LLMModel) => {
      if (!confirm("Delete this model?")) return;
      try {
          await ApiClient.deleteModel(model.providerId, model.id);
          onUpdateModels(models.filter(x => x.id !== model.id));
      } catch (e) {
          alert("Error deleting model");
      }
  };

  const runTest = () => {
    setTestStatus('loading');
    setTimeout(() => {
      setTestStatus('success');
      
      setSuccessCount(prev => {
          const newCount = prev + 1;
          if (newCount === 10) {
              setShowRocket(true);
              setTimeout(() => setShowRocket(false), 5000);
          }
          return newCount;
      });

      setTimeout(() => setTestStatus(null), 2000);
    }, 1500);
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

  const getModelTypeColor = (type?: ModelType) => {
      // Map API types to colors
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
    return (
      <div key={m.id} className="border-2 border-black p-2 mb-2 hover:bg-black/5 flex justify-between items-center group bg-white/50">
        <div>
          <div className="font-bold flex items-center gap-2">
              {m.name}
          </div>
          <div className="text-xs opacity-70">{parent?.name} / {m.modelId}</div>
          <div className="text-[10px] opacity-50 mt-1 font-mono">
             {(m.type === 'chat' || (m.type as any) === 'nlp') && m.contextLength && `CTX: ${m.contextLength}`}
             {m.type === 'embedding' && m.dimensions && `DIM: ${m.dimensions}`}
          </div>
        </div>
        <button onClick={() => handleDeleteModel(m)} className="opacity-0 group-hover:opacity-100 text-red-500">
          <Trash2 size={16} />
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      {/* ROCKET OVERLAY */}
      {showRocket && (
          <div className="fixed inset-0 z-[60] pointer-events-none flex justify-center items-end">
              <div className="animate-rocket relative w-24 h-32">
                   <svg width="100" height="140" viewBox="0 0 10 14" xmlns="http://www.w3.org/2000/svg">
                       <rect x="3" y="2" width="4" height="8" fill="white" />
                       <rect x="4" y="1" width="2" height="1" fill="red" />
                       <rect x="2" y="8" width="1" height="2" fill="red" />
                       <rect x="7" y="8" width="1" height="2" fill="red" />
                       <rect x="4" y="4" width="2" height="2" fill="#4fc3f7" />
                       <rect x="3" y="11" width="4" height="3" fill="orange" className="animate-pulse" />
                   </svg>
                   <div className="text-center text-white font-bold mt-2 bg-black px-2">LAUNCH!</div>
              </div>
          </div>
      )}

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
        ) : (
          <div className="flex-1 overflow-y-auto flex gap-4">
            {/* List Column */}
            <div className="w-1/3 border-r-4 border-black pr-4 flex flex-col overflow-y-auto">
              {activeTab === 'providers' ? (
                providers.map(p => (
                  <div key={p.id} className="border-2 border-black p-2 mb-2 hover:bg-black/5 flex justify-between items-center group">
                    <div>
                      <div className="font-bold">{p.icon} {p.name}</div>
                      <div className="text-xs opacity-70">{p.baseUrl}</div>
                    </div>
                    <button onClick={() => handleDeleteProvider(p.id)} className="opacity-0 group-hover:opacity-100 text-red-500">
                      <Trash2 size={16} />
                    </button>
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
                   <h3 className="text-xl font-bold border-b-2 border-black mb-2">{t.addProvider}</h3>
                   <div className="grid grid-cols-2 gap-4">
                      <PixelInput theme={theme} label={t.name} placeholder="e.g. Local DeepSeek" value={newProvider.name || ''} onChange={e => setNewProvider({...newProvider, name: e.target.value})} />
                      <PixelSelect theme={theme} label={t.type} value={newProvider.type} onChange={e => setNewProvider({...newProvider, type: e.target.value as any})}>
                          <option value="openai">OpenAI Compatible</option>
                          <option value="anthropic">Anthropic</option>
                          <option value="deepseek">DeepSeek</option>
                          <option value="custom">Custom</option>
                      </PixelSelect>
                   </div>
                   <PixelInput theme={theme} label={t.apiBaseUrl} placeholder="https://..." value={newProvider.baseUrl || ''} onChange={e => setNewProvider({...newProvider, baseUrl: e.target.value})} />
                   <PixelInput theme={theme} label={t.apiKey} type="password" placeholder="sk-..." value={newProvider.apiKey || ''} onChange={e => setNewProvider({...newProvider, apiKey: e.target.value})} />
                   
                   <div className="flex gap-2 mt-4">
                     <PixelButton theme={theme} onClick={handleAddProvider} disabled={!newProvider.name || !newProvider.baseUrl}>
                       <Plus className="w-4 h-4" /> {t.saveProvider}
                     </PixelButton>
                   </div>
                 </div>
               ) : (
                 <div className="space-y-4">
                   <h3 className="text-xl font-bold border-b-2 border-black mb-2">
                       {t.addModel} <span className="text-sm font-normal opacity-50 ml-2">({newModel.type?.toUpperCase()})</span>
                   </h3>
                   
                   <div className="grid grid-cols-2 gap-4">
                      <PixelSelect theme={theme} label={t.providers} value={newModel.providerId || ''} onChange={e => setNewModel({...newModel, providerId: e.target.value})}>
                          <option value="">{t.selectProvider}</option>
                          {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </PixelSelect>
                      <PixelSelect theme={theme} label={t.type} value={newModel.type || 'chat'} onChange={e => setNewModel({...newModel, type: e.target.value as ModelType})}>
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
  
                   {/* Rerank models have no additional configuration inputs */}
                   
                   <div className="flex gap-2 mt-4">
                     <PixelButton theme={theme} onClick={runTest} disabled={!newModel.providerId || !newModel.modelId}>
                       {testStatus === 'loading' ? t.testing : testStatus === 'success' ? t.success : t.testModel}
                     </PixelButton>
                     <PixelButton theme={theme} onClick={handleAddModel} disabled={!newModel.providerId || !newModel.name}>
                       <Plus className="w-4 h-4" /> {t.addModel}
                     </PixelButton>
                   </div>
                   {testStatus === 'success' && <div className="text-green-600 font-bold animate-bounce">{t.modelVerified} ★</div>}
                   {successCount > 0 && successCount < 10 && <div className="text-xs opacity-50 mt-1">{t.consecutiveTests}: {successCount}/10</div>}
                 </div>
               )}
            </div>
          </div>
        )}
      </PixelCard>
    </div>
  );
};
