// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import ComparisonModal from '@/components/ui/ComparisonModal';
import { use } from 'react';

interface Page {
  id: string;
  name: string;
  path: string;
  websiteId: string;
  comparisons: Comparison[];
}

interface Website {
  id: string;
  name: string;
  url: string;
}

interface Comparison {
  id: string;
  pageId: string;
  baselineScreenshot: string | null;
  currentScreenshot: string | null;
  diffScreenshot: string | null;
  diffPercentage: number | null;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

interface AvailableBaseline {
  id: string;
  screenshot: string;
  comparisonId: string;
  createdAt: string;
  type: 'baseline' | 'current';
  diffPercentage: number | null;
}

export default function PageDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string; pageId: string }> 
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [page, setPage] = useState<Page | null>(null);
  const [website, setWebsite] = useState<Website | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);
  const [showBaselineSelector, setShowBaselineSelector] = useState<string | null>(null);
  const [availableBaselines, setAvailableBaselines] = useState<AvailableBaseline[]>([]);
  const [loadingBaselines, setLoadingBaselines] = useState(false);
  const [settingBaseline, setSettingBaseline] = useState<string | null>(null);
  const [selectedComparison, setSelectedComparison] = useState<Comparison | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Fetch page and website details
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch website details
        const websiteRes = await fetch(`/api/websites/${resolvedParams.id}`);
        if (!websiteRes.ok) {
          throw new Error('Failed to fetch website');
        }
        const websiteData = await websiteRes.json();
        setWebsite(websiteData);
        
        // Fetch page details with comparisons
        const pageRes = await fetch(`/api/websites/${resolvedParams.id}/pages/${resolvedParams.pageId}`);
        if (!pageRes.ok) {
          throw new Error('Failed to fetch page');
        }
        const pageData = await pageRes.json();
        setPage(pageData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [resolvedParams.id, resolvedParams.pageId]);

  // Handle creating a new comparison
  const handleCreateComparison = async () => {
    setComparing(true);
    
    try {
      const res = await fetch(`/api/websites/${resolvedParams.id}/pages/${resolvedParams.pageId}/compare`, {
        method: 'POST',
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create comparison');
      }
      
      // Refresh page data to show new comparison
      const pageRes = await fetch(`/api/websites/${resolvedParams.id}/pages/${resolvedParams.pageId}`);
      if (!pageRes.ok) {
        throw new Error('Failed to fetch updated page data');
      }
      const pageData = await pageRes.json();
      setPage(pageData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setComparing(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Handle fetching available baselines
  const fetchAvailableBaselines = async (comparisonId: string) => {
    setLoadingBaselines(true);
    try {
      const res = await fetch(`/api/websites/${resolvedParams.id}/pages/${resolvedParams.pageId}/comparisons/${comparisonId}/available-baselines`);
      if (!res.ok) {
        throw new Error('Failed to fetch available baselines');
      }
      const data = await res.json();
      setAvailableBaselines(data.availableBaselines || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoadingBaselines(false);
    }
  };

  // Handle setting new baseline
  const handleSetBaseline = async (comparisonId: string, newBaselineScreenshot: string) => {
    const baselineId = `${comparisonId}-${newBaselineScreenshot}`;
    setSettingBaseline(baselineId);
    
    try {
      const res = await fetch(`/api/websites/${resolvedParams.id}/pages/${resolvedParams.pageId}/comparisons/${comparisonId}/set-baseline`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newBaselineScreenshot }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to set new baseline');
      }
      
      // Refresh page data to show updated comparison
      const pageRes = await fetch(`/api/websites/${resolvedParams.id}/pages/${resolvedParams.pageId}`);
      if (!pageRes.ok) {
        throw new Error('Failed to fetch updated page data');
      }
      const pageData = await pageRes.json();
      setPage(pageData);
      
      // Close the baseline selector
      setShowBaselineSelector(null);
      setAvailableBaselines([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSettingBaseline(null);
    }
  };

  // Handle opening baseline selector
  const handleOpenBaselineSelector = (comparisonId: string) => {
    setShowBaselineSelector(comparisonId);
    fetchAvailableBaselines(comparisonId);
  };

  // Handle opening comparison modal
  const handleOpenModal = (comparison: Comparison) => {
    setSelectedComparison(comparison);
    setShowModal(true);
  };

  // Handle closing comparison modal
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedComparison(null);
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
          <Button onClick={() => router.push(`/dashboard/websites/${resolvedParams.id}`)} className="mt-4">
            Back to Website
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Link href={`/dashboard/websites/${resolvedParams.id}`} className="text-blue-600 hover:underline mb-2 inline-block">
          &larr; Back to {website?.name}
        </Link>
        <h1 className="text-2xl font-bold">{page?.name}</h1>
        <p className="text-gray-600">
          {website?.url}{page?.path}
        </p>
      </div>

      <div className="mb-6">
        <Button 
          onClick={handleCreateComparison} 
          disabled={comparing}
          className="w-full md:w-auto"
        >
          {comparing ? 'Taking Screenshot...' : 'Take New Screenshot & Compare'}
        </Button>
      </div>

      {/* Comparisons List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">Comparison History</h2>
          <p className="mt-1 text-sm text-gray-500">
            View historical comparisons for this page
          </p>
        </div>
        <div className="border-t border-gray-200">
          {!page?.comparisons || page.comparisons.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No comparisons yet. Take your first screenshot to get started.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {page.comparisons.map((comparison) => (
                <div key={comparison.id} className="p-4 sm:p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Comparison from {formatDate(comparison.createdAt)}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Status: {comparison.status.charAt(0).toUpperCase() + comparison.status.slice(1)}
                      {comparison.diffPercentage !== null && (
                        <span className="ml-2">
                          Difference: {comparison.diffPercentage.toFixed(2)}%
                        </span>
                      )}
                    </p>
                  </div>

                  {comparison.status === 'completed' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Baseline Screenshot */}
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
                          <h4 className="font-medium">Baseline</h4>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenBaselineSelector(comparison.id)}
                            className="text-xs"
                          >
                            Change Baseline
                          </Button>
                        </div>
                        <div className="p-2">
                          {comparison.baselineScreenshot ? (
                            <div 
                              className="relative h-[300px] cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => handleOpenModal(comparison)}
                            >
                              <Image
                                src={comparison.baselineScreenshot}
                                alt="Baseline Screenshot"
                                fill
                                style={{ objectFit: 'contain' }}
                              />
                            </div>
                          ) : (
                            <div className="h-[300px] flex items-center justify-center text-gray-500">
                              No baseline screenshot
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Current Screenshot */}
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 border-b">
                          <h4 className="font-medium">Current</h4>
                        </div>
                        <div className="p-2">
                          {comparison.currentScreenshot ? (
                            <div 
                              className="relative h-[300px] cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => handleOpenModal(comparison)}
                            >
                              <Image
                                src={comparison.currentScreenshot}
                                alt="Current Screenshot"
                                fill
                                style={{ objectFit: 'contain' }}
                              />
                            </div>
                          ) : (
                            <div className="h-[300px] flex items-center justify-center text-gray-500">
                              No current screenshot
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Diff Screenshot */}
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 border-b">
                          <h4 className="font-medium">Difference</h4>
                        </div>
                        <div className="p-2">
                          {comparison.diffScreenshot ? (
                            <div 
                              className="relative h-[300px] cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => handleOpenModal(comparison)}
                            >
                              <Image
                                src={comparison.diffScreenshot}
                                alt="Difference Visualization"
                                fill
                                style={{ objectFit: 'contain' }}
                              />
                            </div>
                          ) : (
                            <div className="h-[300px] flex items-center justify-center text-gray-500">
                              {comparison.baselineScreenshot === comparison.currentScreenshot
                                ? "First comparison (no diff available)"
                                : "No difference visualization"}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Baseline Selector Modal */}
                  {showBaselineSelector === comparison.id && (
                    <div className="mt-4 p-4 bg-gray-50 border rounded-lg">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-medium text-gray-900">Select New Baseline</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowBaselineSelector(null);
                            setAvailableBaselines([]);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                      
                      {loadingBaselines ? (
                        <div className="text-center py-4 text-gray-500">
                          Loading available baselines...
                        </div>
                      ) : availableBaselines.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                          No other screenshots available as baselines.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {availableBaselines.map((baseline) => (
                            <div key={baseline.id} className="border rounded-lg overflow-hidden bg-white">
                              <div className="p-2">
                                <div className="relative h-[200px] mb-2">
                                  <Image
                                    src={baseline.screenshot}
                                    alt={`${baseline.type} screenshot from ${formatDate(baseline.createdAt)}`}
                                    fill
                                    style={{ objectFit: 'contain' }}
                                  />
                                </div>
                                <div className="text-xs text-gray-600 mb-2">
                                  <div>Type: {baseline.type}</div>
                                  <div>Date: {formatDate(baseline.createdAt)}</div>
                                  {baseline.diffPercentage !== null && (
                                    <div>Diff: {baseline.diffPercentage.toFixed(2)}%</div>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => handleSetBaseline(comparison.id, baseline.screenshot)}
                                  className="w-full"
                                  isLoading={settingBaseline === `${comparison.id}-${baseline.screenshot}`}
                                  disabled={settingBaseline !== null}
                                >
                                  {settingBaseline === `${comparison.id}-${baseline.screenshot}` 
                                    ? 'Setting Baseline...' 
                                    : 'Use as Baseline'
                                  }
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {comparison.status === 'pending' && (
                    <div className="text-center py-8 text-gray-500">
                      Comparison in progress...
                    </div>
                  )}

                  {comparison.status === 'failed' && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                      Comparison failed. Please try again.
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Comparison Modal */}
      {selectedComparison && (
        <ComparisonModal
          isOpen={showModal}
          onClose={handleCloseModal}
          comparison={selectedComparison}
          pageInfo={{
            name: page?.name || '',
            path: page?.path || '',
            websiteName: website?.name || '',
            websiteUrl: website?.url || ''
          }}
        />
      )}
    </div>
  );
}