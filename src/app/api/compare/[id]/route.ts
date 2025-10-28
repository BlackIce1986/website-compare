import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createComparison } from '@/lib/puppeteer';
import { emailService, EmailRecipient } from '@/lib/email-service';

// POST /api/websites/[id]/compare-all - Create comparisons for all pages of a website
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    //check for json validity
    if (!body?.authToken) {
      return NextResponse.json({ error: 'Missing authToken' }, { status: 400 });
    }

    const authToken = body?.authToken ?? '';
    // if (!session?.user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    
    const { id: websiteId } = await params;
    
    // // Verify website access
    // const hasAccess = await verifyWebsiteAccess(websiteId, session.user.id);
    // if (!hasAccess) {
    //   return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    // }
    const websiteAuthToken = (await prisma.website.findFirst({
      where: {
        id: websiteId
      }
    }))?.authToken;
    console.log(websiteId, websiteAuthToken, authToken);
    if (websiteAuthToken !== authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get all pages for the website
    const pages = await prisma.page.findMany({
      where: {
        websiteId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    if (pages.length === 0) {
      return NextResponse.json({ 
        error: 'No pages found for this website',
        results: []
      }, { status: 404 });
    }
    
    // Create comparisons for all pages
    const results = [];
    const errors = [];
    
    // Get website details for email notifications
    const website = await prisma.website.findUnique({
      where: { id: websiteId },
      include: {
        shares: {
          where: { permission: 'EDIT' },
          include: { user: true }
        },
        user: true
      }
    });
    
    //run code async in separate process and return json response before finishing
    (async () => {
      for (const page of pages) {
        try {
          const result = await createComparison(page.id);
          results.push({
            pageId: page.id,
            pageName: page.name,
            pagePath: page.path,
            success: true,
            comparison: result,
          });
        } catch (error) {
          console.error(`Error creating comparison for page ${page.id}:`, error);
          errors.push({
            pageId: page.id,
            pageName: page.name,
            pagePath: page.path,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Send bulk failure notification if there were any errors
      if (errors.length > 0 && website) {
        try {
          // Collect recipients (website owner + users with edit permission)
          const recipients: EmailRecipient[] = [];
          
          // Add website owner
          if (website.user.email) {
            recipients.push({
              email: website.user.email,
              name: website.user.name || undefined
            });
          }

          // Add users with edit permission
          website.shares.forEach((share: { user: { email: string; name: string | null } }) => {
            if (share.user.email) {
              recipients.push({
                email: share.user.email,
                name: share.user.name || undefined
              });
            }
          });

          if (recipients.length > 0) {
            await emailService.sendBulkComparisonFailureNotification(recipients, {
              websiteName: website.name,
              websiteUrl: website.url,
              totalPages: pages.length,
              failedPages: errors.map(error => ({
                pageName: error.pageName,
                pagePath: error.pagePath,
                errorMessage: error.error
              })),
              successfulPages: results.length,
              timestamp: new Date()
            });
          }
        } catch (emailError) {
          console.error('Error sending bulk failure notification email:', emailError);
          // Don't throw here - we don't want email failures to affect the main flow
        }
      }
    })();
    
    
    return NextResponse.json({
      message: `Processing ${pages.length} pages`,
    });
    
  } catch (error) {
    console.error('Error in bulk comparison:', error);
    return NextResponse.json(
      { error: 'Failed to create bulk comparisons' },
      { status: 500 }
    );
  }
}