// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ComparisonStatus } from '@/lib/types';
import { verifyWebsiteAccess } from '@/lib/website-access';

// GET /api/websites/[id]/pages/[pageId]/comparisons/[comparisonId]/available-baselines
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pageId: string; comparisonId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;

    // Verify website access
    const hasAccess = await verifyWebsiteAccess(resolvedParams.id, session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    // Verify page exists
    const page = await prisma.page.findFirst({
      where: {
        id: resolvedParams.pageId,
        websiteId: resolvedParams.id,
      },
    });

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Get all completed comparisons for this page that have screenshots
    const availableBaselines = await prisma.comparison.findMany({
      where: {
        pageId: resolvedParams.pageId,
        status: ComparisonStatus.COMPLETED,
        OR: [
          { baselineScreenshot: { not: null } },
          { currentScreenshot: { not: null } }
        ]
      },
      select: {
        id: true,
        createdAt: true,
        baselineScreenshot: true,
        currentScreenshot: true,
        diffPercentage: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format the response to include both baseline and current screenshots as options
    const formattedBaselines = availableBaselines.flatMap(comparison => {
      const options = [];
      
      if (comparison.baselineScreenshot) {
        options.push({
          id: `${comparison.id}-baseline`,
          comparisonId: comparison.id,
          screenshot: comparison.baselineScreenshot,
          type: 'baseline',
          createdAt: comparison.createdAt,
          diffPercentage: comparison.diffPercentage,
        });
      }
      
      if (comparison.currentScreenshot) {
        options.push({
          id: `${comparison.id}-current`,
          comparisonId: comparison.id,
          screenshot: comparison.currentScreenshot,
          type: 'current',
          createdAt: comparison.createdAt,
          diffPercentage: comparison.diffPercentage,
        });
      }
      
      return options;
    });

    return NextResponse.json({ 
      availableBaselines: formattedBaselines 
    });

  } catch (error) {
    console.error('Error fetching available baselines:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}