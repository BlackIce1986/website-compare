// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function Dashboard() {
  const { data: session } = useSession();
  const [websites, setWebsites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWebsites = async () => {
      try {
        const response = await fetch('/api/websites');
        if (response.ok) {
          const data = await response.json();
          setWebsites(data);
        }
      } catch (error) {
        console.error('Error fetching websites:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWebsites();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
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
          {/* Navigation Tabs */}
          <div className="mb-6">
            <nav className="flex space-x-8">
              <Link 
                href="/dashboard" 
                className="text-blue-600 border-b-2 border-blue-600 pb-2 px-1 text-sm font-medium"
              >
                My Websites
              </Link>
              <Link 
                href="/dashboard/shared" 
                className="text-gray-500 hover:text-gray-700 pb-2 px-1 text-sm font-medium border-b-2 border-transparent hover:border-gray-300"
              >
                Shared with Me
              </Link>
            </nav>
          </div>

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Your Websites</h2>
            <Link href="/dashboard/websites/new">
              <Button>Add Website</Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : websites.length > 0 ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {websites.map((website: any) => (
                  <li key={website.id}>
                    <Link href={`/dashboard/websites/${website.id}`} className="block hover:bg-gray-50">
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-blue-600 truncate">{website.name}</p>
                          <div className="ml-2 flex-shrink-0 flex">
                            <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              {website._count?.pages || 0} pages
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
                              Added on {new Date(website.createdAt).toLocaleDateString()}
                            </p>
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
              <p className="text-gray-500">You haven't added any websites yet.</p>
              <Link href="/dashboard/websites/new" className="mt-4 inline-block">
                <Button>Add Your First Website</Button>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}