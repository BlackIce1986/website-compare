// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Permission } from '@/lib/types';

interface InvitationDetails {
  id: string;
  websiteName: string;
  websiteUrl: string;
  inviterName: string;
  inviterEmail: string;
  permission: Permission;
  expiresAt: string;
}

export default function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    const getToken = async () => {
      const resolvedParams = await params;
      setToken(resolvedParams.token);
    };
    getToken();
  }, [params]);

  useEffect(() => {
    if (!token) return;

    const fetchInvitation = async () => {
      try {
        const response = await fetch(`/api/invitations/${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Failed to load invitation');
          return;
        }

        setInvitation(data.invitation);
      } catch (err) {
        setError('Failed to load invitation');
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  const handleAcceptInvitation = async () => {
    if (!session) {
      router.push(`/login?callbackUrl=/invitations/${token}`);
      return;
    }

    setAccepting(true);
    setError(null);

    try {
      const response = await fetch(`/api/invitations/${token}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to accept invitation');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/dashboard/websites/${data.websiteId}`);
      }, 2000);
    } catch (err) {
      setError('Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Invitation</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/dashboard"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="text-green-500 text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invitation Accepted!</h1>
          <p className="text-gray-600 mb-6">
            You now have access to <strong>{invitation?.websiteName}</strong>. 
            Redirecting you to the website...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-blue-500 text-5xl mb-4">📨</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Website Invitation</h1>
          <p className="text-gray-600">You've been invited to collaborate</p>
        </div>

        {invitation && (
          <div className="space-y-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Website Details</h3>
              <p className="text-sm text-gray-600 mb-1">
                <strong>Name:</strong> {invitation.websiteName}
              </p>
              <p className="text-sm text-gray-600 mb-1">
                <strong>URL:</strong> {invitation.websiteUrl}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Permission:</strong> {invitation.permission}
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Invited by</h3>
              <p className="text-sm text-gray-600 mb-1">
                <strong>Name:</strong> {invitation.inviterName}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Email:</strong> {invitation.inviterEmail}
              </p>
            </div>

            <div className="text-xs text-gray-500 text-center">
              This invitation expires on {new Date(invitation.expiresAt).toLocaleDateString()}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          {status === 'loading' ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : !session ? (
            <div className="text-center">
              <p className="text-gray-600 mb-4">Please sign in to accept this invitation</p>
              <button
                onClick={() => router.push(`/login?callbackUrl=/invitations/${token}`)}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Sign In to Accept
              </button>
            </div>
          ) : (
            <button
              onClick={handleAcceptInvitation}
              disabled={accepting}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {accepting ? 'Accepting...' : 'Accept Invitation'}
            </button>
          )}

          <Link
            href="/dashboard"
            className="block w-full text-center bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}