/**
 * Skill Service
 * Handles Skill management and execution
 */

import { apiClient } from '../services/apiClient';

// ============================================================================
// Types
// ============================================================================

export interface SkillParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
  default?: unknown;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  parameters: SkillParameter[];
  code: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SkillCategory {
  name: string;
  count: number;
}

export interface SkillExecutionResult {
  success: boolean;
  output: unknown;
  error?: string;
  executionTimeMs: number;
}

export interface SkillFormData {
  name: string;
  description: string;
  category: string;
  parameters: SkillParameter[];
  code: string;
}

// ============================================================================
// Skill Operations
// ============================================================================

/**
 * Get all skills
 */
export async function getSkills(enabledOnly = false): Promise<Skill[]> {
  return apiClient.getSkills(enabledOnly);
}

/**
 * Get skills by category
 */
export async function getSkillsByCategory(category: string): Promise<Skill[]> {
  const skills = await getSkills();
  return skills.filter(s => s.category === category);
}

/**
 * Create a new skill
 */
export async function createSkill(data: SkillFormData): Promise<Skill> {
  return apiClient.createSkill(
    data.name,
    data.description,
    data.category,
    data.parameters,
    data.code
  );
}

/**
 * Execute a skill
 */
export async function executeSkill(
  skillId: string,
  params: Record<string, unknown>
): Promise<SkillExecutionResult> {
  return apiClient.executeSkill(skillId, params);
}

/**
 * Get all skill categories with counts
 */
export async function getSkillCategories(): Promise<SkillCategory[]> {
  return apiClient.getSkillCategories();
}

/**
 * Toggle skill enabled state
 */
export async function toggleSkill(skillId: string): Promise<boolean> {
  return apiClient.toggleSkill(skillId);
}

/**
 * Import a skill from JSON
 */
export async function importSkill(skillJson: string): Promise<Skill> {
  try {
    const parsed = JSON.parse(skillJson);
    return apiClient.importSkill(parsed);
  } catch (error) {
    throw new Error(`Invalid skill JSON: ${error}`);
  }
}

/**
 * Export a skill to JSON string
 */
export async function exportSkill(skillId: string): Promise<string> {
  const skill = await apiClient.getSkill(skillId);
  if (!skill) {
    throw new Error('Skill not found');
  }
  return JSON.stringify(skill, null, 2);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get category options
 */
export function getCategoryOptions(): Array<{ value: string; label: string }> {
  return [
    { value: 'Productivity', label: 'Productivity' },
    { value: 'Development', label: 'Development' },
    { value: 'Analysis', label: 'Analysis' },
    { value: 'Creative', label: 'Creative' },
    { value: 'Data', label: 'Data' },
    { value: 'Integration', label: 'Integration' },
    { value: 'Custom', label: 'Custom' },
  ];
}

/**
 * Get parameter type options
 */
export function getParameterTypeOptions(): Array<{ value: string; label: string }> {
  return [
    { value: 'string', label: 'String' },
    { value: 'number', label: 'Number' },
    { value: 'boolean', label: 'Boolean' },
    { value: 'array', label: 'Array' },
    { value: 'object', label: 'Object' },
  ];
}

/**
 * Validate skill form data
 */
export function validateSkillForm(data: SkillFormData): string[] {
  const errors: string[] = [];
  
  if (!data.name.trim()) {
    errors.push('Skill name is required');
  }
  
  if (!data.description.trim()) {
    errors.push('Description is required');
  }
  
  if (!data.category) {
    errors.push('Category is required');
  }
  
  if (!data.code.trim()) {
    errors.push('Skill code is required');
  }
  
  // Validate parameter names
  const paramNames = new Set<string>();
  for (const param of data.parameters) {
    if (!param.name.trim()) {
      errors.push('Parameter name cannot be empty');
    }
    if (paramNames.has(param.name)) {
      errors.push(`Duplicate parameter name: ${param.name}`);
    }
    paramNames.add(param.name);
  }
  
  return errors;
}

/**
 * Validate parameter values against schema
 */
export function validateParameterValues(
  params: Record<string, unknown>,
  parameters: SkillParameter[]
): string[] {
  const errors: string[] = [];
  
  for (const param of parameters) {
    const value = params[param.name];
    
    // Check required parameters
    if (param.required && value === undefined) {
      errors.push(`Required parameter '${param.name}' is missing`);
      continue;
    }
    
    if (value === undefined) {
      continue;
    }
    
    // Type validation
    switch (param.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`Parameter '${param.name}' must be a string`);
        }
        break;
      case 'number':
        if (typeof value !== 'number' || isNaN(value as number)) {
          errors.push(`Parameter '${param.name}' must be a valid number`);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`Parameter '${param.name}' must be a boolean`);
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`Parameter '${param.name}' must be an array`);
        }
        break;
      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          errors.push(`Parameter '${param.name}' must be an object`);
        }
        break;
    }
  }
  
  return errors;
}

/**
 * Create a parameter schema from form data
 */
export function createParameterSchema(
  parameters: SkillParameter[]
): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    type: 'object',
    properties: {},
    required: [],
  };
  
  for (const param of parameters) {
    (schema.properties as Record<string, unknown>)[param.name] = {
      type: param.type,
      description: param.description,
    };
    
    if (param.default !== undefined) {
      (schema.properties as Record<string, unknown>)[param.name].default = param.default;
    }
    
    if (param.required) {
      (schema.required as string[]).push(param.name);
    }
  }
  
  return schema;
}

/**
 * Get skill templates
 */
export function getSkillTemplates(): Array<{
  name: string;
  description: string;
  category: string;
  parameters: SkillParameter[];
  code: string;
}> {
  return [
    {
      name: 'Text Formatter',
      description: 'Format text with various transformations',
      category: 'Productivity',
      parameters: [
        {
          name: 'text',
          type: 'string',
          description: 'The text to format',
          required: true,
        },
        {
          name: 'format',
          type: 'string',
          description: 'Format type: uppercase, lowercase, titlecase',
          required: true,
          default: 'titlecase',
        },
      ],
      code: `// Text formatter skill
function execute(params) {
  const { text, format = 'titlecase' } = params;
  
  switch (format) {
    case 'uppercase':
      return { result: text.toUpperCase() };
    case 'lowercase':
      return { result: text.toLowerCase() };
    case 'titlecase':
      return { result: text.replace(/\\w\\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      )};
    default:
      return { result: text };
  }
}`,
    },
    {
      name: 'URL Encoder',
      description: 'Encode and decode URL components',
      category: 'Development',
      parameters: [
        {
          name: 'text',
          type: 'string',
          description: 'Text to encode/decode',
          required: true,
        },
        {
          name: 'action',
          type: 'string',
          description: 'encode or decode',
          required: true,
          default: 'encode',
        },
      ],
      code: `// URL encoder/decoder skill
function execute(params) {
  const { text, action = 'encode' } = params;
  
  if (action === 'encode') {
    return { result: encodeURIComponent(text) };
  } else {
    return { result: decodeURIComponent(text) };
  }
}`,
    },
    {
      name: 'Word Counter',
      description: 'Count words, characters, and lines',
      category: 'Productivity',
      parameters: [
        {
          name: 'text',
          type: 'string',
          description: 'Text to analyze',
          required: true,
        },
      ],
      code: `// Word counter skill
function execute(params) {
  const { text } = params;
  
  const words = text.trim().split(/\\s+/).filter(w => w.length > 0);
  const lines = text.split('\\n').filter(l => l.length > 0);
  
  return {
    result: {
      words: words.length,
      characters: text.length,
      lines: lines.length,
    }
  };
}`,
    },
  ];
}

/**
 * Format execution time for display
 */
export function formatExecutionTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Get skill status badge info
 */
export function getSkillStatusInfo(skill: Skill): {
  label: string;
  color: 'green' | 'gray';
} {
  if (skill.enabled) {
    return { label: 'Enabled', color: 'green' };
  }
  return { label: 'Disabled', color: 'gray' };
}
