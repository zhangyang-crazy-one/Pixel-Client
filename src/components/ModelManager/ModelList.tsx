/**
 * ModelList - Displays a list of LLM models
 */

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

interface ModelListProps {
  models: LLMModel[];
  selectedModelId?: string;
  onSelectModel: (modelId: string) => void;
  onEditModel: (model: LLMModel) => void;
  onDeleteModel: (modelId: string) => void;
  isLoading?: boolean;
}

export function ModelList({
  models,
  selectedModelId,
  onSelectModel,
  onEditModel,
  onDeleteModel,
  isLoading,
}: ModelListProps) {
  if (isLoading && models.length === 0) {
    return (
      <div className="flex items-center justify-center p-4">
        <span className="text-gray-500">Loading models...</span>
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="flex items-center justify-center p-4">
        <span className="text-gray-500">No models configured</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {models.map((model) => (
        <div
          key={model.id}
          className={`flex items-center justify-between p-3 rounded-lg cursor-pointer ${
            selectedModelId === model.id
              ? 'bg-blue-100 dark:bg-blue-900'
              : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          onClick={() => onSelectModel(model.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectModel(model.id);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{model.name}</span>
              {model.is_default && (
                <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900 rounded">
                  Default
                </span>
              )}
            </div>
            <span className="text-sm text-gray-500">{model.model_id}</span>
            <span className="ml-2 text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">
              {model.model_type}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditModel(model);
              }}
              className="p-1 text-gray-500 hover:text-blue-500"
              title="Edit model"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteModel(model.id);
              }}
              className="p-1 text-gray-500 hover:text-red-500"
              title="Delete model"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
