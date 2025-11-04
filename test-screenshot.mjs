// Test script to verify the new month-year screenshot folder functionality
import { takeScreenshot } from './src/lib/puppeteer.js';

async function testScreenshotFunctionality() {
  try {
    console.log('Testing takeScreenshot function with month-year folder structure...');
    console.log('Expected folder: oct-2025');
    
    // Test with a simple URL
    const testUrl = 'https://example.com';
    console.log(`Taking screenshot of: ${testUrl}`);
    
    const screenshotPath = await takeScreenshot(testUrl);
    console.log(`Screenshot saved to: ${screenshotPath}`);
    
    // Check if the path includes the month-year folder
    if (screenshotPath.includes('/oct-2025/')) {
      console.log('✅ SUCCESS: Screenshot was saved in the correct month-year folder!');
    } else {
      console.log('❌ FAILURE: Screenshot was not saved in the expected month-year folder.');
      console.log('Expected path to include: /oct-2025/');
      console.log('Actual path:', screenshotPath);
    }
    
  } catch (error) {
    console.error('❌ Error testing screenshot functionality:', error);
  }
}

testScreenshotFunctionality();