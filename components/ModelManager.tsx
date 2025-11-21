
import React, { useState } from 'react';
import { Theme, LLMProvider, LLMModel, ModelType } from '../types';
import { PixelButton, PixelInput, PixelCard, PixelSelect, PixelBadge } from './PixelUI';
import { THEME_STYLES } from '../constants';
import { Trash2, Plus, Zap, X } from 'lucide-react';

interface ModelManagerProps {
  theme: Theme;
  providers: LLMProvider[];
  models: LLMModel[];
  onUpdateProviders: (providers: LLMProvider[]) => void;
  onUpdateModels: (models: LLMModel[]) => void;
  onClose: () => void;
}

export const ModelManager: React.FC<ModelManagerProps> = ({
  theme,
  providers,
  models,
  onUpdateProviders,
  onUpdateModels,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'providers' | 'models'>('providers');
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState(0);
  const [showRocket, setShowRocket] = useState(false);
  const styles = THEME_STYLES[theme];

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

  const handleAddProvider = () => {
    if (!newProvider.name || !newProvider.baseUrl) return;
    const provider: LLMProvider = {
      id: `prov_${Date.now()}`,
      name: newProvider.name,
      type: newProvider.type as any,
      baseUrl: newProvider.baseUrl,
      apiKey: newProvider.apiKey || '',
      icon: '🔧'
    };
    onUpdateProviders([...providers, provider]);
    setNewProvider({ type: 'custom', name: '', baseUrl: '', apiKey: '' });
  };

  const handleAddModel = () => {
    if (!newModel.name || !newModel.modelId || !newModel.providerId) return;
    const type = newModel.type as ModelType || 'chat';
    
    const model: LLMModel = {
      id: `mod_${Date.now()}`,
      providerId: newModel.providerId,
      name: newModel.name,
      modelId: newModel.modelId,
      type: type,
    };

    // Only add specific fields based on type
    if (type === 'chat') {
        model.contextLength = Number(newModel.contextLength) || 4096;
        model.maxTokens = Number(newModel.maxTokens) || 2048;
        model.temperature = Number(newModel.temperature);
    }

    if (type === 'embedding') {
        model.dimensions = Number(newModel.dimensions) || 1536;
    }

    // Rerank models currently have no extra config fields based on requirements

    onUpdateModels([...models, model]);
    
    // Reset fields (keeping providerId for convenience)
    setNewModel({ 
        ...newModel, 
        name: '', 
        modelId: '' 
    });
  };

  const handleDeleteProvider = (id: string) => {
    onUpdateProviders(providers.filter(p => p.id !== id));
    onUpdateModels(models.filter(m => m.providerId !== id));
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

  const getModelTypeColor = (type?: ModelType) => {
      switch(type) {
          case 'chat': return 'bg-blue-400 text-black';
          case 'embedding': return 'bg-purple-400 text-black';
          case 'rerank': return 'bg-orange-400 text-black';
          default: return 'bg-gray-400 text-black';
      }
  };

  // Group models by type for display
  const groupedModels = {
      chat: models.filter(m => m.type === 'chat' || !m.type),
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
             {m.type === 'chat' && m.contextLength && `CTX: ${m.contextLength}`}
             {m.type === 'chat' && m.temperature !== undefined && ` | T: ${m.temperature}`}
             {m.type === 'embedding' && m.dimensions && `DIM: ${m.dimensions}`}
          </div>
        </div>
        <button onClick={() => onUpdateModels(models.filter(x => x.id !== m.id))} className="opacity-0 group-hover:opacity-100 text-red-500">
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

      <PixelCard theme={theme} className={`w-full max-w-4xl h-[80vh] flex flex-col ${styles.bg} ${styles.text} overflow-hidden`}>
        <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-2">
          <h2 className={`text-2xl font-bold flex items-center gap-2`}>
            <Zap className="w-6 h-6" /> LLM CONFIGURATION
          </h2>
          <PixelButton theme={theme} onClick={onClose} variant="secondary">
            <X className="w-4 h-4" /> CLOSE
          </PixelButton>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <PixelButton 
            theme={theme} 
            onClick={() => setActiveTab('providers')} 
            variant={activeTab === 'providers' ? 'primary' : 'secondary'}
          >
            PROVIDERS
          </PixelButton>
          <PixelButton 
            theme={theme} 
            onClick={() => setActiveTab('models')} 
            variant={activeTab === 'models' ? 'primary' : 'secondary'}
          >
            MODELS
          </PixelButton>
        </div>

        {/* Content Area */}
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
                     <div className="text-center opacity-50 py-10">No models configured.</div>
                 )}
              </div>
            )}
          </div>

          {/* Form Column */}
          <div className="w-2/3 pl-2 overflow-y-auto">
             {activeTab === 'providers' ? (
               <div className="space-y-4">
                 <h3 className="text-xl font-bold border-b-2 border-black mb-2">ADD PROVIDER</h3>
                 <div className="grid grid-cols-2 gap-4">
                    <PixelInput theme={theme} label="Name" placeholder="e.g. Local DeepSeek" value={newProvider.name || ''} onChange={e => setNewProvider({...newProvider, name: e.target.value})} />
                    <PixelSelect theme={theme} label="Type" value={newProvider.type} onChange={e => setNewProvider({...newProvider, type: e.target.value as any})}>
                        <option value="openai">OpenAI Compatible</option>
                        <option value="anthropic">Anthropic</option>
                        <option value="deepseek">DeepSeek</option>
                        <option value="custom">Custom</option>
                    </PixelSelect>
                 </div>
                 <PixelInput theme={theme} label="API Base URL" placeholder="https://..." value={newProvider.baseUrl || ''} onChange={e => setNewProvider({...newProvider, baseUrl: e.target.value})} />
                 <PixelInput theme={theme} label="API Key" type="password" placeholder="sk-..." value={newProvider.apiKey || ''} onChange={e => setNewProvider({...newProvider, apiKey: e.target.value})} />
                 
                 <div className="flex gap-2 mt-4">
                   <PixelButton theme={theme} onClick={runTest}>
                     {testStatus === 'loading' ? 'TESTING...' : testStatus === 'success' ? 'SUCCESS!' : 'TEST CONNECT'}
                   </PixelButton>
                   <PixelButton theme={theme} onClick={handleAddProvider} disabled={!newProvider.name || !newProvider.baseUrl}>
                     <Plus className="w-4 h-4" /> SAVE PROVIDER
                   </PixelButton>
                 </div>
                 {testStatus === 'success' && <div className="text-green-600 font-bold animate-bounce">Connection Verified! ★</div>}
                 {successCount > 0 && successCount < 10 && <div className="text-xs opacity-50 mt-1">Consecutive Tests: {successCount}/10</div>}
               </div>
             ) : (
               <div className="space-y-4">
                 <h3 className="text-xl font-bold border-b-2 border-black mb-2">
                     ADD MODEL <span className="text-sm font-normal opacity-50 ml-2">({newModel.type?.toUpperCase()})</span>
                 </h3>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <PixelSelect theme={theme} label="Provider" value={newModel.providerId || ''} onChange={e => setNewModel({...newModel, providerId: e.target.value})}>
                        <option value="">Select Provider...</option>
                        {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </PixelSelect>
                    <PixelSelect theme={theme} label="Model Type" value={newModel.type || 'chat'} onChange={e => setNewModel({...newModel, type: e.target.value as ModelType})}>
                        <option value="chat">Chat Completion</option>
                        <option value="embedding">Embedding</option>
                        <option value="rerank">Rerank</option>
                    </PixelSelect>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <PixelInput theme={theme} label="Display Name" placeholder="e.g. GPT-4 Turbo" value={newModel.name || ''} onChange={e => setNewModel({...newModel, name: e.target.value})} />
                    <PixelInput theme={theme} label="Model ID (API)" placeholder="e.g. gpt-4-1106-preview" value={newModel.modelId || ''} onChange={e => setNewModel({...newModel, modelId: e.target.value})} />
                 </div>

                 {newModel.type === 'chat' && (
                    <div className="grid grid-cols-3 gap-4">
                        <PixelInput theme={theme} label="Context (Tokens)" type="number" value={newModel.contextLength || ''} onChange={e => setNewModel({...newModel, contextLength: parseInt(e.target.value)})} />
                        <PixelInput theme={theme} label="Max Output" type="number" value={newModel.maxTokens || ''} onChange={e => setNewModel({...newModel, maxTokens: parseInt(e.target.value)})} />
                        <PixelInput theme={theme} label="Temp (0-1)" type="number" step="0.1" value={newModel.temperature} onChange={e => setNewModel({...newModel, temperature: parseFloat(e.target.value)})} />
                    </div>
                 )}

                 {newModel.type === 'embedding' && (
                     <div className="grid grid-cols-2 gap-4">
                         <PixelInput theme={theme} label="Dimensions" type="number" value={newModel.dimensions || ''} onChange={e => setNewModel({...newModel, dimensions: parseInt(e.target.value)})} placeholder="1536" />
                     </div>
                 )}

                 {/* Rerank models have no additional configuration inputs */}
                 
                 <div className="flex gap-2 mt-4">
                   <PixelButton theme={theme} onClick={handleAddModel} disabled={!newModel.providerId || !newModel.name}>
                     <Plus className="w-4 h-4" /> ADD MODEL
                   </PixelButton>
                 </div>
               </div>
             )}
          </div>
        </div>
      </PixelCard>
    </div>
  );
};
