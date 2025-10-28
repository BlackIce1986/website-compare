'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ShareWebsiteModal } from '@/components/ui/ShareWebsiteModal';
import { use } from 'react';

interface Website {
  id: string;
  name: string;
  url: string;
  authToken?: string;
}

interface Page {
  id: string;
  name: string;
  path: string;
  websiteId: string;
  createdAt: string;
}

export default function WebsiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [website, setWebsite] = useState<Website | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // New page form state
  const [showNewPageForm, setShowNewPageForm] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [newPagePath, setNewPagePath] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);

  // Fetch website details and pages
  useEffect(() => {
    const fetchWebsiteAndPages = async () => {
      try {
        // Fetch website details
        const websiteRes = await fetch(`/api/websites/${resolvedParams.id}`);
        if (!websiteRes.ok) {
          throw new Error('Failed to fetch website');
        }
        const websiteData = await websiteRes.json();
        setWebsite(websiteData);
        
        // Fetch pages
        const pagesRes = await fetch(`/api/websites/${resolvedParams.id}/pages`);
        if (!pagesRes.ok) {
          throw new Error('Failed to fetch pages');
        }
        const pagesData = await pagesRes.json();
        setPages(pagesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchWebsiteAndPages();
  }, [resolvedParams.id]);

  // Handle adding a new page
  const handleAddPage = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    
    try {
      // Validate inputs
      if (!newPageName.trim()) {
        throw new Error('Page name is required');
      }
      
      if (!newPagePath.trim()) {
        throw new Error('Page path is required');
      }
      
      // Create new page
      const res = await fetch(`/api/websites/${resolvedParams.id}/pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newPageName,
          path: newPagePath,
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create page');
      }
      
      const newPage = await res.json();
      
      // Update pages list
      setPages([newPage, ...pages]);
      
      // Reset form
      setNewPageName('');
      setNewPagePath('');
      setShowNewPageForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle deleting a page
  const handleDeletePage = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this page?')) {
      return;
    }
    
    try {
      const res = await fetch(`/api/websites/${resolvedParams.id}/pages/${pageId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        throw new Error('Failed to delete page');
      }
      
      // Remove page from list
      setPages(pages.filter(page => page.id !== pageId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/dashboard" className="text-blue-600 hover:underline mb-2 inline-block">
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold">{website?.name}</h1>
          <p className="text-gray-600">{website?.url}</p>
           <p className="text-gray-600">{website?.authToken ?? ''}</p>
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            onClick={() => setShowShareModal(true)}
          >
            Share Website
          </Button>
          <Button onClick={() => setShowNewPageForm(!showNewPageForm)}>
            {showNewPageForm ? 'Cancel' : 'Add New Page'}
          </Button>
        </div>
      </div>

      {/* New Page Form */}
      {showNewPageForm && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Add New Page</h2>
          <form onSubmit={handleAddPage}>
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Page Name
              </label>
              <Input
                id="name"
                type="text"
                value={newPageName}
                onChange={(e) => setNewPageName(e.target.value)}
                placeholder="Home Page"
                required
              />
            </div>
            <div className="mb-4">
              <label htmlFor="path" className="block text-sm font-medium text-gray-700 mb-1">
                Page Path
              </label>
              <Input
                id="path"
                type="text"
                value={newPagePath}
                onChange={(e) => setNewPagePath(e.target.value)}
                placeholder="/about"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Path relative to website URL (e.g., /about, /products)
              </p>
            </div>
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {formError}
              </div>
            )}
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Page'}
            </Button>
          </form>
        </div>
      )}

      {/* Pages List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">Pages</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage and compare pages for this website
          </p>
        </div>
        <div className="border-t border-gray-200">
          {pages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No pages added yet. Add your first page to start comparing.
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {pages.map((page) => (
                <li key={page.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{page.name}</h3>
                      <p className="text-sm text-gray-500">{page.path}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Link href={`/dashboard/websites/${resolvedParams.id}/pages/${page.id}`}>
                        <Button variant="outline">View Comparisons</Button>
                      </Link>
                      <Button
                        variant="danger"
                        onClick={() => handleDeletePage(page.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Share Website Modal */}
      {website && (
        <ShareWebsiteModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          websiteId={resolvedParams.id}
          websiteName={website.name}
        />
      )}
    </div>
  );
}