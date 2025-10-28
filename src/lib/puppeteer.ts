import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { prisma } from './prisma';
import { ComparisonStatus } from './types';
import { emailService } from './email-service';

// Add type declaration for pngjs
declare module 'pngjs' {
  export namespace PNG {
    namespace sync {
      function read(buffer: Buffer): PNG;
      function write(png: PNG): Buffer;
    }
  }
  export class PNG {
    constructor(options?: { width: number; height: number });
    width: number;
    height: number;
    data: Buffer;
  }
}

// Ensure screenshots directory exists
const SCREENSHOTS_DIR = path.join(process.cwd(), 'public', 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Generate a unique filename based on URL and timestamp
const generateFilename = (url: string): string => {
  const hash = createHash('md5').update(url).digest('hex');
  const timestamp = Date.now();
  return `${hash}-${timestamp}.png`;
};

// Take a screenshot of a webpage
export async function takeScreenshot(url: string): Promise<string> {
  const browser = await puppeteer.launch({
    headless: true, // Use boolean instead of 'new'
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport size for consistent screenshots
    await page.setViewport({ width: 1280, height: 800 });
    
    // Navigate to the URL
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Generate filename and path
    const filename = generateFilename(url);
    const screenshotPath = path.join(SCREENSHOTS_DIR, filename);
    
    // Take screenshot with fixed dimensions for consistent comparison
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: true // Take screenshot of the entire page
    });
    // Return the relative path for storage in the database
    return `/screenshots/${filename}`;
  } catch (error) {
    console.error('Error taking screenshot:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Compare two screenshots and generate a diff image
export async function compareScreenshots(
  baselineScreenshot: string,
  currentScreenshot: string
): Promise<{ diffPath: string; diffPercentage: number }> {
  const { default: pixelmatch } = await import('pixelmatch');
  const { PNG } = await import('pngjs');
  
  // Read the images
  const baselinePath = path.join(process.cwd(), 'public', baselineScreenshot);
  const currentPath = path.join(process.cwd(), 'public', currentScreenshot);
  
  // Check if files exist before reading
  if (!fs.existsSync(baselinePath)) {
    throw new Error(`Baseline screenshot not found: ${baselinePath}`);
  }
  
  if (!fs.existsSync(currentPath)) {
    throw new Error(`Current screenshot not found: ${currentPath}`);
  }
  
  const baselineData = fs.readFileSync(baselinePath);
  const currentData = fs.readFileSync(currentPath);
  
  // Validate that we have data
  if (!baselineData || baselineData.length === 0) {
    throw new Error(`Baseline screenshot is empty or corrupted: ${baselinePath}`);
  }
  
  if (!currentData || currentData.length === 0) {
    throw new Error(`Current screenshot is empty or corrupted: ${currentPath}`);
  }
  
  const baselineImg = PNG.sync.read(baselineData);
  const currentImg = PNG.sync.read(currentData);
  
  // Handle different image sizes by using the larger dimensions
  const width = Math.max(baselineImg.width, currentImg.width);
  const height = Math.max(baselineImg.height, currentImg.height);
  
  // Create normalized images with the same dimensions
  const normalizedBaseline = new PNG({ width, height });
  const normalizedCurrent = new PNG({ width, height });
  
  // Fill with white background (255, 255, 255, 255 for RGBA)
  normalizedBaseline.data.fill(255);
  normalizedCurrent.data.fill(255);
  
  // Copy baseline image data
  for (let y = 0; y < baselineImg.height; y++) {
    for (let x = 0; x < baselineImg.width; x++) {
      const srcIdx = (baselineImg.width * y + x) << 2;
      const dstIdx = (width * y + x) << 2;
      normalizedBaseline.data[dstIdx] = baselineImg.data[srcIdx];     // R
      normalizedBaseline.data[dstIdx + 1] = baselineImg.data[srcIdx + 1]; // G
      normalizedBaseline.data[dstIdx + 2] = baselineImg.data[srcIdx + 2]; // B
      normalizedBaseline.data[dstIdx + 3] = baselineImg.data[srcIdx + 3]; // A
    }
  }
  
  // Copy current image data
  for (let y = 0; y < currentImg.height; y++) {
    for (let x = 0; x < currentImg.width; x++) {
      const srcIdx = (currentImg.width * y + x) << 2;
      const dstIdx = (width * y + x) << 2;
      normalizedCurrent.data[dstIdx] = currentImg.data[srcIdx];     // R
      normalizedCurrent.data[dstIdx + 1] = currentImg.data[srcIdx + 1]; // G
      normalizedCurrent.data[dstIdx + 2] = currentImg.data[srcIdx + 2]; // B
      normalizedCurrent.data[dstIdx + 3] = currentImg.data[srcIdx + 3]; // A
    }
  }
  
  // Create a new PNG for the diff
  const diffImg = new PNG({ width, height });
  
  // Compare the images
  const numDiffPixels = pixelmatch(
    normalizedBaseline.data,
    normalizedCurrent.data,
    diffImg.data,
    width,
    height,
    { threshold: 0.1 }
  );
  
  // Calculate the percentage difference
  const diffPercentage = (numDiffPixels / (width * height)) * 100;
  
  // Generate a filename for the diff image
  const timestamp = Date.now();
  const diffFilename = `diff-${timestamp}.png`;
  const diffPath = path.join(SCREENSHOTS_DIR, diffFilename);
  
  // Write the diff image to disk
  fs.writeFileSync(diffPath, PNG.sync.write(diffImg));
  
  return {
    diffPath: `/screenshots/${diffFilename}`,
    diffPercentage,
  };
}

// Create a new comparison for a page
export async function createComparison(pageId: string): Promise<any> {
  let comparison: any = null;
  
  try {
    // Get the page and its associated website
    const page = await prisma.page.findUnique({
      where: { id: pageId },
      include: { website: true },
    });
    
    if (!page) {
      throw new Error('Page not found');
    }
    
    // Construct the full URL
    const url = new URL(page.path, page.website.url).toString();
    
    // Create a new comparison record
    comparison = await prisma.comparison.create({
      data: {
        pageId,
        status: 'pending',
      },
    });
    
    // Take a screenshot
    const screenshotPath = await takeScreenshot(url);
    
    // Check if this is the first comparison for this page
    const previousComparisons = await prisma.comparison.findMany({
      where: {
        pageId,
        id: { not: comparison.id },
        baselineScreenshot: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    
    if (previousComparisons.length === 0) {
      // This is the first comparison, so just save the screenshot as baseline
      await prisma.comparison.update({
        where: { id: comparison.id },
        data: {
          baselineScreenshot: screenshotPath,
          currentScreenshot: screenshotPath,
          status: ComparisonStatus.COMPLETED,
        },
      });
      
      return {
        id: comparison.id,
        status: ComparisonStatus.COMPLETED,
        isFirstComparison: true,
      };
    } else {
      // Compare with the previous baseline
      const previousComparison = previousComparisons[0];
      
      // Check if baseline screenshot has different dimensions (from old fullPage screenshots)
      // If so, retake the baseline with new dimensions
      let baselineScreenshot = previousComparison.baselineScreenshot!;
      
      try {
        // Try to read the baseline image to check its dimensions
        const baselinePath = path.join(process.cwd(), 'public', baselineScreenshot);
        if (fs.existsSync(baselinePath)) {
          const { PNG } = await import('pngjs');
          const baselineData = fs.readFileSync(baselinePath);
          const baselineImg = PNG.sync.read(baselineData);
          
          // If baseline has different dimensions, retake it
          if (baselineImg.width !== 1280 || baselineImg.height !== 800) {
            console.log(`Baseline screenshot has old dimensions (${baselineImg.width}x${baselineImg.height}), retaking with new dimensions...`);
            
            // Delete the old baseline file
            fs.unlinkSync(baselinePath);
            
            // Take a new screenshot with correct dimensions
            baselineScreenshot = await takeScreenshot(url);
            
            // Update the previous comparison's baseline
            await prisma.comparison.update({
              where: { id: previousComparison.id },
              data: { baselineScreenshot },
            });
          }
        }
      } catch (error) {
        console.log('Error checking baseline dimensions, retaking screenshot:', error);
        baselineScreenshot = await takeScreenshot(url);
      }
      
      const { diffPath, diffPercentage } = await compareScreenshots(
        baselineScreenshot,
        screenshotPath
      );
      
      // Update the comparison with results
      await prisma.comparison.update({
        where: { id: comparison.id },
        data: {
          baselineScreenshot: baselineScreenshot,
          currentScreenshot: screenshotPath,
          diffScreenshot: diffPath,
          diffPercentage,
          status: ComparisonStatus.COMPLETED,
        },
      });
      
      return {
        id: comparison.id,
        status: ComparisonStatus.COMPLETED,
        diffPercentage,
        isFirstComparison: false,
      };
    }
  } catch (error) {
    console.error('Error creating comparison:', error);
    
    // Update the comparison status to failed (only if comparison was created)
    if (comparison && comparison.id) {
      try {
        await prisma.comparison.update({
          where: { id: comparison.id },
          data: {
            status: 'failed',
          },
        });

        // Send email notification for failed comparison
        try {
          const page = await prisma.page.findUnique({
            where: { id: pageId },
            include: { 
              website: { 
                include: { 
                  shares: { 
                    where: { permission: 'EDIT' },
                    include: { user: true }
                  },
                  user: true
                } 
              } 
            },
          });

          if (page) {
            // Collect recipients (website owner + users with edit permission)
            const recipients = [];
            
            // Add website owner
            if (page.website.user.email) {
              recipients.push({
                email: page.website.user.email,
                name: page.website.user.name || undefined
              });
            }

            // Add users with edit permission
            page.website.shares.forEach(share => {
              if (share.user.email) {
                recipients.push({
                  email: share.user.email,
                  name: share.user.name || undefined
                });
              }
            });

            if (recipients.length > 0) {
               const fullUrl = new URL(page.path, page.website.url).toString();
               await emailService.sendComparisonFailureNotification(recipients, {
                 pageName: page.name,
                 pagePath: page.path,
                 pageUrl: fullUrl,
                 websiteName: page.website.name,
                 websiteUrl: page.website.url,
                 errorMessage: error instanceof Error ? error.message : 'Unknown error',
                 timestamp: new Date()
               });
             }
          }
        } catch (emailError) {
          console.error('Error sending failure notification email:', emailError);
          // Don't throw here - we don't want email failures to affect the main flow
        }
      } catch (updateError) {
        console.error('Error updating comparison status to failed:', updateError);
      }
    }
    
    throw error;
  }
}