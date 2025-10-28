// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { InvitationStatus } from '@/lib/types';

// GET /api/invitations/[token] - Get invitation details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Find the invitation by token
    const invitation = await prisma.websiteInvitation?.findFirst({
      where: {
        token,
        status: InvitationStatus.PENDING,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        website: {
          select: {
            id: true,
            name: true,
            url: true,
          },
        },
        inviter: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found or expired' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        websiteName: invitation.website.name,
        websiteUrl: invitation.website.url,
        inviterName: invitation.inviter.name,
        inviterEmail: invitation.inviter.email,
        permission: invitation.permission,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error('Error fetching invitation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitation' },
      { status: 500 }
    );
  }
}

// POST /api/invitations/[token] - Accept an invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await params;

    // Find the invitation by token
    const invitation = await prisma.websiteInvitation.findFirst({
      where: {
        token,
        status: InvitationStatus.PENDING,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        website: true,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found or expired' },
        { status: 404 }
      );
    }

    // Check if the user accepting is the intended recipient
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If invitation has a specific invitee, check if it matches
    if (invitation.inviteeId && invitation.inviteeId !== session.user.id) {
      return NextResponse.json(
        { error: 'This invitation is not for you' },
        { status: 403 }
      );
    }

    // If invitation is by email, check if it matches
    if (!invitation.inviteeId && invitation.inviteeEmail !== user.email) {
      return NextResponse.json(
        { error: 'This invitation is not for your email address' },
        { status: 403 }
      );
    }

    // Check if user already has access to this website
    const existingShare = await prisma.websiteShare.findFirst({
      where: {
        websiteId: invitation.websiteId,
        userId: session.user.id,
      },
    });

    if (existingShare) {
      // Update the invitation status to accepted anyway
      await prisma.websiteInvitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
          inviteeId: session.user.id,
        },
      });

      return NextResponse.json(
        { error: 'You already have access to this website' },
        { status: 400 }
      );
    }

    // Use a transaction to create the share and update the invitation
    const result = await prisma.$transaction(async (tx) => {
      // Create the website share
      const share = await tx.websiteShare.create({
        data: {
          websiteId: invitation.websiteId,
          userId: session.user.id,
          permission: invitation.permission,
        },
      });

      // Update the invitation status
      const updatedInvitation = await tx.websiteInvitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
          inviteeId: session.user.id,
        },
      });

      return { share, invitation: updatedInvitation };
    });

    return NextResponse.json({
      success: true,
      websiteId: invitation.websiteId,
      permission: invitation.permission,
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}