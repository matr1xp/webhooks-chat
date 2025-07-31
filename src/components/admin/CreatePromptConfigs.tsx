'use client';

import { useState } from 'react';
import { setPromptConfig } from '@/lib/firestore/prompts';

interface PromptData {
  id: string;
  webhookName: string;
  title: string;
  suggestions: string[];
}

const SAMPLE_PROMPTS: PromptData[] = [
  {
    id: 'OpenAI GPT4',
    webhookName: 'OpenAI GPT4',
    title: "I'm an AI powered chat bot",
    suggestions: [
      "What is the meaning of life?",
      "Tell me about the latest AI developments",
      "Construct a poem about love",
      "Explain quantum computing in simple terms",
      "Help me write a professional email",
      "Create a workout plan for beginners"
    ]
  },
  {
    id: 'MekanikOZ',
    webhookName: 'MekanikOZ',
    title: "I'm an expert AI booking assistant",
    suggestions: [
      "I want to book my car for annual service",
      "What are the services you offer",
      "Do you do an oil and filter change",
      "What's wrong with my car?"
    ]
  }
];

/**
 * Temporary admin component to create sample prompt configurations
 * Add this to any page temporarily to create the Firestore documents
 * Remove after use
 */
export function CreatePromptConfigs() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [success, setSuccess] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createPrompts = async (promptData: PromptData) => {
    setLoading(prev => ({ ...prev, [promptData.id]: true }));
    setErrors(prev => ({ ...prev, [promptData.id]: '' }));
    
    try {
      await setPromptConfig(promptData.id, {
        webhookName: promptData.webhookName,
        title: promptData.title,
        suggestions: promptData.suggestions,
        isActive: true
      });
      
      setSuccess(prev => ({ ...prev, [promptData.id]: true }));
      console.log(`✅ ${promptData.webhookName} prompts created successfully!`);
    } catch (err: any) {
      setErrors(prev => ({ ...prev, [promptData.id]: err.message }));
      console.error(`❌ Error creating ${promptData.webhookName} prompts:`, err);
    } finally {
      setLoading(prev => ({ ...prev, [promptData.id]: false }));
    }
  };

  const createAllPrompts = async () => {
    for (const promptData of SAMPLE_PROMPTS) {
      if (!success[promptData.id]) {
        await createPrompts(promptData);
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  };

  const allSuccessful = SAMPLE_PROMPTS.every(p => success[p.id]);
  const hasAnySuccess = SAMPLE_PROMPTS.some(p => success[p.id]);

  return (
    <div className="space-y-6 p-6 bg-slate-50 dark:bg-slate-900 rounded-lg">
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
          Create Sample Prompt Configurations
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Set up sample webhook prompt configurations in Firestore
        </p>
      </div>

      {/* Bulk Action */}
      <div className="flex justify-center">
        <button
          onClick={createAllPrompts}
          disabled={Object.values(loading).some(Boolean) || allSuccessful}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {Object.values(loading).some(Boolean) 
            ? 'Creating...' 
            : allSuccessful 
            ? 'All Created!' 
            : 'Create All Sample Prompts'
          }
        </button>
      </div>

      {/* Individual Prompt Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SAMPLE_PROMPTS.map((promptData) => {
          const isLoading = loading[promptData.id];
          const isSuccess = success[promptData.id];
          const error = errors[promptData.id];

          return (
            <div
              key={promptData.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                isSuccess
                  ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                  : error
                  ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                  : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                    {promptData.webhookName}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {promptData.title}
                  </p>
                </div>
                {isSuccess && (
                  <span className="text-green-600 dark:text-green-400">✅</span>
                )}
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                <p><strong>Suggestions:</strong> {promptData.suggestions.length} items</p>
                <div className="mt-1 space-y-1">
                  {promptData.suggestions.slice(0, 2).map((suggestion, idx) => (
                    <p key={idx} className="truncate">• {suggestion}</p>
                  ))}
                  {promptData.suggestions.length > 2 && (
                    <p>• ... and {promptData.suggestions.length - 2} more</p>
                  )}
                </div>
              </div>

              {error && (
                <div className="mb-3 p-2 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm">
                  Error: {error}
                </div>
              )}

              {isSuccess ? (
                <div className="text-green-600 dark:text-green-400 text-sm font-medium">
                  ✅ Created successfully!
                </div>
              ) : (
                <button
                  onClick={() => createPrompts(promptData)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  {isLoading ? 'Creating...' : `Create ${promptData.webhookName}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {hasAnySuccess && (
        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-green-800 dark:text-green-200 font-medium">
            🎉 Prompt configurations created!
          </p>
          <p className="text-green-600 dark:text-green-400 text-sm mt-1">
            You can now test the dynamic prompts feature by switching between webhooks.
            Remove this component when done.
          </p>
        </div>
      )}
    </div>
  );
}