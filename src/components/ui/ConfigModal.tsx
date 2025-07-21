'use client';

import { useState, useEffect } from 'react';
import { useConfig } from '@/contexts/ConfigContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Modal } from './Modal';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Eye, 
  EyeOff,
  Webhook,
  Globe,
  Key,
  AlertCircle,
  Check
} from 'lucide-react';
import { WebhookConfig } from '@/types/config';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConfigModal({ isOpen, onClose }: ConfigModalProps) {
  const { theme } = useTheme();
  const { store, createDefaultWebhook } = useConfig();
  const [activeTab, setActiveTab] = useState<'webhooks' | 'general'>('webhooks');
  const [editingWebhook, setEditingWebhook] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<{ [key: string]: boolean }>({});
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [connectionResults, setConnectionResults] = useState<{ [key: string]: boolean | null }>({});

  // Form state for editing
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    apiSecret: '',
    description: '',
    color: '#3b82f6',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (editingWebhook === 'new') {
      // Reset form for new webhook
      setFormData({
        name: '',
        url: '',
        apiSecret: '',
        description: '',
        color: '#3b82f6',
      });
    } else if (editingWebhook) {
      // Edit existing webhook
      const webhook = store.webhooks.find(w => w.id === editingWebhook);
      if (webhook) {
        setFormData({
          name: webhook.name,
          url: webhook.url,
          apiSecret: webhook.apiSecret || '',
          description: webhook.metadata?.description || '',
          color: webhook.metadata?.color || '#3b82f6',
        });
      }
    } else {
      // No webhook being edited
      setFormData({
        name: '',
        url: '',
        apiSecret: '',
        description: '',
        color: '#3b82f6',
      });
    }
    setErrors({});
  }, [editingWebhook, store.webhooks]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.url.trim()) {
      newErrors.url = 'URL is required';
    } else {
      try {
        new URL(formData.url);
      } catch {
        newErrors.url = 'Invalid URL format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const webhookData = {
      name: formData.name.trim(),
      url: formData.url.trim(),
      apiSecret: formData.apiSecret.trim() || undefined,
      metadata: {
        description: formData.description.trim() || undefined,
        color: formData.color,
      },
    };

    if (editingWebhook === 'new') {
      const newWebhook = store.addWebhook(webhookData);
      // Set as active if there's no currently active webhook
      if (!store.activeWebhookId) {
        store.setActiveWebhook(newWebhook.id);
      }
    } else if (editingWebhook) {
      store.updateWebhook(editingWebhook, webhookData);
    }

    setEditingWebhook(null);
  };

  const handleCancel = () => {
    setEditingWebhook(null);
    setErrors({});
  };

  const handleDelete = (webhookId: string) => {
    store.deleteWebhook(webhookId);
    setShowDeleteModal(null);
  };

  const testConnection = async (webhook: WebhookConfig) => {
    setTestingConnection(webhook.id);
    setConnectionResults(prev => ({ ...prev, [webhook.id]: null }));

    try {
      // Test the specific webhook by sending a test POST request through our API
      const response = await fetch('/api/test-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: webhook.url,
          secret: webhook.apiSecret,
          healthCheck: true, // Flag to indicate this is a health check
        }),
      });
      
      const data = await response.json();
      const isConnected = response.ok && data.success === true;
      setConnectionResults(prev => ({ ...prev, [webhook.id]: isConnected }));
    } catch (error) {
      setConnectionResults(prev => ({ ...prev, [webhook.id]: false }));
    } finally {
      setTestingConnection(null);
    }
  };

  const toggleSecretVisibility = (webhookId: string) => {
    setShowSecrets(prev => ({ ...prev, [webhookId]: !prev[webhookId] }));
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Configuration"
        className="max-w-[95vw] w-full max-h-[90vh] overflow-hidden"
      >
        <div className="flex h-full max-h-[75vh] min-h-[600px]">
          {/* Sidebar */}
          <div className="w-56 border-r border-slate-200 dark:border-slate-700 flex-shrink-0">
            <div className="p-4 space-y-2">
              <button
                onClick={() => setActiveTab('webhooks')}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                  activeTab === 'webhooks'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
                style={{ color: activeTab !== 'webhooks' ? (theme === 'light' ? '#374151' : '#94a3b8') : undefined }}
              >
                <Webhook className="w-4 h-4 inline mr-2" />
                Webhooks
              </button>
              <button
                onClick={() => setActiveTab('general')}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                  activeTab === 'general'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
                style={{ color: activeTab !== 'general' ? (theme === 'light' ? '#374151' : '#94a3b8') : undefined }}
              >
                <Globe className="w-4 h-4 inline mr-2" />
                General
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'webhooks' && (
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold" style={{ color: theme === 'light' ? '#111827' : '#f1f5f9' }}>
                      Webhook Configurations
                    </h3>
                    <p className="text-sm mt-1" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }}>
                      Manage your webhook endpoints and API secrets
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingWebhook('new')}
                    className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Webhook
                  </button>
                </div>

                {/* Webhook List */}
                <div className="space-y-6">
                  {store.webhooks.map((webhook) => (
                    <div
                      key={webhook.id}
                      className="border border-slate-200 dark:border-slate-700 rounded-lg p-6 bg-white dark:bg-slate-800"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: webhook.metadata?.color || '#3b82f6' }}
                            />
                            <div 
                              style={{ 
                                color: '#ffffff',
                                fontWeight: '600',
                                fontSize: '1rem',
                                lineHeight: '1.5rem',
                                margin: 0,
                                padding: 0,
                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                borderRadius: '4px',
                                paddingLeft: '4px',
                                paddingRight: '4px'
                              }}
                            >
                              {webhook.name}
                            </div>
                            {webhook.isActive && (
                              <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full">
                                Active
                              </span>
                            )}
                          </div>
                          
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center text-sm">
                              <Globe className="w-4 h-4 mr-2" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }} />
                              <span className="font-mono truncate" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }}>{webhook.url}</span>
                            </div>
                            
                            {webhook.apiSecret && (
                              <div className="flex items-center text-sm">
                                <Key className="w-4 h-4 mr-2" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }} />
                                <span className="font-mono" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }}>
                                  {showSecrets[webhook.id] ? webhook.apiSecret : '••••••••••••••••'}
                                </span>
                                <button
                                  onClick={() => toggleSecretVisibility(webhook.id)}
                                  className="ml-2 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                                >
                                  {showSecrets[webhook.id] ? (
                                    <EyeOff className="w-3 h-3" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }} />
                                  ) : (
                                    <Eye className="w-3 h-3" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }} />
                                  )}
                                </button>
                              </div>
                            )}
                            
                            {webhook.metadata?.description && (
                              <p className="text-sm" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }}>
                                {webhook.metadata.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          {/* Activate/Deactivate Button */}
                          {!webhook.isActive && (
                            <button
                              onClick={() => store.setActiveWebhook(webhook.id)}
                              className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                              title="Set as Active Webhook"
                            >
                              Activate
                            </button>
                          )}
                          
                          {/* Connection Test */}
                          <button
                            onClick={() => testConnection(webhook)}
                            disabled={testingConnection === webhook.id}
                            className={cn(
                              'p-2 rounded-lg transition-colors text-sm',
                              connectionResults[webhook.id] === true && 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
                              connectionResults[webhook.id] === false && 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
                              connectionResults[webhook.id] === null && 'hover:bg-slate-100 dark:hover:bg-slate-700',
                              testingConnection === webhook.id && 'opacity-50 cursor-not-allowed'
                            )}
                            title="Test Connection"
                          >
                            {testingConnection === webhook.id ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : connectionResults[webhook.id] === true ? (
                              <Check className="w-4 h-4" />
                            ) : connectionResults[webhook.id] === false ? (
                              <AlertCircle className="w-4 h-4" />
                            ) : (
                              <Globe className="w-4 h-4" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }} />
                            )}
                          </button>

                          <button
                            onClick={() => setEditingWebhook(webhook.id)}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }} />
                          </button>
                          
                          <button
                            onClick={() => setShowDeleteModal(webhook.id)}
                            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {store.webhooks.length === 0 && (
                    <div className="text-center py-12">
                      <Webhook className="w-12 h-12 mx-auto mb-4 opacity-50" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }} />
                      <h4 className="text-lg font-medium mb-2" style={{ color: theme === 'light' ? '#111827' : '#f1f5f9' }}>
                        No Webhooks Configured
                      </h4>
                      <p className="text-sm mb-4" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }}>
                        Add your first webhook to start chatting
                      </p>
                      <button
                        onClick={() => setEditingWebhook('new')}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Add Webhook
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'general' && (
              <div className="p-8">
                <h3 className="text-lg font-semibold mb-6" style={{ color: theme === 'light' ? '#111827' : '#f1f5f9' }}>
                  General Settings
                </h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }}>
                      Data Storage
                    </label>
                    <div className="space-y-3">
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to clear all configuration data? This cannot be undone.')) {
                            store.clearConfig();
                          }
                        }}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                      >
                        Clear All Data
                      </button>
                      <p className="text-xs" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }}>
                        This will remove all webhooks and chat history from local storage.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Edit Webhook Modal */}
      <Modal
        isOpen={!!editingWebhook}
        onClose={handleCancel}
        title={editingWebhook === 'new' ? 'Add Webhook' : 'Edit Webhook'}
        className="max-w-2xl"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }}>
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={cn(
                  'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                  errors.name && 'border-red-500'
                )}
                style={{ 
                  color: theme === 'light' ? '#111827' : '#ffffff',
                  backgroundColor: theme === 'light' ? '#ffffff' : '#1e293b',
                  borderColor: theme === 'light' ? '#e2e8f0' : '#475569'
                }}
                placeholder="My Webhook"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }}>
                Color
              </label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                className="w-full h-10 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }}>
              Webhook URL *
            </label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              className={cn(
                'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm',
                errors.url && 'border-red-500'
              )}
              style={{ 
                color: theme === 'light' ? '#111827' : '#ffffff',
                backgroundColor: theme === 'light' ? '#ffffff' : '#1e293b',
                borderColor: theme === 'light' ? '#e2e8f0' : '#475569'
              }}
              placeholder="https://example.com/webhook"
            />
            {errors.url && <p className="text-red-500 text-xs mt-1">{errors.url}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }}>
              API Secret (Optional)
            </label>
            <input
              type="password"
              value={formData.apiSecret}
              onChange={(e) => setFormData(prev => ({ ...prev, apiSecret: e.target.value }))}
              className={cn(
                'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm'
              )}
              style={{ 
                color: theme === 'light' ? '#111827' : '#ffffff',
                backgroundColor: theme === 'light' ? '#ffffff' : '#1e293b',
                borderColor: theme === 'light' ? '#e2e8f0' : '#475569'
              }}
              placeholder="Optional authentication secret"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }}>
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className={cn(
                'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none'
              )}
              style={{ 
                color: theme === 'light' ? '#111827' : '#ffffff',
                backgroundColor: theme === 'light' ? '#ffffff' : '#1e293b',
                borderColor: theme === 'light' ? '#e2e8f0' : '#475569'
              }}
              rows={3}
              placeholder="Brief description of this webhook..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              {editingWebhook === 'new' ? 'Add Webhook' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!showDeleteModal}
        onClose={() => setShowDeleteModal(null)}
        title="Delete Webhook"
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }}>
            Are you sure you want to delete this webhook? All associated chats will also be deleted. This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowDeleteModal(null)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }}
            >
              Cancel
            </button>
            <button
              onClick={() => showDeleteModal && handleDelete(showDeleteModal)}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}