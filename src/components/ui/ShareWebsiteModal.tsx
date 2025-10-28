// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { Permission, InvitationStatus } from '@/lib/types';

interface Invitation {
  id: string;
  email: string;
  inviteeName: string | null;
  permission: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  url: string;
}

interface ShareWebsiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  websiteId: string;
  websiteName: string;
}

export function ShareWebsiteModal({ isOpen, onClose, websiteId, websiteName }: ShareWebsiteModalProps) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState(Permission.VIEW);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch existing invitations when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchInvitations();
    }
  }, [isOpen, websiteId]);

  const fetchInvitations = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/websites/${websiteId}/invitations`);
      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations);
      }
    } catch (err) {
      console.error('Error fetching invitations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/websites/${websiteId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          permission,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      setSuccess(`Invitation sent to ${email}`);
      setEmail('');
      setPermission(Permission.VIEW);
      
      // Refresh invitations list
      fetchInvitations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) {
      return;
    }

    try {
      const response = await fetch(`/api/websites/${websiteId}/invitations/${invitationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel invitation');
      }

      // Refresh invitations list
      fetchInvitations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel invitation');
    }
  };

  const copyInvitationUrl = async (url: string) => {
    try {
      // Fallback for older browsers or non-secure contexts
      if (!navigator.clipboard) {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      } else {
        await navigator.clipboard.writeText(url);
      }
      setSuccess('Invitation URL copied to clipboard');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to copy URL to clipboard');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Share "{websiteName}"
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Send New Invitation Form */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Send Invitation</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="permission" className="block text-sm font-medium text-gray-700 mb-1">
                  Permission Level
                </label>
                <select
                  id="permission"
                  value={permission}
                  onChange={(e) => setPermission(e.target.value as Permission)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={Permission.VIEW}>View Only</option>
                  <option value={Permission.EDIT}>View & Edit</option>
                </select>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                  {success}
                </div>
              )}

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? 'Sending...' : 'Send Invitation'}
              </Button>
            </form>
          </div>

          {/* Existing Invitations */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Pending Invitations</h3>
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : invitations.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No invitations sent yet</p>
            ) : (
              <div className="space-y-3">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          {invitation.inviteeName || invitation.email}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          invitation.status === InvitationStatus.PENDING 
                            ? 'bg-yellow-100 text-yellow-800'
                            : invitation.status === InvitationStatus.ACCEPTED
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {invitation.status}
                        </span>
                        <span className="text-sm text-gray-500">
                          ({invitation.permission})
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Sent {new Date(invitation.createdAt).toLocaleDateString()}
                        {invitation.status === 'pending' && (
                          <span> • Expires {new Date(invitation.expiresAt).toLocaleDateString()}</span>
                        )}
                        {invitation.acceptedAt && (
                          <span> • Accepted {new Date(invitation.acceptedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {invitation.status === InvitationStatus.PENDING && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyInvitationUrl(invitation.url)}
                          >
                            Copy Link
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteInvitation(invitation.id)}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}