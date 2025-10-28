// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/shared-websites - Get all websites shared with the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all websites shared with the current user
    const sharedWebsites = await prisma.websiteShare.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        website: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                pages: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedWebsites = sharedWebsites.map(share => ({
      id: share.website.id,
      name: share.website.name,
      url: share.website.url,
      permission: share.permission,
      sharedAt: share.createdAt,
      owner: {
        name: share.website.user.name,
        email: share.website.user.email,
      },
      _count: {
        pages: share.website._count.pages,
      },
    }));

    return NextResponse.json(formattedWebsites);
  } catch (error) {
    console.error('Error fetching shared websites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shared websites' },
      { status: 500 }
    );
  }
}