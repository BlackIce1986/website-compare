import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createComparison } from '@/lib/puppeteer';
import { verifyWebsiteAccess } from '@/lib/website-access';

// POST /api/websites/[id]/pages/[pageId]/compare - Create a new comparison
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id: websiteId, pageId } = await params;
    
    // Verify website access
    const hasAccess = await verifyWebsiteAccess(websiteId, session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }
    
    // Check if page exists
    const page = await prisma.page.findFirst({
      where: {
        id: pageId,
        websiteId,
      },
    });
    
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }
    
    // Create a new comparison
    const result = await createComparison(pageId);
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating comparison:', error);
    return NextResponse.json(
      { error: 'Failed to create comparison' },
      { status: 500 }
    );
  }
}