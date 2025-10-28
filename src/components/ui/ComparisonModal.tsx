'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from './Button';

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  comparison: {
    id: string;
    baselineScreenshot: string | null;
    currentScreenshot: string | null;
    diffScreenshot: string | null;
    diffPercentage: number | null;
    createdAt: string;
  };
  pageInfo: {
    name: string;
    path: string;
    websiteName: string;
    websiteUrl: string;
  };
}

type ViewMode = 'side-by-side' | 'overlay' | 'diff-only';

export default function ComparisonModal({ 
  isOpen, 
  onClose, 
  comparison, 
  pageInfo 
}: ComparisonModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('overlay');
  const [showDiffOverlay, setShowDiffOverlay] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 25, 50));
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-75"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full h-full max-w-none max-h-none bg-white flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Comparison Details
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {pageInfo.websiteName} - {pageInfo.name}
              </p>
              <p className="text-xs text-gray-500">
                {pageInfo.websiteUrl}{pageInfo.path} • {formatDate(comparison.createdAt)}
                {comparison.diffPercentage !== null && (
                  <span className="ml-2">
                    • Difference: {comparison.diffPercentage.toFixed(2)}%
                  </span>
                )}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕ Close
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* View Mode Toggle */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">View:</span>
                <div className="flex rounded-md shadow-sm">
                  <button
                    onClick={() => setViewMode('side-by-side')}
                    className={`px-3 py-1 text-xs font-medium rounded-l-md border ${
                      viewMode === 'side-by-side'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Side by Side
                  </button>
                  <button
                    onClick={() => setViewMode('overlay')}
                    className={`px-3 py-1 text-xs font-medium border-t border-b ${
                      viewMode === 'overlay'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Overlay
                  </button>
                  <button
                    onClick={() => setViewMode('diff-only')}
                    className={`px-3 py-1 text-xs font-medium rounded-r-md border ${
                      viewMode === 'diff-only'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Diff Only
                  </button>
                </div>
              </div>

              {/* Diff Overlay Toggle (only for overlay mode) */}
              {viewMode === 'overlay' && comparison.diffScreenshot && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">Diff Overlay:</span>
                  <button
                    onClick={() => setShowDiffOverlay(!showDiffOverlay)}
                    className={`px-3 py-1 text-xs font-medium rounded-md border ${
                      showDiffOverlay
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {showDiffOverlay ? 'Hide Diff' : 'Show Diff'}
                  </button>
                </div>
              )}
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Zoom:</span>
              <button
                onClick={handleZoomOut}
                className="px-2 py-1 text-xs font-medium bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
              >
                −
              </button>
              <span className="text-sm text-gray-600 min-w-[3rem] text-center">
                {zoomLevel}%
              </span>
              <button
                onClick={handleZoomIn}
                className="px-2 py-1 text-xs font-medium bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
              >
                +
              </button>
              <button
                onClick={handleResetZoom}
                className="px-2 py-1 text-xs font-medium bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-gray-100">
          <div className="p-6">
            {viewMode === 'side-by-side' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Baseline */}
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="bg-gray-50 px-4 py-2 border-b">
                    <h3 className="font-medium text-gray-900">Baseline</h3>
                  </div>
                  <div className="p-4">
                    {comparison.baselineScreenshot ? (
                      <div className="relative">
                        <Image
                          src={comparison.baselineScreenshot}
                          alt="Baseline Screenshot"
                          width={1280}
                          height={800}
                          style={{ 
                            width: `${zoomLevel}%`,
                            height: 'auto',
                            maxWidth: 'none'
                          }}
                          className="border border-gray-200"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-gray-500">
                        No baseline screenshot
                      </div>
                    )}
                  </div>
                </div>

                {/* Current */}
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="bg-gray-50 px-4 py-2 border-b">
                    <h3 className="font-medium text-gray-900">Current</h3>
                  </div>
                  <div className="p-4">
                    {comparison.currentScreenshot ? (
                      <div className="relative">
                        <Image
                          src={comparison.currentScreenshot}
                          alt="Current Screenshot"
                          width={1280}
                          height={800}
                          style={{ 
                            width: `${zoomLevel}%`,
                            height: 'auto',
                            maxWidth: 'none'
                          }}
                          className="border border-gray-200"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-gray-500">
                        No current screenshot
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {viewMode === 'overlay' && (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <h3 className="font-medium text-gray-900">
                    Overlay View {showDiffOverlay && comparison.diffScreenshot ? '(with diff overlay)' : ''}
                  </h3>
                </div>
                <div className="p-4">
                  {comparison.currentScreenshot ? (
                    <div className="relative inline-block">
                      {/* Base image (current) */}
                      <Image
                        src={comparison.currentScreenshot}
                        alt="Current Screenshot"
                        width={1280}
                        height={800}
                        style={{ 
                          width: `${zoomLevel}%`,
                          height: 'auto',
                          maxWidth: 'none'
                        }}
                        className="border border-gray-200"
                      />
                      
                      {/* Diff overlay */}
                      {showDiffOverlay && comparison.diffScreenshot && (
                        <div className="absolute inset-0">
                          <Image
                            src={comparison.diffScreenshot}
                            alt="Difference Overlay"
                            width={1280}
                            height={800}
                            style={{ 
                              width: `${zoomLevel}%`,
                              height: 'auto',
                              maxWidth: 'none',
                              opacity: 0.7,
                              mixBlendMode: 'multiply'
                            }}
                            className="border border-gray-200"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                      No screenshot available
                    </div>
                  )}
                </div>
              </div>
            )}

            {viewMode === 'diff-only' && (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <h3 className="font-medium text-gray-900">Difference Visualization</h3>
                </div>
                <div className="p-4">
                  {comparison.diffScreenshot ? (
                    <div className="relative">
                      <Image
                        src={comparison.diffScreenshot}
                        alt="Difference Visualization"
                        width={1280}
                        height={800}
                        style={{ 
                          width: `${zoomLevel}%`,
                          height: 'auto',
                          maxWidth: 'none'
                        }}
                        className="border border-gray-200"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                      {comparison.baselineScreenshot === comparison.currentScreenshot
                        ? "First comparison (no diff available)"
                        : "No difference visualization available"}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}