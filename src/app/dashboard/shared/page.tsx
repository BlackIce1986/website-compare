// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Permission } from '@/lib/types';

interface SharedWebsite {
  id: string;
  name: string;
  url: string;
  permission: Permission;
  sharedAt: string;
  owner: {
    name: string;
    email: string;
  };
  _count: {
    pages: number;
  };
}

export default function SharedWebsitesPage() {
  const { data: session } = useSession();
  const [sharedWebsites, setSharedWebsites] = useState<SharedWebsite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSharedWebsites = async () => {
      try {
        const response = await fetch('/api/shared-websites');
        if (!response.ok) {
          throw new Error('Failed to fetch shared websites');
        }
        const data = await response.json();
        setSharedWebsites(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    if (session) {
      fetchSharedWebsites();
    }
  }, [session]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/dashboard" className="mr-4">
              <Button variant="ghost" size="sm">
                &larr; Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Shared with Me</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">Welcome, {session?.user?.name || 'User'}</span>
            <Link href="/api/auth/signout">
              <Button variant="outline" size="sm">Sign out</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <nav className="flex space-x-8">
              <Link 
                href="/dashboard" 
                className="text-gray-500 hover:text-gray-700 pb-2 px-1 text-sm font-medium border-b-2 border-transparent hover:border-gray-300"
              >
                My Websites
              </Link>
              <Link 
                href="/dashboard/shared" 
                className="text-blue-600 border-b-2 border-blue-600 pb-2 px-1 text-sm font-medium"
              >
                Shared with Me
              </Link>
            </nav>
          </div>

          <div className="mb-6">
            <p className="text-gray-600">
              Websites that have been shared with you by other users.
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <p>{error}</p>
            </div>
          ) : sharedWebsites.length > 0 ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {sharedWebsites.map((website) => (
                  <li key={website.id}>
                    <Link href={`/dashboard/websites/${website.id}`} className="block hover:bg-gray-50">
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-blue-600 truncate">{website.name}</p>
                              <div className="ml-2 flex-shrink-0 flex space-x-2">
                                <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  website.permission === 'edit' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {website.permission}
                                </p>
                                <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  {website._count.pages} pages
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 sm:flex sm:justify-between">
                              <div className="sm:flex">
                                <p className="flex items-center text-sm text-gray-500">
                                  {website.url}
                                </p>
                              </div>
                              <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                <p>
                                  Shared by {website.owner.name} on {new Date(website.sharedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center">
              <div className="text-gray-400 text-6xl mb-4">📤</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No shared websites</h3>
              <p className="text-gray-500 mb-4">
                No websites have been shared with you yet. When someone shares a website with you, it will appear here.
              </p>
              <Link href="/dashboard" className="inline-block">
                <Button>Go to Dashboard</Button>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}