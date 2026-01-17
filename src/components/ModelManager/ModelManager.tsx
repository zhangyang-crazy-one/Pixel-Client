/**
 * ModelManager - Main component for managing LLM models and providers
 */

import { useState } from 'react';
import { ModelList } from './ModelList';
import { ModelForm } from './ModelForm';

interface LLMProvider {
  id: string;
  name: string;
  provider_type: string;
  base_url: string;
  enabled: boolean;
}

interface LLMModel {
  id: string;
  provider_id: string;
  name: string;
  model_id: string;
  model_type: string;
  context_length: number | null;
  max_tokens: number | null;
  temperature: number | null;
  dimensions: number | null;
  is_default: boolean;
}

type ViewMode = 'list' | 'add' | 'edit';

interface ModelManagerProps {
  models: LLMModel[];
  providers: LLMProvider[];
  selectedModelId?: string;
  onSelectModel: (modelId: string) => void;
  onAddModel: (model: Omit<LLMModel, 'id'>) => Promise<void>;
  onUpdateModel: (modelId: string, model: Omit<LLMModel, 'id'>) => Promise<void>;
  onDeleteModel: (modelId: string) => Promise<void>;
  isLoading?: boolean;
}

export function ModelManager({
  models,
  providers,
  selectedModelId,
  onSelectModel,
  onAddModel,
  onUpdateModel,
  onDeleteModel,
  isLoading,
}: ModelManagerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingModel, setEditingModel] = useState<LLMModel | undefined>();

  const handleEditModel = (model: LLMModel) => {
    setEditingModel(model);
    setViewMode('edit');
  };

  const handleSaveModel = async (modelData: Omit<LLMModel, 'id'>) => {
    if (viewMode === 'add') {
      await onAddModel(modelData);
    } else if (viewMode === 'edit' && editingModel) {
      await onUpdateModel(editingModel.id, modelData);
    }
    setViewMode('list');
    setEditingModel(undefined);
  };

  const handleCancel = () => {
    setViewMode('list');
    setEditingModel(undefined);
  };

  const handleDeleteModel = async (modelId: string) => {
    if (confirm('Are you sure you want to delete this model?')) {
      await onDeleteModel(modelId);
    }
  };

  const handleAddModel = () => {
    setEditingModel(undefined);
    setViewMode('add');
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'add':
      case 'edit':
        return (
          <ModelForm
            model={editingModel}
            providers={providers.map((p) => ({ id: p.id, name: p.name }))}
            onSave={handleSaveModel}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        );
      case 'list':
      default:
        return (
          <>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-medium">Models</h2>
              <button
                onClick={handleAddModel}
                disabled={providers.length === 0}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
              >
                Add Model
              </button>
            </div>
            <div className="p-4">
              {providers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-2">No providers configured</p>
                  <p className="text-sm text-gray-400">
                    Add a provider first before adding models
                  </p>
                </div>
              ) : (
                <ModelList
                  models={models}
                  selectedModelId={selectedModelId}
                  onSelectModel={onSelectModel}
                  onEditModel={handleEditModel}
                  onDeleteModel={handleDeleteModel}
                  isLoading={isLoading}
                />
              )}
            </div>
          </>
        );
    }
  };

  return (
    <div className="flex flex-col h-full">
      {renderContent()}
    </div>
  );
}
