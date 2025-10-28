'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function NewWebsite() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    url: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Website name is required';
    }
    
    if (!formData.url.trim()) {
      newErrors.url = 'URL is required';
    } else {
      try {
        // Check if URL is valid
        new URL(formData.url);
      } catch (error) {
        newErrors.url = 'Please enter a valid URL (e.g., https://example.com)';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/websites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create website');
      }
      
      router.push(`/dashboard/websites/${data.id}`);
    } catch (error) {
      console.error('Error creating website:', error);
      setErrors((prev) => ({ 
        ...prev, 
        form: error instanceof Error ? error.message : 'Failed to create website' 
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <Link href="/dashboard" className="mr-4">
              <Button variant="ghost" size="sm">
                &larr; Back
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Add New Website</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <form onSubmit={handleSubmit}>
                {errors.form && (
                  <div className="rounded-md bg-red-50 p-4 mb-6">
                    <div className="text-sm text-red-700">{errors.form}</div>
                  </div>
                )}
                
                <div className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Website Name
                    </label>
                    <div className="mt-1">
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleChange}
                        error={errors.name}
                        placeholder="My Website"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="url" className="block text-sm font-medium text-gray-700">
                      Website URL
                    </label>
                    <div className="mt-1">
                      <Input
                        id="url"
                        name="url"
                        type="text"
                        value={formData.url}
                        onChange={handleChange}
                        error={errors.url}
                        placeholder="https://example.com"
                      />
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      Include the full URL with http:// or https://
                    </p>
                  </div>
                  
                  <div className="flex justify-end">
                    <Link href="/dashboard">
                      <Button type="button" variant="outline" className="mr-3">
                        Cancel
                      </Button>
                    </Link>
                    <Button type="submit" isLoading={isLoading}>
                      Add Website
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}