/**
 * ModelForm - Form for adding/editing LLM models
 */

import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';

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

interface ModelFormProps {
  model?: LLMModel;
  providers: Array<{ id: string; name: string }>;
  onSave: (model: Omit<LLMModel, 'id'>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const MODEL_TYPES = [
  { value: 'chat', label: 'Chat' },
  { value: 'embedding', label: 'Embedding' },
  { value: 'rerank', label: 'Rerank' },
  { value: 'multimodal', label: 'Multimodal' },
  { value: 'nlp', label: 'NLP' },
];

export function ModelForm({
  model,
  providers,
  onSave,
  onCancel,
  isLoading,
}: ModelFormProps) {
  const [formData, setFormData] = useState({
    provider_id: '',
    name: '',
    model_id: '',
    model_type: 'chat' as string,
    context_length: '',
    max_tokens: '',
    temperature: '',
    dimensions: '',
    is_default: false,
  });

  useEffect(() => {
    if (model) {
      setFormData({
        provider_id: model.provider_id,
        name: model.name,
        model_id: model.model_id,
        model_type: model.model_type,
        context_length: model.context_length?.toString() ?? '',
        max_tokens: model.max_tokens?.toString() ?? '',
        temperature: model.temperature?.toString() ?? '',
        dimensions: model.dimensions?.toString() ?? '',
        is_default: model.is_default,
      });
    }
  }, [model]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onSave({
      provider_id: formData.provider_id,
      name: formData.name,
      model_id: formData.model_id,
      model_type: formData.model_type,
      context_length: formData.context_length
        ? parseInt(formData.context_length, 10)
        : null,
      max_tokens: formData.max_tokens ? parseInt(formData.max_tokens, 10) : null,
      temperature: formData.temperature
        ? parseFloat(formData.temperature)
        : null,
      dimensions: formData.dimensions
        ? parseInt(formData.dimensions, 10)
        : null,
      is_default: formData.is_default,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
      <h3 className="text-lg font-medium">
        {model ? 'Edit Model' : 'Add New Model'}
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Provider</label>
          <select
            name="provider_id"
            value={formData.provider_id}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded"
          >
            <option value="">Select provider</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Model Type</label>
          <select
            name="model_type"
            value={formData.model_type}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded"
          >
            {MODEL_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Display Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="e.g., GPT-4"
          className="w-full p-2 border rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Model ID</label>
        <input
          type="text"
          name="model_id"
          value={formData.model_id}
          onChange={handleChange}
          required
          placeholder="e.g., gpt-4-turbo-preview"
          className="w-full p-2 border rounded"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Context Length</label>
          <input
            type="number"
            name="context_length"
            value={formData.context_length}
            onChange={handleChange}
            placeholder="e.g., 128000"
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Max Tokens</label>
          <input
            type="number"
            name="max_tokens"
            value={formData.max_tokens}
            onChange={handleChange}
            placeholder="e.g., 4096"
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Temperature</label>
          <input
            type="number"
            name="temperature"
            value={formData.temperature}
            onChange={handleChange}
            step="0.1"
            min="0"
            max="2"
            placeholder="e.g., 0.7"
            className="w-full p-2 border rounded"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          name="is_default"
          id="is_default"
          checked={formData.is_default}
          onChange={handleChange}
          className="w-4 h-4"
        />
        <label htmlFor="is_default" className="text-sm">
          Set as default model
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 border rounded hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : model ? 'Update' : 'Add Model'}
        </button>
      </div>
    </form>
  );
}
