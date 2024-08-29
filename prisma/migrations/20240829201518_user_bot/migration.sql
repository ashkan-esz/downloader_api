-- CreateTable
CREATE TABLE "Bot" (
    "botId" TEXT NOT NULL,
    "botToken" TEXT NOT NULL,
    "botName" TEXT NOT NULL,
    "botType" TEXT NOT NULL,
    "disabled" BOOLEAN NOT NULL,
    "isOfficial" BOOLEAN NOT NULL,
    "permissionToLogin" BOOLEAN NOT NULL,
    "permissionToCrawl" BOOLEAN NOT NULL,
    "permissionToTorrentLeech" BOOLEAN NOT NULL,

    CONSTRAINT "Bot_pkey" PRIMARY KEY ("botId")
);

-- CreateTable
CREATE TABLE "UserBot" (
    "notification" BOOLEAN NOT NULL DEFAULT true,
    "username" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "UserBot_pkey" PRIMARY KEY ("userId","botId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bot_botId_key" ON "Bot"("botId");

-- CreateIndex
CREATE UNIQUE INDEX "Bot_botToken_key" ON "Bot"("botToken");

-- CreateIndex
CREATE INDEX "UserBot_userId_botId_idx" ON "UserBot"("userId", "botId");

-- AddForeignKey
ALTER TABLE "UserBot" ADD CONSTRAINT "UserBot_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("botId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBot" ADD CONSTRAINT "UserBot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
