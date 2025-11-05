import puppeteer from 'puppeteer';
import type { Page } from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import process from 'node:process';
import { prisma } from './prisma';
import { ComparisonStatus } from './types';
import { emailService } from './email-service';

// Base screenshots directory (override via env SCREENSHOTS_DIR, default to public/screenshots)
const SCREENSHOTS_DIR = process.env.SCREENSHOTS_DIR
  ? path.resolve(process.env.SCREENSHOTS_DIR)
  : path.join(process.cwd(), 'public', 'screenshots');

// Ensure a directory exists and is writable; try to relax permissions if needed
const ensureDirWritable = (dir: string): void => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o777 });
    }
  } catch (e) {
    // Bubble up directory creation errors
    throw e;
  }
  try {
    fs.accessSync(dir, fs.constants.W_OK);
  } catch (_) {
    try {
      fs.chmodSync(dir, 0o777);
      fs.accessSync(dir, fs.constants.W_OK);
    } catch (err) {
      const msg = `Screenshots directory not writable: ${dir}. If running in Docker, ensure the mapped volume ownership/permissions allow writes (e.g., chown to the app user or relax to 0777 for development).`;
      const error = new Error(msg);
      // Attach original error for context
      (error as any).cause = err;
      throw error;
    }
  }
};

// Ensure base screenshots directory exists and is writable
ensureDirWritable(SCREENSHOTS_DIR);

// Simple retry helper for flaky operations (e.g., newPage, goto)
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 2,
  delayMs = 2000
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i === attempts) break;
      await sleep(delayMs);
    }
  }
  throw lastError;
}

// Resolve a usable Chromium executable path inside Docker/Alpine
function resolveChromiumPath(): string | undefined {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chrome',
  ].filter(Boolean) as string[];
  for (const p of candidates) {
    try {
      fs.accessSync(p, fs.constants.X_OK);
      return p;
    } catch (_) {
      // continue
    }
  }
  return undefined;
}

// Generate month-year folder name (e.g., 'jan-2024')
const generateMonthYearFolder = (date: Date = new Date()): string => {
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 
                  'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${month}-${year}`;
};

// Ensure month-year subfolder exists
const ensureMonthYearFolder = (monthYear: string): string => {
  const monthYearDir = path.join(SCREENSHOTS_DIR, monthYear);
  ensureDirWritable(monthYearDir);
  return monthYearDir;
};

// Generate a unique filename based on URL and timestamp
const generateFilename = (url: string): string => {
  const hash = createHash('md5').update(url).digest('hex');
  const timestamp = Date.now();
  return `${hash}-${timestamp}.png`;
};

// Take a screenshot of a webpage
export async function takeScreenshot(url: string): Promise<string> {
  const executablePath = resolveChromiumPath();
  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    userDataDir: '/tmp/puppeteer',
    // Increase protocol timeout to avoid Network.enable timeouts in containers
    protocolTimeout: 120_000,
    timeout: 90_000,
    // Docker/Alpine-friendly flags (avoid single-process/no-zygote which can cause crashes)
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });
  
  try {
    const page: Page = await withRetry<Page>(() => browser.newPage(), 2, 3000);
    page.setDefaultNavigationTimeout(120_000);
    page.setDefaultTimeout(120_000);
    
    // Set viewport size for consistent screenshots
    await page.setViewport({ width: 1280, height: 800 });
    
    // Navigate to the URL
    await withRetry(
      () => page.goto(url, { waitUntil: 'networkidle2', timeout: 90_000 }),
      1,
      2000
    );
    
    // Generate month-year folder and ensure it exists
    const monthYear = generateMonthYearFolder();
    const monthYearDir = ensureMonthYearFolder(monthYear);
    
    // Generate filename and path
    const filename = generateFilename(url);
    const screenshotPath = path.join(monthYearDir, filename);
    
    // Take screenshot with fixed dimensions for consistent comparison
    await page.screenshot({
      path: screenshotPath as `${string}.png`,
      fullPage: true
    });
    // Return the relative path for storage in the database
    return `/screenshots/${monthYear}/${filename}`;
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
  const baselineRel = baselineScreenshot.replace(/^\/+/, '');
  const currentRel = currentScreenshot.replace(/^\/+/, '');
  const baselinePath = path.resolve(process.cwd(), 'public', baselineRel);
  const currentPath = path.resolve(process.cwd(), 'public', currentRel);
  
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
  
  // Generate month-year folder and ensure it exists for diff image
  const monthYear = generateMonthYearFolder();
  const monthYearDir = ensureMonthYearFolder(monthYear);
  const diffPath = path.join(monthYearDir, diffFilename);
  
  // Write the diff image to disk
  fs.writeFileSync(diffPath, PNG.sync.write(diffImg));
  
  return {
    diffPath: `/screenshots/${monthYear}/${diffFilename}`,
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
            page.website.shares.forEach((share: { user: { email: string; name: string | null } })  => {
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