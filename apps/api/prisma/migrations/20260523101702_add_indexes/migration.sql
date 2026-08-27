-- CreateIndex
CREATE INDEX "Availability_userId_startsAt_idx" ON "Availability"("userId", "startsAt");

-- CreateIndex
CREATE INDEX "DispoPost_userId_idx" ON "DispoPost"("userId");

-- CreateIndex
CREATE INDEX "DispoPost_when_type_idx" ON "DispoPost"("when", "type");

-- CreateIndex
CREATE INDEX "Match_hostId_status_playedAt_idx" ON "Match"("hostId", "status", "playedAt");

-- CreateIndex
CREATE INDEX "Match_guestId_status_playedAt_idx" ON "Match"("guestId", "status", "playedAt");

-- CreateIndex
CREATE INDEX "Match_winnerId_idx" ON "Match"("winnerId");

-- CreateIndex
CREATE INDEX "MatchRequest_dispoPostId_status_idx" ON "MatchRequest"("dispoPostId", "status");

-- CreateIndex
CREATE INDEX "MatchRequest_requesterId_idx" ON "MatchRequest"("requesterId");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "QuickMatch_challengerId_status_idx" ON "QuickMatch"("challengerId", "status");

-- CreateIndex
CREATE INDEX "QuickMatch_challengedId_status_idx" ON "QuickMatch"("challengedId", "status");

-- CreateIndex
CREATE INDEX "QuickMatch_when_idx" ON "QuickMatch"("when");

-- CreateIndex
CREATE INDEX "User_rating_ratingGames_idx" ON "User"("rating", "ratingGames");

-- CreateIndex
CREATE INDEX "User_level_online_idx" ON "User"("level", "online");

-- CreateIndex
CREATE INDEX "User_city_idx" ON "User"("city");
