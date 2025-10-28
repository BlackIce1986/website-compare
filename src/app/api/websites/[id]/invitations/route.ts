// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Permission, InvitationStatus } from '@/lib/types';
import crypto from 'crypto';

// POST /api/websites/[id]/invitations - Create a new invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: websiteId } = await params;
    const { email, permission = Permission.VIEW } = await request.json();

    // Validate input
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!Object.values(Permission).includes(permission)) {
      return NextResponse.json(
        { error: `Permission must be either "${Permission.VIEW}" or "${Permission.EDIT}"` },
        { status: 400 }
      );
    }

    // Check if website exists and belongs to the user
    const website = await prisma.website.findFirst({
      where: {
        id: websiteId,
        userId: session.user.id,
      },
    });

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    // Check if user is already shared with this website
    const existingShare = await prisma.websiteShare.findFirst({
      where: {
        websiteId,
        user: {
          email: email,
        },
      },
    });

    if (existingShare) {
      return NextResponse.json(
        { error: 'Website is already shared with this user' },
        { status: 400 }
      );
    }

    // Check if there's already a pending invitation for this email
    const existingInvitation = await prisma.websiteInvitation.findFirst({
      where: {
        websiteId,
        inviteeEmail: email,
        status: InvitationStatus.PENDING,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'There is already a pending invitation for this email' },
        { status: 400 }
      );
    }

    // Find the invitee user if they exist
    const inviteeUser = await prisma.user.findUnique({
      where: { email },
    });

    // Generate a unique token
    const token = crypto.randomBytes(32).toString('hex');

    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create the invitation
    const invitation = await prisma.websiteInvitation.create({
      data: {
        websiteId,
        inviterId: session.user.id,
        inviteeId: inviteeUser?.id || null,
        inviteeEmail: email,
        token,
        permission,
        expiresAt,
      },
      include: {
        website: true,
        inviter: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Generate invitation URL
    const invitationUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/invitations/${token}`;

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.inviteeEmail,
        permission: invitation.permission,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
        url: invitationUrl,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating invitation:', error);
    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    );
  }
}

// GET /api/websites/[id]/invitations - Get all invitations for a website
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: websiteId } = await params;

    // Check if website exists and belongs to the user
    const website = await prisma.website.findFirst({
      where: {
        id: websiteId,
        userId: session.user.id,
      },
    });

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    // Get all invitations for this website
    const invitations = await prisma.websiteInvitation.findMany({
      where: {
        websiteId,
      },
      include: {
        invitee: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedInvitations = invitations.map(invitation => ({
      id: invitation.id,
      email: invitation.inviteeEmail,
      inviteeName: invitation.invitee?.name || null,
      permission: invitation.permission,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      acceptedAt: invitation.acceptedAt,
      url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/invitations/${invitation.token}`,
    }));

    return NextResponse.json({ invitations: formattedInvitations });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}