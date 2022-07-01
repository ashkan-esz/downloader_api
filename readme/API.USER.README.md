# API Parameters

| param name            | Values                        | Description                                                          | Required |
|-----------------------|-------------------------------|----------------------------------------------------------------------|----------|
| **`username`**        | string                        | match <code>/^[a-z&#124;0-9_]+$/gi</code> and length in range [6-50] | `true`   |
| **`email`**           | string                        |                                                                      | `true`   |
| **`password`**        | string                        | at least one number and capital letter  and length in range [8-50]   | `true`   |
| **`confirmPassword`** | string                        |                                                                      | `true`   |
| **`deviceInfo`**      | String                        | includes fields _appName_, _appVersion_, _os_, _deviceModel_         | `true`   |
| **`appName`**         | String                        |                                                                      | `true`   |
| **`appVersion`**      | String                        |                                                                      | `true`   |
| **`os`**              | String                        |                                                                      | `true`   |
| **`deviceModel`**     | String                        |                                                                      | `true`   |
| **`deviceId`**        | String                        | unique id of session                                                 | `true`   |
| **`filename`**        | String                        |                                                                      | `true`   |
| **`genres`**          | Array of String joined by '-' | example: action or action-comedy-drama or action-sci_fi              | `true`   |


> they are case-insensitive.

**Note: use query parameter `testUser=true` to see result of api call on get methods (do not use this parameter in production).**

# API Resources

- [POST /users/signup](#post-userssignup)
- [POST /users/login](#post-userslogin)
- [PUT /users/getToken](#put-usersgettoken)
- [PUT /users/logout](#put-userslogout)
- [PUT /users/forceLogout/[deviceId]](#put-usersforcelogoutdeviceid)
- [PUT /users/forceLogoutAll](#put-usersforcelogoutall)
- [GET /users/myProfile](#get-usersmyprofile)
- [GET /users/activeSessions](#get-usersactivesessions)
- [GET /users/sendVerifyEmail](#get-userssendverifyemail)
- [GET /users/verifyEmail/[token]](#get-usersverifyemailtoken)
- [POST /users/uploadProfileImage/](#post-usersuploadprofileimage)
- [DELETE /users/removeProfileImage/[filename]](#delete-usersremoveprofileimagefilename)
- [PUT /users/setFavoriteGenres/[genres]](#put-userssetfavoritegenresgenres)


## auth
> put `accessToken` in each request header.
>
> also send `refreshToken` cookie in each request.
>> for mobile phones or situations where cookies are not available, send `refreshToken` into headers and use `noCookie=true` parameter in api routes to receive it.
>
> api routes send code 403 when `accessToken` is invalid or out of date. (getToken again)
>
> api routes send code 401 when `refreshToken` is invalid or out of date or revoked. (must log in again)
>
> `users/getToken` route also generates new refreshToken and must replace the existing on client


### POST /users/signup
> receives { __username__, __email__, __password__, __confirmPassword__, __deviceInfo__ } in request body. ([DeviceInfo schema](SCHEMA.README.md#Device-Info))
>
> return Tokens and also `refreshToken`. ([Tokens schema](SCHEMA.README.md#Tokens))


### POST /users/login
> receives { __username_email__, __password__, __deviceInfo__ } in request body. ([DeviceInfo schema](SCHEMA.README.md#Device-Info))
> 
> __username_email__ means user can log in with username or email address.
> 
> return Tokens and also `refreshToken`. ([Tokens schema](SCHEMA.README.md#Tokens))


### PUT /users/getToken
> receives __deviceInfo__ in request body. ([DeviceInfo schema](SCHEMA.README.md#Device-Info))
> 
> return __Tokens__ and also `refreshToken`. ([Tokens schema](SCHEMA.README.md#Tokens))


### PUT /users/logout
> return __accessToken__ as empty string and also reset/remove `refreshToken` cookie if use in browser. in other environments reset `refreshToken` from client after successful logout.


### PUT /users/forceLogout/[deviceId]
> return remaining active sessions in field __activeSessions__. ([session schema](SCHEMA.README.md#Session))


### PUT /users/forceLogoutAll
> force logout all session except current session.
> 
> return __activeSessions__ as empty array.


### GET /users/myProfile
> return users profile data. ([profile schema](SCHEMA.README.md#Profile))

Example: https://downloader-node-api.herokuapp.com/users/myProfile?testUser=true


### GET /users/activeSessions
> return users current session and other active sections. ([session schema](SCHEMA.README.md#Session))

Example: https://downloader-node-api.herokuapp.com/users/activeSessions?testUser=true


### GET /users/sendVerifyEmail
> send an email with an activation link. the link will expire after 6 hour.
> 
> maybe email goes to spam folder.

Example: https://downloader-node-api.herokuapp.com/users/sendVerifyEmail?testUser=true


### GET /users/verifyEmail/[token]
> verify given email token. create activation link on server side.

Example: https://downloader-node-api.herokuapp.com/users/verifyEmail/tokkkkken?testUser=true


### POST /users/uploadProfileImage
> receive profileImage from request body.
> 
> returns new profileImages array.
> 
> file size limited to `1mb` and accept `jpg` formats only, (error code 400).
> 
> **Note: 20 profile image per user, (error code 409)**.


### DELETE /users/removeProfileImage/[filename]
> returns new profileImages array.


### PUT /users/setFavoriteGenres/[genres]
> **Note: maximum number of genres is 6, (error code 409)**


# Computed Data
- every week at 01:00 of sunday, extract favorite genres from last 500 titles from [like, save, follow, finished] movies.


# API
- Open [admin api docs](API.ADMIN.README.md).
- Open [movie api docs](API.MOVIES.README.md).
- Open [schema](SCHEMA.README.md).
