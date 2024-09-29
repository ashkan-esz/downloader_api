-- CreateTable
CREATE TABLE "UserTorrent" (
    "torrentLeachGb" INTEGER NOT NULL,
    "torrentSearch" INTEGER NOT NULL,
    "firstUseAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "UserTorrent_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserTorrent_userId_key" ON "UserTorrent"("userId");

-- AddForeignKey
ALTER TABLE "UserTorrent" ADD CONSTRAINT "UserTorrent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
