## User Stats

### 1. Movies
1. like_movie, dislike_movie: 
   1. Table: `likeDislikeMovie`
   2. liking or disliking a `movie/serial` 


2. finish_movie:
   1. Table: `watchedMovie` 
   2. finished watching a `movie/serial` 
   3. movie/serial should be released before doing this action.
   4. contains `favorite`, `dropped`, `startDate`, `date`, `score`
   5. after finishing a `serial`, it get removed from `followMovie` list
   6. after finishing a `movie/serial`, it get removed from `watchListMovie` list
   7. favorite_movie: after finish can be tagged as favorite
   8. dropp_movie: finish a serial before it ends, tag it as dropped 


3. follow_movie:
   1. Table: `followMovie`
   2. add `serial` to list of `serials` a user follow, only works for `serial`        
   3. contains `watch_season`, `watch_episode` ,`score`
   4. removes `serial` from `watchListMovie`
   5. check `serial` from `watchedMovie`, if already tagged as `dropped`, remove from `watchListMovie` and increment `reWatch` counter 


4. watchlist_movie:
   1. Table: `WatchListMovie`
   2. add `movie/serial` to `watchListMovie`
   3. contains `groupName`, `score`, `date`
   4. cannot add `movie/serial` if already exists in `watchedMovie` or `followMovie`
   5. each user can creates up to `20` group for watchList


5. collection_movie: 
   1. each user can creates up to `20` collection of movies
   2. collections can be public or private

    
**NOTE: Integrity: each movie can exist in one of `followMovie`/`watchListMovie`/`watchedMovie` tables at the same time**

### 2. Staff
1. like_staff (Table: `likeDislikeStaff`): liking a staff
2. dislike_staff (Table: `likeDislikeStaff`): disliking a staff
3. follow_staff (Table: `followStaff`): following a staff


### 3. Character
1. like_character (Table: `likeDislikeCharacter`): liking a character
2. dislike_character (Table: `likeDislikeCharacter`): disliking a character
3. favorite_character (Table: `favoriteCharacter`): adding a character to favorite list