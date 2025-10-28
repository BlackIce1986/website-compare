import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyWebsiteAccess } from '@/lib/website-access';

// GET /api/websites/[id]/pages/[pageId] - Get a specific page
export async function GET(
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
    
    // Get the page
    const page = await prisma.page.findFirst({
      where: {
        id: pageId,
        websiteId,
      },
      include: {
        comparisons: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
      },
    });
    
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }
    
    return NextResponse.json(page);
  } catch (error) {
    console.error('Error fetching page:', error);
    return NextResponse.json(
      { error: 'Failed to fetch page' },
      { status: 500 }
    );
  }
}

// PUT /api/websites/[id]/pages/[pageId] - Update a page
export async function PUT(
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
    const existingPage = await prisma.page.findFirst({
      where: {
        id: pageId,
        websiteId,
      },
    });
    
    if (!existingPage) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }
    
    // Get request body
    const { name, path } = await request.json();
    
    // Validate input
    if (!name && !path) {
      return NextResponse.json(
        { error: 'At least one field to update is required' },
        { status: 400 }
      );
    }
    
    // Update the page
    const updatedPage = await prisma.page.update({
      where: {
        id: pageId,
      },
      data: {
        ...(name && { name }),
        ...(path && { path }),
      },
    });
    
    return NextResponse.json(updatedPage);
  } catch (error) {
    console.error('Error updating page:', error);
    return NextResponse.json(
      { error: 'Failed to update page' },
      { status: 500 }
    );
  }
}

// DELETE /api/websites/[id]/pages/[pageId] - Delete a page
export async function DELETE(
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
    const existingPage = await prisma.page.findFirst({
      where: {
        id: pageId,
        websiteId,
      },
    });
    
    if (!existingPage) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }
    
    // Delete the page and its associated comparisons
    await prisma.$transaction([
      prisma.comparison.deleteMany({
        where: {
          pageId,
        },
      }),
      prisma.page.delete({
        where: {
          id: pageId,
        },
      }),
    ]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting page:', error);
    return NextResponse.json(
      { error: 'Failed to delete page' },
      { status: 500 }
    );
  }
}