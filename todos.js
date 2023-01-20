
//todo : 3. save links and generated info for better development
//todo : 4. adminPanel: show info and status of remoteBrowsers
//todo : 4.2 adminPanel: show crawling links of remoteBrowsers
//todo : 5. remoteBrowser: add api for crawler status
//todo : 6. crawler: merge extractor functions of sources into single module
//todo : 7. remoteBrowser: crawl youtube for trailers
//todo : 8. reduce size of trailers
//todo : 9. reduce size of users profile images
//todo : 11. show status of s3 file remover
//todo : 12. save data and counts s3 file remover in db
//todo : 13. add api to remove user/staff/character
//todo : 14. add api to remove movie
//todo : 15. adminPanel: add (13),(14)
//todo : 16. crawler: add more anime sources (something like torrent sites)
//todo : 17. remoteBrowser: add feature to download from torrent
//todo : 18. crawler: crawl torrent sites
//todo : 19. remoteBrowser: download links from (16),(19)
//todo : 20. crawler: add new movie sources to replace 'digimoviez'
//todo : 21. crawler: add feature to check sources changed
//todo : 21.2 crawler: check sources changes need fixes or need to be disable
//todo : 22. crawler: disable sources when not responding, delete sources movies data
//todo : 23. crawler: reCrawl sources after being disable for a while
//todo : 24. re create field 'latestData' after links remove or source remove
//todo : 25. lower compression level on response data to reduce cpu usage
//todo : 26. add redis and fallback to node-cache
//todo : 27. add elastic search and fallback to mongo search
//todo : 28. docker project for better and easier deployment
//todo : 29. add telegram bot for some system to backup databse
//todo : 30. adminPanel: manage bots like movie sources
//todo : 31. add field 'isManual' to crawler status
//todo : 32. save links with bad info into db, show warning in adminPanel
//todo : 33. better and simpler function to fix/sort links info
//todo : 34. check for a way to dont check movie links inside source page
//todo : 35. lower memory consumption for crawler
//todo : 36. save errors into db, add api to get them
//todo : 37. adminPanel: show errors
//todo : 38. add feature 'score' to movies
//todo : 39. better emails
//todo : 40. email warnings and errors to admin
//todo : 41. check 'sendgrid' system for email
//todo : 42. add api to get active cronjob
//todo : 43. adminPanel: show status of cronjob
//todo : 44. telegramBot: add features that exist in adminPanel
//todo : 45. send warnings and errors to admin with telegramBot
//todo : 46. add more staff and characters
//todo : 47. add landscape posters for movies
//todo : 48. better trailers api, add field 'trailerDate' to movies data
//todo : 49. merge things exist in sources configs, less time need to add new source
//todo : 51. merge two functions: 'addApiData', 'updateApiData' from 'allApiData' module
//todo : 52. change the way of data update to dont change original data object
//todo : 54. alpha feature: use sql dataBase for userStats
//todo : 55. save number of latest bucket of userStats to increase performance
//todo : 57. add documentation for codes
//todo : 58. add more tests
//todo : 59. add cli like interface for manual test and check detection functions
//todo : 60. add message api to send and show messages to users
//todo : 61. adminPanel: add/edit messages that users see (60)
//todo : 62. add api to upload new version of apps files
//todo : 63. adminPanel: add feature to upload new version of apps
//todo : 64. add api to download latest version of apps
//todo : 65. add api to check new version exist or update is required
//todo : 66. add api to get server resources status
//todo : 67. adminPanel: show server resources status
//todo : 68. add feature to disable users login/signup/... for a while
//todo : 69. adminPanel: add (68)
//todo : 70. merge server config obj (env variables) white the configs come from adminPanel (db)
//todo : 71. adminPanel: restart server from adminPanel
//todo : 72. add repairing/development faze to server
//todo : 73. add feature 'view' to movies
//todo : 74. add feature: users chats
//todo : 75. add sql dataBase
//todo : 76. add socket
//todo : 78. add feature 'comments' to movies
//todo : 79. add filter for 'hentai' and 'pornography' on api results
//todo : 80. add feature: share movies between users
//todo : 81. add api for changing user information
//todo : 81.2 add api for changing password
//todo : 81.2 add api for forget password
//todo : 83. add api to check for new episode release on movies that user follow
//todo : 84. add api to check for relatedTitles that user follow
//todo : 85. add feature: send notification to users
//todo : 86. add feature: clustering for larger scales
//todo : 87. organize cronjob times
//todo : 89. add feature: extract device info from req
//todo : 90. save sources pages and data into files for better and faster development
//todo : 91. crawl source completely after changing its url manually on adminPanel
//todo : 92. add env var to disable testUser requests
//todo : 94. disable rateLimit for bots requests
//todo : 95. save warning and errors in db to show in adminPanel
//todo : 96. crawler: start domainChangeHandler every 30 min
//todo : 97. crawler: limit number of concurrent trailer download/upload to reduce memory load
//todo : 98. crawler: delay to start crawler when server in on high load
//todo : 99. crawler: pause crawler when server gets on high load
//todo : 99.2 crawler: save pause data and time on crawler logs
//todo : 100. limit number of concurrent image compression or thumbnail creation for lower cpu load
//todo : 101. check strapi
//todo : 102. add feature : remove movie source and its movies
//todo : 103. add movie source change detection service
//todo : 104. add title duplication finder service
//todo : 105. service to update sources auth cookies / notify on expire
//todo : 106. handle flag 'disable' for bots on admin panel
//todo : 107. Add feature stop crawler
//todo : 108. Add thumbnail api and status
//todo : 109. When/How to add admin account
//todo : 110. Add api to start preStart script
//todo : 111. save sentry.captureMessages in both downloader_api and downloader_remoteBrowser to db
//todo : 112. remove source link/poster/trailer after 5 day inactive
//todo : 113. save last crawler run data on sources, better detection for source url not accessible
//todo : 114. Show info about remote Browsers all and single in adminPanel
//todo : 115. Add fields username Change and description to crawler sources
//todo : 116. better solution for cors and auth with cookies
//todo : 117. remove the usage of page_counter on crawler
//todo : 118. add better poster/trailer extractor function
//todo : 119. add more efficient linkInfoUtils
//todo : 120. add redis/memCache, (liara/arvanCloud free plan)
//todo : 121. check youtube trailers size, and possible to reduce size, check imagekit.io, check new language stack
//todo : 122. add aniList api
//todo : 123. automate omdb key production
//todo : 124. add feature: 'like_month' , 'view_month' to movies
//todo : 125. handle moviePoster in cast sections when domain changes
//todo : 126. refactor allApiData file
//todo : 127. add schema validator
//todo : 128. add schema for models and add related methods to it
//todo : 129. get new sources for anime
//todo : 130. add new sources
//todo : 131. add personality type to user data, and api to find same characters
//todo : 132. add a mechanism to crawl a site after see bad links
//todo : 133. add feature: 'watched', 'watching', 'want to watch', 'dropped' to movies
//todo : 134. add feature: upload fanArt
//todo : 135. check fastify
//todo : 136. smart suggestion method
//todo : 137. fix duplicate titles bug
