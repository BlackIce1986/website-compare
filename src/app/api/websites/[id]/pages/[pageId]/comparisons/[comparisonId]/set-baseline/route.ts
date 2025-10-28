// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { compareScreenshots } from '@/lib/puppeteer';
import { ComparisonStatus } from '@/lib/types';
import { verifyWebsiteAccess } from '@/lib/website-access';

// PUT /api/websites/[id]/pages/[pageId]/comparisons/[comparisonId]/set-baseline
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pageId: string; comparisonId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const { newBaselineScreenshot } = await request.json();

    if (!newBaselineScreenshot) {
      return NextResponse.json({ error: 'New baseline screenshot is required' }, { status: 400 });
    }

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

    // Verify comparison exists
    const comparison = await prisma.comparison.findFirst({
      where: {
        id: resolvedParams.comparisonId,
        pageId: resolvedParams.pageId,
      },
    });

    if (!comparison) {
      return NextResponse.json({ error: 'Comparison not found' }, { status: 404 });
    }

    // Update the comparison with new baseline
    const updatedComparison = await prisma.comparison.update({
      where: { id: resolvedParams.comparisonId },
      data: { baselineScreenshot: newBaselineScreenshot },
    });

    // If there's a current screenshot, recalculate the diff
    if (updatedComparison.currentScreenshot) {
      try {
        const diffResult = await compareScreenshots(
          newBaselineScreenshot,
          updatedComparison.currentScreenshot
        );

        await prisma.comparison.update({
          where: { id: resolvedParams.comparisonId },
          data: {
            diffScreenshot: diffResult.diffPath,
            diffPercentage: diffResult.diffPercentage,
            status: ComparisonStatus.COMPLETED,
          },
        });
      } catch (error) {
        console.error('Error recalculating diff:', error);
        // Don't fail the baseline update if diff calculation fails
      }
    }

    // Update all future comparisons for this page to use the new baseline
    await prisma.comparison.updateMany({
      where: {
        pageId: resolvedParams.pageId,
        createdAt: {
          gt: comparison.createdAt,
        },
      },
      data: {
        baselineScreenshot: newBaselineScreenshot,
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Baseline updated successfully',
      comparison: updatedComparison 
    });

  } catch (error) {
    console.error('Error updating baseline:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}