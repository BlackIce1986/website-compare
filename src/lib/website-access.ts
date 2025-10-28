import { prisma } from '@/lib/prisma';

/**
 * Verifies if a user has access to a website (either owns it or has it shared with them)
 * @param websiteId - The ID of the website to check access for
 * @param userId - The ID of the user to check access for
 * @returns Promise<boolean> - True if user has access, false otherwise
 */
export async function verifyWebsiteAccess(websiteId: string, userId: string): Promise<boolean> {
  try {
    // Check if user owns the website
    const website = await prisma.website.findFirst({
      where: {
        id: websiteId,
        userId: userId,
      },
    });

    if (website) {
      return true;
    }

    // Check if website is shared with the user
    const isWebsiteSharedWithUser = await prisma.websiteShare.findFirst({
      where: {
        websiteId: websiteId,
        userId: userId,
      },
    });

    return !!isWebsiteSharedWithUser;
  } catch (error) {
    console.error('Error verifying website access:', error);
    return false;
  }
}

/**
 * Verifies website access and returns detailed information about the website and sharing status
 * @param websiteId - The ID of the website to check access for
 * @param userId - The ID of the user to check access for
 * @returns Promise<{hasAccess: boolean, website?: any, isShared?: boolean}> - Access details
 */
export async function getWebsiteAccessDetails(websiteId: string, userId: string) {
  try {
    // Check if user owns the website
    const website = await prisma.website.findFirst({
      where: {
        id: websiteId,
        userId: userId,
      },
    });

    if (website) {
      return {
        hasAccess: true,
        website,
        isShared: false,
      };
    }

    // Check if website is shared with the user
    const websiteShare = await prisma.websiteShare.findFirst({
      where: {
        websiteId: websiteId,
        userId: userId,
      },
      include: {
        website: true,
      },
    });

    if (websiteShare) {
      return {
        hasAccess: true,
        website: websiteShare.website,
        isShared: true,
        permission: websiteShare.permission,
      };
    }

    return {
      hasAccess: false,
    };
  } catch (error) {
    console.error('Error getting website access details:', error);
    return {
      hasAccess: false,
    };
  }
}