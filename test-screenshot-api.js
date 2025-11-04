// Test script to verify the new month-year screenshot folder functionality
const fetch = require('node-fetch');

async function testScreenshotAPI() {
  try {
    console.log('Testing screenshot API with month-year folder structure...');
    
    // First, let's try to create a website and page to test with
    const websiteResponse = await fetch('http://localhost:3000/api/websites', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Website',
        url: 'https://example.com'
      })
    });
    
    if (!websiteResponse.ok) {
      console.log('Website creation response:', websiteResponse.status);
      const text = await websiteResponse.text();
      console.log('Response text:', text);
      return;
    }
    
    const website = await websiteResponse.json();
    console.log('Created website:', website);
    
    // Create a page for this website
    const pageResponse = await fetch(`http://localhost:3000/api/websites/${website.id}/pages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Home Page',
        path: '/'
      })
    });
    
    if (!pageResponse.ok) {
      console.log('Page creation response:', pageResponse.status);
      const text = await pageResponse.text();
      console.log('Response text:', text);
      return;
    }
    
    const page = await pageResponse.json();
    console.log('Created page:', page);
    
    // Now trigger a comparison which should create screenshots
    const comparisonResponse = await fetch(`http://localhost:3000/api/websites/${website.id}/pages/${page.id}/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Add any required parameters for comparison
      })
    });
    
    if (!comparisonResponse.ok) {
      console.log('Comparison response:', comparisonResponse.status);
      const text = await comparisonResponse.text();
      console.log('Response text:', text);
      return;
    }
    
    const comparison = await comparisonResponse.json();
    console.log('Created comparison:', comparison);
    console.log('Screenshot should be saved in month-year folder!');
    
  } catch (error) {
    console.error('Error testing screenshot API:', error);
  }
}

testScreenshotAPI();