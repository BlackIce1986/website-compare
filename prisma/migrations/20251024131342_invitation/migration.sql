-- CreateTable
CREATE TABLE "WebsiteShare" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permission" TEXT NOT NULL DEFAULT 'view',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteInvitation" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT,
    "inviteeEmail" TEXT,
    "token" TEXT NOT NULL,
    "permission" TEXT NOT NULL DEFAULT 'view',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "WebsiteInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteShare_websiteId_userId_key" ON "WebsiteShare"("websiteId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteInvitation_token_key" ON "WebsiteInvitation"("token");

-- AddForeignKey
ALTER TABLE "WebsiteShare" ADD CONSTRAINT "WebsiteShare_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteShare" ADD CONSTRAINT "WebsiteShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteInvitation" ADD CONSTRAINT "WebsiteInvitation_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteInvitation" ADD CONSTRAINT "WebsiteInvitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteInvitation" ADD CONSTRAINT "WebsiteInvitation_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
