-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "venue" TEXT,
    "venueAddress" TEXT,
    "city" TEXT,
    "category" TEXT NOT NULL DEFAULT 'other',
    "subcategory" TEXT,
    "organizer" TEXT,
    "organizerEmail" TEXT,
    "organizerPhone" TEXT,
    "website" TEXT,
    "imageUrl" TEXT,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "hasTicketing" BOOLEAN NOT NULL DEFAULT false,
    "ticketingProvider" TEXT,
    "estimatedAttendees" INTEGER,
    "isAnnual" BOOLEAN NOT NULL DEFAULT false,
    "editionYear" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "partnershipStatus" TEXT NOT NULL DEFAULT 'untapped',
    "switchScore" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "parentEventId" TEXT,
    CONSTRAINT "Event_parentEventId_fkey" FOREIGN KEY ("parentEventId") REFERENCES "Event" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");
