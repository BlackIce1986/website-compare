import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyWebsiteAccess } from '@/lib/website-access';

// GET /api/websites/[id]/pages - Get all pages for a website
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = await params;
    const websiteId = id;
    
    // Verify website access
    const hasAccess = await verifyWebsiteAccess(websiteId, session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
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
    
    return NextResponse.json(pages);
  } catch (error) {
    console.error('Error fetching pages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pages' },
      { status: 500 }
    );
  }
}

// POST /api/websites/[id]/pages - Create a new page for a website
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = await params;
    const websiteId = id;
    
    // Verify website access
    const hasAccess = await verifyWebsiteAccess(websiteId, session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }
    
    // Get request body
    const { name, path } = await request.json();
    
    // Validate input
    if (!name || !path) {
      return NextResponse.json(
        { error: 'Name and path are required' },
        { status: 400 }
      );
    }
    
    // Create the page
    const page = await prisma.page.create({
      data: {
        name,
        path,
        websiteId,
      },
    });
    
    return NextResponse.json(page, { status: 201 });
  } catch (error) {
    console.error('Error creating page:', error);
    return NextResponse.json(
      { error: 'Failed to create page' },
      { status: 500 }
    );
  }
}