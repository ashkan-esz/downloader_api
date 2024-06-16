-- CreateEnum
CREATE TYPE "userRole" AS ENUM ('test_user', 'user', 'dev', 'admin');

-- CreateEnum
CREATE TYPE "likeDislike" AS ENUM ('like', 'dislike');

-- CreateEnum
CREATE TYPE "titleRelation" AS ENUM ('prequel', 'sequel', 'spin_off', 'side_story', 'full_story', 'summary', 'parent_story', 'other', 'alternative_setting', 'alternative_version');

-- CreateEnum
CREATE TYPE "MbtiType" AS ENUM ('ISTJ', 'ISFJ', 'INFJ', 'INTJ', 'ISTP', 'ISFP', 'INFP', 'INTP', 'ESTP', 'ESFP', 'ENFP', 'ENTP', 'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ');

-- CreateTable
CREATE TABLE "User" (
    "userId" SERIAL NOT NULL,
    "password" TEXT NOT NULL,
    "publicName" TEXT NOT NULL,
    "rawUsername" TEXT NOT NULL,
    "registrationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" "userRole" NOT NULL DEFAULT 'user',
    "username" TEXT NOT NULL,
    "bio" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifyToken" TEXT NOT NULL DEFAULT '',
    "emailVerifyToken_expire" BIGINT NOT NULL DEFAULT 0,
    "deleteAccountVerifyToken" TEXT NOT NULL DEFAULT '',
    "deleteAccountVerifyToken_expire" BIGINT NOT NULL DEFAULT 0,
    "defaultProfile" TEXT NOT NULL DEFAULT '',
    "favoriteGenres" TEXT[],
    "ComputedStatsLastUpdate" BIGINT NOT NULL DEFAULT 0,
    "mbtiType" "MbtiType",

    CONSTRAINT "User_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Follow" (
    "followerId" INTEGER NOT NULL,
    "followingId" INTEGER NOT NULL,
    "addDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("followerId","followingId")
);

-- CreateTable
CREATE TABLE "ProfileImage" (
    "addDate" TIMESTAMP(3) NOT NULL,
    "originalSize" INTEGER NOT NULL,
    "size" INTEGER NOT NULL,
    "thumbnail" TEXT NOT NULL,
    "blurHash" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "ProfileImage_pkey" PRIMARY KEY ("url")
);

-- CreateTable
CREATE TABLE "ActiveSession" (
    "deviceId" TEXT NOT NULL,
    "appName" TEXT NOT NULL,
    "appVersion" TEXT NOT NULL,
    "deviceModel" TEXT NOT NULL,
    "deviceOs" TEXT NOT NULL,
    "notifToken" TEXT NOT NULL DEFAULT '',
    "ipLocation" TEXT NOT NULL,
    "loginDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refreshToken" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "ActiveSession_pkey" PRIMARY KEY ("userId","deviceId")
);

-- CreateTable
CREATE TABLE "MovieSettings" (
    "includeAnime" BOOLEAN NOT NULL DEFAULT true,
    "includeHentai" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "MovieSettings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "NotificationSettings" (
    "newFollower" BOOLEAN NOT NULL DEFAULT true,
    "newMessage" BOOLEAN NOT NULL DEFAULT false,
    "finishedList_spinOffSequel" BOOLEAN NOT NULL DEFAULT true,
    "followMovie" BOOLEAN NOT NULL DEFAULT true,
    "followMovie_betterQuality" BOOLEAN NOT NULL DEFAULT false,
    "followMovie_subtitle" BOOLEAN NOT NULL DEFAULT false,
    "futureList" BOOLEAN NOT NULL DEFAULT false,
    "futureList_serialSeasonEnd" BOOLEAN NOT NULL DEFAULT true,
    "futureList_subtitle" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "NotificationSettings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "DownloadLinksSettings" (
    "includeCensored" BOOLEAN NOT NULL DEFAULT true,
    "includeDubbed" BOOLEAN NOT NULL DEFAULT true,
    "includeHardSub" BOOLEAN NOT NULL DEFAULT true,
    "preferredQualities" TEXT[] DEFAULT ARRAY['720p', '1080p', '2160p']::TEXT[],
    "userId" INTEGER NOT NULL,

    CONSTRAINT "DownloadLinksSettings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "ComputedFavoriteGenres" (
    "count" INTEGER NOT NULL,
    "genre" TEXT NOT NULL,
    "percent" DOUBLE PRECISION NOT NULL,
    "userId" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "LikeDislikeStaff" (
    "type" "likeDislike" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "staffId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "LikeDislikeStaff_pkey" PRIMARY KEY ("userId","staffId")
);

-- CreateTable
CREATE TABLE "FollowStaff" (
    "date" TIMESTAMP(3) NOT NULL,
    "staffId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "FollowStaff_pkey" PRIMARY KEY ("userId","staffId")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "rawName" TEXT NOT NULL,
    "tvmazePersonID" INTEGER NOT NULL DEFAULT 0,
    "jikanPersonID" INTEGER NOT NULL DEFAULT 0,
    "gender" TEXT NOT NULL DEFAULT '',
    "originalImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "insert_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "about" TEXT NOT NULL DEFAULT '',
    "age" INTEGER NOT NULL DEFAULT 0,
    "birthday" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT '',
    "deathday" TEXT NOT NULL DEFAULT '',
    "eyeColor" TEXT NOT NULL DEFAULT '',
    "hairColor" TEXT NOT NULL DEFAULT '',
    "height" TEXT NOT NULL DEFAULT '',
    "weight" TEXT NOT NULL DEFAULT '',
    "likes_count" INTEGER NOT NULL DEFAULT 0,
    "dislikes_count" INTEGER NOT NULL DEFAULT 0,
    "follow_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LikeDislikeCharacter" (
    "type" "likeDislike" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "characterId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "LikeDislikeCharacter_pkey" PRIMARY KEY ("userId","characterId")
);

-- CreateTable
CREATE TABLE "FavoriteCharacter" (
    "date" TIMESTAMP(3) NOT NULL,
    "characterId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "FavoriteCharacter_pkey" PRIMARY KEY ("userId","characterId")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "rawName" TEXT NOT NULL,
    "tvmazePersonID" INTEGER NOT NULL DEFAULT 0,
    "jikanPersonID" INTEGER NOT NULL DEFAULT 0,
    "gender" TEXT NOT NULL DEFAULT '',
    "originalImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "insert_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "about" TEXT NOT NULL DEFAULT '',
    "age" INTEGER NOT NULL DEFAULT 0,
    "birthday" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT '',
    "deathday" TEXT NOT NULL DEFAULT '',
    "eyeColor" TEXT NOT NULL DEFAULT '',
    "hairColor" TEXT NOT NULL DEFAULT '',
    "height" TEXT NOT NULL DEFAULT '',
    "weight" TEXT NOT NULL DEFAULT '',
    "likes_count" INTEGER NOT NULL DEFAULT 0,
    "dislikes_count" INTEGER NOT NULL DEFAULT 0,
    "favorite_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CastImage" (
    "originalSize" INTEGER NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "thumbnail" TEXT NOT NULL,
    "blurHash" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "vpnStatus" TEXT NOT NULL,
    "staffId" INTEGER,
    "characterId" INTEGER
);

-- CreateTable
CREATE TABLE "Credit" (
    "id" SERIAL NOT NULL,
    "movieId" TEXT NOT NULL,
    "staffId" INTEGER,
    "characterId" INTEGER,
    "actorPositions" TEXT[],
    "characterRole" TEXT NOT NULL,

    CONSTRAINT "Credit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LikeDislikeMovie" (
    "type" "likeDislike" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "movieId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "LikeDislikeMovie_pkey" PRIMARY KEY ("userId","movieId")
);

-- CreateTable
CREATE TABLE "WatchedMovie" (
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "watch_season" INTEGER NOT NULL DEFAULT 0,
    "watch_episode" INTEGER NOT NULL DEFAULT 0,
    "dropped" BOOLEAN NOT NULL DEFAULT false,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "movieId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "WatchedMovie_pkey" PRIMARY KEY ("userId","movieId")
);

-- CreateTable
CREATE TABLE "FollowMovie" (
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "watch_season" INTEGER NOT NULL DEFAULT 0,
    "watch_episode" INTEGER NOT NULL DEFAULT 0,
    "date" TIMESTAMP(3) NOT NULL,
    "movieId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "FollowMovie_pkey" PRIMARY KEY ("userId","movieId")
);

-- CreateTable
CREATE TABLE "WatchListMovie" (
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "date" TIMESTAMP(3) NOT NULL,
    "group_name" TEXT NOT NULL DEFAULT 'default',
    "movieId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "WatchListMovie_pkey" PRIMARY KEY ("userId","movieId")
);

-- CreateTable
CREATE TABLE "WatchListGroup" (
    "date" TIMESTAMP(3) NOT NULL,
    "group_name" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "WatchListGroup_pkey" PRIMARY KEY ("userId","group_name")
);

-- CreateTable
CREATE TABLE "UserCollectionMovie" (
    "date" TIMESTAMP(3) NOT NULL,
    "collection_name" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "UserCollectionMovie_pkey" PRIMARY KEY ("userId","movieId","collection_name")
);

-- CreateTable
CREATE TABLE "UserCollection" (
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "collection_name" TEXT NOT NULL,
    "public" BOOLEAN NOT NULL DEFAULT true,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "UserCollection_pkey" PRIMARY KEY ("userId","collection_name")
);

-- CreateTable
CREATE TABLE "RelatedMovie" (
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "movieId" TEXT NOT NULL,
    "relatedId" TEXT NOT NULL,
    "relation" "titleRelation" NOT NULL
);

-- CreateTable
CREATE TABLE "Movie" (
    "movieId" TEXT NOT NULL,
    "likes_count" INTEGER NOT NULL DEFAULT 0,
    "dislikes_count" INTEGER NOT NULL DEFAULT 0,
    "favorite_count" INTEGER NOT NULL DEFAULT 0,
    "dropped_count" INTEGER NOT NULL DEFAULT 0,
    "finished_count" INTEGER NOT NULL DEFAULT 0,
    "follow_count" INTEGER NOT NULL DEFAULT 0,
    "watchlist_count" INTEGER NOT NULL DEFAULT 0,
    "continue_count" INTEGER NOT NULL DEFAULT 0,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "view_month_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("movieId")
);

-- CreateTable
CREATE TABLE "Room" (
    "roomId" SERIAL NOT NULL,
    "creatorId" INTEGER NOT NULL,
    "receiverId" INTEGER NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("roomId")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "state" INTEGER NOT NULL DEFAULT 0,
    "roomId" INTEGER,
    "creatorId" INTEGER NOT NULL,
    "receiverId" INTEGER NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaFile" (
    "id" SERIAL NOT NULL,
    "messageId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "thumbnail" TEXT NOT NULL,
    "blurHash" TEXT NOT NULL,

    CONSTRAINT "MediaFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMessageRead" (
    "userId" INTEGER NOT NULL,
    "lastTimeRead" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageReceived" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserMessageRead_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "creatorId" INTEGER NOT NULL,
    "receiverId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityTypeId" INTEGER NOT NULL,
    "subEntityTypeId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" INTEGER NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationEntityType" (
    "entityTypeId" INTEGER NOT NULL,
    "entityType" TEXT NOT NULL,

    CONSTRAINT "NotificationEntityType_pkey" PRIMARY KEY ("entityTypeId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_userId_key" ON "User"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileImage_url_key" ON "ProfileImage"("url");

-- CreateIndex
CREATE UNIQUE INDEX "ActiveSession_refreshToken_key" ON "ActiveSession"("refreshToken");

-- CreateIndex
CREATE INDEX "ActiveSession_userId_refreshToken_idx" ON "ActiveSession"("userId", "refreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "MovieSettings_userId_key" ON "MovieSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSettings_userId_key" ON "NotificationSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DownloadLinksSettings_userId_key" ON "DownloadLinksSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ComputedFavoriteGenres_userId_genre_key" ON "ComputedFavoriteGenres"("userId", "genre");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_id_key" ON "Staff"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_name_key" ON "Staff"("name");

-- CreateIndex
CREATE INDEX "Staff_name_rawName_idx" ON "Staff"("name", "rawName");

-- CreateIndex
CREATE UNIQUE INDEX "Character_id_key" ON "Character"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Character_name_key" ON "Character"("name");

-- CreateIndex
CREATE INDEX "Character_name_rawName_idx" ON "Character"("name", "rawName");

-- CreateIndex
CREATE UNIQUE INDEX "CastImage_url_key" ON "CastImage"("url");

-- CreateIndex
CREATE UNIQUE INDEX "CastImage_staffId_key" ON "CastImage"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "CastImage_characterId_key" ON "CastImage"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "Credit_id_key" ON "Credit"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Credit_movieId_staffId_characterId_actorPositions_key" ON "Credit"("movieId", "staffId", "characterId", "actorPositions");

-- CreateIndex
CREATE INDEX "LikeDislikeMovie_movieId_userId_idx" ON "LikeDislikeMovie"("movieId", "userId");

-- CreateIndex
CREATE INDEX "WatchedMovie_movieId_userId_idx" ON "WatchedMovie"("movieId", "userId");

-- CreateIndex
CREATE INDEX "FollowMovie_movieId_userId_idx" ON "FollowMovie"("movieId", "userId");

-- CreateIndex
CREATE INDEX "WatchListMovie_movieId_userId_idx" ON "WatchListMovie"("movieId", "userId");

-- CreateIndex
CREATE INDEX "UserCollectionMovie_movieId_userId_collection_name_idx" ON "UserCollectionMovie"("movieId", "userId", "collection_name");

-- CreateIndex
CREATE UNIQUE INDEX "RelatedMovie_movieId_relatedId_key" ON "RelatedMovie"("movieId", "relatedId");

-- CreateIndex
CREATE UNIQUE INDEX "Movie_movieId_key" ON "Movie"("movieId");

-- CreateIndex
CREATE UNIQUE INDEX "Room_creatorId_receiverId_key" ON "Room"("creatorId", "receiverId");

-- CreateIndex
CREATE INDEX "Message_date_state_idx" ON "Message"("date", "state");

-- CreateIndex
CREATE INDEX "MediaFile_messageId_idx" ON "MediaFile"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "UserMessageRead_userId_key" ON "UserMessageRead"("userId");

-- CreateIndex
CREATE INDEX "Notification_receiverId_date_idx" ON "Notification"("receiverId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationEntityType_entityType_key" ON "NotificationEntityType"("entityType");

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileImage" ADD CONSTRAINT "ProfileImage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiveSession" ADD CONSTRAINT "ActiveSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieSettings" ADD CONSTRAINT "MovieSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSettings" ADD CONSTRAINT "NotificationSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DownloadLinksSettings" ADD CONSTRAINT "DownloadLinksSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComputedFavoriteGenres" ADD CONSTRAINT "ComputedFavoriteGenres_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LikeDislikeStaff" ADD CONSTRAINT "LikeDislikeStaff_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LikeDislikeStaff" ADD CONSTRAINT "LikeDislikeStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowStaff" ADD CONSTRAINT "FollowStaff_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowStaff" ADD CONSTRAINT "FollowStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LikeDislikeCharacter" ADD CONSTRAINT "LikeDislikeCharacter_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LikeDislikeCharacter" ADD CONSTRAINT "LikeDislikeCharacter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteCharacter" ADD CONSTRAINT "FavoriteCharacter_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteCharacter" ADD CONSTRAINT "FavoriteCharacter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CastImage" ADD CONSTRAINT "CastImage_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CastImage" ADD CONSTRAINT "CastImage_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credit" ADD CONSTRAINT "movie" FOREIGN KEY ("movieId") REFERENCES "Movie"("movieId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credit" ADD CONSTRAINT "staff" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credit" ADD CONSTRAINT "character" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LikeDislikeMovie" ADD CONSTRAINT "LikeDislikeMovie_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("movieId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LikeDislikeMovie" ADD CONSTRAINT "LikeDislikeMovie_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchedMovie" ADD CONSTRAINT "WatchedMovie_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("movieId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchedMovie" ADD CONSTRAINT "WatchedMovie_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowMovie" ADD CONSTRAINT "FollowMovie_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("movieId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowMovie" ADD CONSTRAINT "FollowMovie_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchListMovie" ADD CONSTRAINT "WatchListMovie_userId_group_name_fkey" FOREIGN KEY ("userId", "group_name") REFERENCES "WatchListGroup"("userId", "group_name") ON DELETE SET DEFAULT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchListMovie" ADD CONSTRAINT "WatchListMovie_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("movieId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchListMovie" ADD CONSTRAINT "WatchListMovie_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchListGroup" ADD CONSTRAINT "WatchListGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCollectionMovie" ADD CONSTRAINT "UserCollectionMovie_userId_collection_name_fkey" FOREIGN KEY ("userId", "collection_name") REFERENCES "UserCollection"("userId", "collection_name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCollectionMovie" ADD CONSTRAINT "UserCollectionMovie_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("movieId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCollectionMovie" ADD CONSTRAINT "UserCollectionMovie_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCollection" ADD CONSTRAINT "UserCollection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelatedMovie" ADD CONSTRAINT "RelatedMovie_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("movieId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelatedMovie" ADD CONSTRAINT "RelatedMovie_relatedId_fkey" FOREIGN KEY ("relatedId") REFERENCES "Movie"("movieId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("roomId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaFile" ADD CONSTRAINT "MediaFile_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMessageRead" ADD CONSTRAINT "UserMessageRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_entityTypeId_fkey" FOREIGN KEY ("entityTypeId") REFERENCES "NotificationEntityType"("entityTypeId") ON DELETE CASCADE ON UPDATE CASCADE;
