'use client';

import { useState, useEffect } from 'react';
import { useConfig } from '@/contexts/ConfigContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useFirebase } from '@/contexts/FirebaseContext';
import { cn } from '@/lib/utils';
import { Modal } from './Modal';
import { cloudFunctions } from '@/lib/cloud-functions';
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
  Key
} from 'lucide-react';
import { WebhookConfig } from '@/types/config';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConfigModal({ isOpen, onClose }: ConfigModalProps) {
  const { theme } = useTheme();
  const { store, createDefaultWebhook } = useConfig();
  
  // Feature flag: Switch between Firebase and Redux
  const USE_FIREBASE = true; // Set to false to use Redux instead
  
  const firebase = useFirebase();
  
  // Use Firebase or Redux based on feature flag
  const webhooks = USE_FIREBASE ? firebase.webhooks : store.webhooks;
  const activeWebhookId = USE_FIREBASE ? firebase.activeWebhook?.id : store.activeWebhookId;
  
  const [activeTab, setActiveTab] = useState<'webhooks' | 'general'>('webhooks');
  const [editingWebhook, setEditingWebhook] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<{ [key: string]: boolean }>({});
  const [saving, setSaving] = useState(false);
  const [testingWebhooks, setTestingWebhooks] = useState<{ [key: string]: boolean }>({});
  const [testResults, setTestResults] = useState<{ [key: string]: 'success' | 'error' | null }>({});

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
      const webhook = webhooks.find(w => w.id === editingWebhook);
      if (webhook) {
        if (USE_FIREBASE) {
          // Firebase webhook structure
          setFormData({
            name: webhook.name,
            url: webhook.url,
            apiSecret: (webhook as any).secret || '',
            description: '', // Firebase doesn't store description
            color: '#3b82f6', // Firebase doesn't store color
          });
        } else {
          // Redux webhook structure
          setFormData({
            name: webhook.name,
            url: webhook.url,
            apiSecret: (webhook as any).apiSecret || '',
            description: (webhook as any).metadata?.description || '',
            color: (webhook as any).metadata?.color || '#3b82f6',
          });
        }
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
  }, [editingWebhook, webhooks, USE_FIREBASE]);

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

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setSaving(true);
    try {
      if (USE_FIREBASE) {
        // Ensure user is signed in first
        if (!firebase.isSignedIn) {
          await firebase.signInWithGoogle();
          // Wait a bit for auth state to propagate
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Verify user is now signed in
          if (!firebase.user) {
            throw new Error('Failed to sign in user. Please try again.');
          }
        }
        
        
        // Ensure user profile exists
        if (!firebase.userProfile) {
          // Wait up to 3 seconds for user profile to be created
          for (let i = 0; i < 6; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            if (firebase.userProfile) {
              break;
            }
          }
          
          if (!firebase.userProfile) {
            throw new Error('User profile could not be created. Please refresh the page and try again.');
          }
        }
        
        // Firebase webhook management
        const secret = formData.apiSecret.trim() || undefined;
        
        if (editingWebhook === 'new') {
          const newWebhook = await firebase.addWebhook(
            formData.name.trim(),
            formData.url.trim(),
            secret
          );
          
          // Note: setActiveWebhook is handled inside addWebhook function
          // No need to call it again here to avoid overwriting the webhooks array
        } else if (editingWebhook) {
          await firebase.updateWebhook(editingWebhook, {
            name: formData.name.trim(),
            url: formData.url.trim(),
            secret,
            isActive: true, // Maintain active status
          });
        }
      } else {
        // Redux webhook management
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
      }

      setEditingWebhook(null);

      // Run health check after saving webhook
      if (USE_FIREBASE) {
        // Trigger health check via Firebase context
        setTimeout(() => {
          firebase.checkWebhookHealth();
        }, 500); // Small delay to allow webhook to be fully saved
      }
    } catch (error) {
      alert(`Error saving webhook: ${(error as any)?.message || error}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingWebhook(null);
    setErrors({});
  };

  const handleDelete = async (webhookId: string) => {
    try {
      if (USE_FIREBASE) {
        await firebase.deleteWebhook(webhookId);
      } else {
        store.deleteWebhook(webhookId);
      }
      setShowDeleteModal(null);
    } catch (error) {
      // Could add error state here if needed
    }
  };


  const toggleSecretVisibility = (webhookId: string) => {
    setShowSecrets(prev => ({ ...prev, [webhookId]: !prev[webhookId] }));
  };

  const testWebhookConnection = async (webhook: any) => {
    setTestingWebhooks(prev => ({ ...prev, [webhook.id]: true }));
    setTestResults(prev => ({ ...prev, [webhook.id]: null }));

    try {
      const response = await cloudFunctions.checkHealth(
        webhook.url,
        USE_FIREBASE ? webhook.secret : webhook.apiSecret
      );

      if (response.status === 'healthy') {
        setTestResults(prev => ({ ...prev, [webhook.id]: 'success' }));
      } else {
        setTestResults(prev => ({ ...prev, [webhook.id]: 'error' }));
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, [webhook.id]: 'error' }));
    } finally {
      setTestingWebhooks(prev => ({ ...prev, [webhook.id]: false }));
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Configuration"
        className="max-w-[95vw] w-full max-h-[90vh] overflow-hidden"
      >
        <div className="flex flex-col md:flex-row h-full max-h-[75vh] min-h-[400px] md:min-h-[600px]">
          {/* Mobile Tab Navigation */}
          <div className="md:hidden border-b border-slate-200 dark:border-slate-700 p-4">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('webhooks')}
                className={cn(
                  'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
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
                  'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
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

          {/* Desktop Sidebar */}
          <div className="hidden md:block w-56 border-r border-slate-200 dark:border-slate-700 flex-shrink-0">
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
              <div className="p-4 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 space-y-4 md:space-y-0">
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
                    className="flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm w-full md:w-auto"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Webhook
                  </button>
                </div>

                {/* Webhook List */}
                <div className="space-y-4 md:space-y-6">
                  {webhooks.map((webhook) => (
                    <div
                      key={webhook.id}
                      className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 md:p-6 bg-white dark:bg-slate-800"
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between space-y-4 md:space-y-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                            <div className="flex items-center space-x-3">
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: USE_FIREBASE ? '#3b82f6' : ((webhook as any).metadata?.color || '#3b82f6') }}
                              />
                              <div 
                                className="webhook-name flex-shrink-0"
                                style={{ 
                                  color: '#ffffff',
                                  fontWeight: '400',
                                  fontSize: '1rem',
                                  lineHeight: '1.2rem',
                                  backgroundColor: 'rgba(29, 9, 130, 0.5)',
                                  borderRadius: '4px',
                                  padding: '4px 8px 0px 8px'
                                }}
                              >
                                {webhook.name}
                              </div>
                            </div>
                            {((USE_FIREBASE && webhook.id === activeWebhookId) || (!USE_FIREBASE && webhook.isActive)) && (
                              <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full self-start">
                                Active
                              </span>
                            )}
                          </div>
                          
                          <div className="mt-3 space-y-2">
                            <div className="flex items-start text-sm">
                              <Globe className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }} />
                              <span className="font-mono break-all text-xs sm:text-sm" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }}>{webhook.url}</span>
                            </div>
                            
                            {((USE_FIREBASE && (webhook as any).secret) || (!USE_FIREBASE && (webhook as any).apiSecret)) && (
                              <div className="flex items-center text-sm">
                                <Key className="w-4 h-4 mr-2 flex-shrink-0" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }} />
                                <span className="font-mono flex-1 text-xs sm:text-sm" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }}>
                                  {showSecrets[webhook.id] ? 
                                    (USE_FIREBASE ? (webhook as any).secret : (webhook as any).apiSecret) : 
                                    '••••••••••••••••'
                                  }
                                </span>
                                <button
                                  onClick={() => toggleSecretVisibility(webhook.id)}
                                  className="ml-2 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded flex-shrink-0"
                                >
                                  {showSecrets[webhook.id] ? (
                                    <EyeOff className="w-3 h-3" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }} />
                                  ) : (
                                    <Eye className="w-3 h-3" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }} />
                                  )}
                                </button>
                              </div>
                            )}
                            
                            {!USE_FIREBASE && (webhook as any).metadata?.description && (
                              <p className="text-sm" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }}>
                                {(webhook as any).metadata.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-start space-x-2 md:ml-4">
                          {/* Mobile: Stack buttons vertically, Desktop: Horizontal layout */}
                          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full md:w-auto">
                            {/* Activate/Deactivate Button */}
                            {((USE_FIREBASE && webhook.id !== activeWebhookId) || (!USE_FIREBASE && !webhook.isActive)) && (
                              <button
                                onClick={() => {
                                  if (USE_FIREBASE) {
                                    firebase.setActiveWebhook(webhook.id);
                                  } else {
                                    store.setActiveWebhook(webhook.id);
                                  }
                                }}
                                className="px-4 py-3 sm:px-3 sm:py-2 text-sm sm:text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 active:bg-blue-300 dark:active:bg-blue-700 transition-colors w-full sm:w-auto min-h-[44px] flex items-center justify-center"
                                title="Set as Active Webhook"
                              >
                                Activate
                              </button>
                            )}
                            
                            {/* Action Buttons Row */}
                            <div className="flex space-x-2 justify-center sm:justify-start">
                              {/* Test Connection Button */}
                              <button
                                onClick={() => testWebhookConnection(webhook)}
                                disabled={testingWebhooks[webhook.id]}
                                className={cn(
                                  "p-3 sm:p-2 rounded-lg transition-colors flex-1 sm:flex-none min-h-[44px] min-w-[44px] flex items-center justify-center",
                                  testingWebhooks[webhook.id] 
                                    ? "opacity-50 cursor-not-allowed" 
                                    : "hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-slate-200 dark:active:bg-slate-600",
                                  testResults[webhook.id] === 'success' && "bg-green-100 dark:bg-green-900",
                                  testResults[webhook.id] === 'error' && "bg-red-100 dark:bg-red-900"
                                )}
                                title="Test Webhook Connection"
                              >
                                {testingWebhooks[webhook.id] ? (
                                  <div className="w-5 h-5 sm:w-4 sm:h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Globe 
                                    className="w-5 h-5 sm:w-4 sm:h-4" 
                                    style={{ 
                                      color: testResults[webhook.id] === 'success' 
                                        ? '#10b981' 
                                        : testResults[webhook.id] === 'error' 
                                          ? '#ef4444' 
                                          : theme === 'light' ? '#374151' : '#94a3b8' 
                                    }} 
                                  />
                                )}
                              </button>

                              <button
                                onClick={() => setEditingWebhook(webhook.id)}
                                className="p-3 sm:p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-slate-200 dark:active:bg-slate-600 transition-colors flex-1 sm:flex-none min-h-[44px] min-w-[44px] flex items-center justify-center"
                                title="Edit Webhook"
                              >
                                <Edit3 className="w-5 h-5 sm:w-4 sm:h-4" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }} />
                              </button>
                              
                              <button
                                onClick={() => setShowDeleteModal(webhook.id)}
                                className="p-3 sm:p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900 active:bg-red-200 dark:active:bg-red-800 transition-colors flex-1 sm:flex-none min-h-[44px] min-w-[44px] flex items-center justify-center"
                                title="Delete Webhook"
                              >
                                <Trash2 className="w-5 h-5 sm:w-4 sm:h-4 text-red-500" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {webhooks.length === 0 && (
                    <div className="text-center py-8 md:py-12 px-4">
                      <Webhook className="w-12 h-12 mx-auto mb-4 opacity-50" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }} />
                      <h4 className="text-lg font-medium mb-2" style={{ color: theme === 'light' ? '#111827' : '#f1f5f9' }}>
                        No Webhooks Configured
                      </h4>
                      <p className="text-sm mb-4" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }}>
                        Add your first webhook to start chatting
                      </p>
                      <button
                        onClick={() => setEditingWebhook('new')}
                        className="w-full sm:w-auto px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Add Webhook
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'general' && (
              <div className="p-4 md:p-8">
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
                        className="w-full sm:w-auto px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
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
        className="max-w-[95vw] w-full sm:max-w-2xl"
      >
        <div className="space-y-6 p-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }}>
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={cn(
                  'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm',
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
                'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs sm:text-sm',
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
                'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs sm:text-sm'
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
                'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm'
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

          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={handleCancel}
              className="w-full sm:w-auto px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {saving ? 'Saving...' : (editingWebhook === 'new' ? 'Add Webhook' : 'Save Changes')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!showDeleteModal}
        onClose={() => setShowDeleteModal(null)}
        title="Delete Webhook"
        className="max-w-[95vw] w-full sm:max-w-md"
      >
        <div className="space-y-4 p-1">
          <p className="text-sm" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }}>
            Are you sure you want to delete this webhook? All associated chats will also be deleted. This action cannot be undone.
          </p>
          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
            <button
              onClick={() => setShowDeleteModal(null)}
              className="w-full sm:w-auto px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }}
            >
              Cancel
            </button>
            <button
              onClick={() => showDeleteModal && handleDelete(showDeleteModal)}
              className="w-full sm:w-auto px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}