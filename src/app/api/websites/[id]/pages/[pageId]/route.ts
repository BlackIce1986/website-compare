import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
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
    const { name, path, minDeviation, preScreenshotEvents } = await request.json();
    
    // Validate input
    if (!name && !path && (minDeviation === undefined || minDeviation === null) && typeof preScreenshotEvents === 'undefined') {
      return NextResponse.json(
        { error: 'At least one field to update is required' },
        { status: 400 }
      );
    }

    // Validate minDeviation if provided
    let minDeviationDecimal: Prisma.Decimal | undefined;
    if (minDeviation !== undefined && minDeviation !== null) {
      const numeric = typeof minDeviation === 'string' ? Number(minDeviation) : minDeviation;
      if (Number.isNaN(numeric)) {
        return NextResponse.json(
          { error: 'minDeviation must be a number' },
          { status: 400 }
        );
      }
      if (numeric < 0) {
        return NextResponse.json(
          { error: 'minDeviation must be >= 0' },
          { status: 400 }
        );
      }
      minDeviationDecimal = new Prisma.Decimal(numeric);
    }

    // Validate preScreenshotEvents if provided (must be an array of event objects)
    let eventsJson: Prisma.JsonValue | undefined;
    const allowedEventTypes = new Set(['hover', 'click', 'waitForSelector', 'waitForTimeout', 'type', 'remove']);
    if (typeof preScreenshotEvents !== 'undefined') {
      if (!Array.isArray(preScreenshotEvents)) {
        return NextResponse.json(
          { error: 'preScreenshotEvents must be an array' },
          { status: 400 }
        );
      }
      // Basic shape validation
      for (const evt of preScreenshotEvents) {
        const ev: any = evt;
        if (!ev || typeof ev !== 'object' || typeof ev.type !== 'string') {
          return NextResponse.json(
            { error: 'Each event must be an object with a type' },
            { status: 400 }
          );
        }
        if (!allowedEventTypes.has(ev.type)) {
          return NextResponse.json(
            { error: `Unsupported event type: ${ev.type}` },
            { status: 400 }
          );
        }
        // Index must be a non-negative integer if provided
        if (ev.index !== undefined) {
          if (typeof ev.index !== 'number' || ev.index < 0 || !Number.isInteger(ev.index)) {
            return NextResponse.json(
              { error: 'index must be a non-negative integer when provided' },
              { status: 400 }
            );
          }
        }
        // For selector-based events, ensure selector is a string
        if (['hover', 'click', 'type', 'waitForSelector', 'remove'].includes(ev.type)) {
          if (typeof ev.selector !== 'string' || ev.selector.trim().length === 0) {
            return NextResponse.json(
              { error: `${ev.type} events require a non-empty selector` },
              { status: 400 }
            );
          }
          // Optional: basic guard that remove uses id or class selectors
          if (ev.type === 'remove') {
            const sel = ev.selector.trim();
            const idOrClass = sel.startsWith('#') || sel.startsWith('.');
            if (!idOrClass) {
              return NextResponse.json(
                { error: 'remove requires an id (#id) or class (.class) selector' },
                { status: 400 }
              );
            }
          }
        }
        // For waitForTimeout, ensure ms is a number
        if (ev.type === 'waitForTimeout') {
          if (typeof ev.ms !== 'number' || ev.ms < 0) {
            return NextResponse.json(
              { error: 'waitForTimeout requires a non-negative ms value' },
              { status: 400 }
            );
          }
        }
      }
      eventsJson = preScreenshotEvents as Prisma.JsonValue;
    }
    
    // Update the page
    const updatedPage = await prisma.page.update({
      where: {
        id: pageId,
      },
      data: {
        ...(name && { name }),
        ...(path && { path }),
        ...(minDeviationDecimal !== undefined && { minDeviation: minDeviationDecimal }),
        ...(typeof eventsJson !== 'undefined' && { preScreenshotEvents: eventsJson }),
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
