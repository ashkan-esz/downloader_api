# API Parameters

| param name                   | Values                                   | Description                                                           | Required |
|------------------------------|------------------------------------------|-----------------------------------------------------------------------|----------|
| **`username`**               | string                                   | match <code>/^[a-z&#124;0-9_-]+$/gi</code> and length in range [6-50] | `true`   |
| **`email`**                  | string                                   |                                                                       | `true`   |
| **`password`**               | string                                   | at least one number and capital letter  and length in range [8-50]    | `true`   |
| **`confirmPassword`**        | string                                   |                                                                       | `true`   |
| **`deviceInfo`**             | String                                   | includes fields _appName_, _appVersion_, _os_, _deviceModel_          | `true`   |
| **`deviceInfo.appName`**     | String                                   | example: downloader_app, downloader_web, downloader_desktop           | `true`   |
| **`deviceInfo.appVersion`**  | String                                   | example: 1.0.0, 4.5.2                                                 | `true`   |
| **`deviceInfo.os`**          | String                                   | example: Android, Ios, Windows                                        | `true`   |
| **`deviceInfo.deviceModel`** | String                                   | example: SM-A525F, Samsung Galaxy A52, iPhone 6S, Desktop             | `true`   |
| **`deviceId`**               | String                                   | unique id of session                                                  | `true`   |
| **`filename`**               | String                                   |                                                                       | `true`   |
| **`genres`**                 | Array of String joined by '-'            | example: action or action-comedy-drama or action-sci_fi               | `true`   |
| **`settingName`**            | _movie_, _downloadLinks_, _notification_ |                                                                       | `true`   |


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
- [POST /users/uploadProfileImage](#post-usersuploadprofileimage)
- [DELETE /users/removeProfileImage/[filename]](#delete-usersremoveprofileimagefilename)
- [PUT /users/setFavoriteGenres/[genres]](#put-userssetfavoritegenresgenres)
- [GET /users/allUserSettings](#get-usersallusersettings)
- [GET /users/userSettings/[settingName]](#get-usersusersettingssettingname)
- [PUT /users/changeUserSettings/[settingName]](#put-userschangeusersettingssettingname)


## Auth
> put `accessToken` in each request header.
>
> also send `refreshToken` cookie in each request.
>> **NOTE: for mobile phones or situations where cookies are not available, send `refreshToken` into headers and use `noCookie=true` parameter in api routes to receive it.**
>
> api routes send code 403 when `accessToken` is invalid or out of date. (getToken again)
>
> api routes send code 401 when `refreshToken` is invalid or out of date or revoked. (must log in again)
>
> `users/getToken` route also generates new refreshToken and must replace the existing on client

<details>
<summary>
More Info
</summary>

- #### for web browsers:
  1. Save `accessToken` into a variable.
  2. Put `accessToken` in headers for all the requests.
  3. When user `login` or `signup` you will receive `accessToken`.
  4. After some time `accessToken` will get invalid and server gives 403 error.
  5. After getting 403 error, use `getToken` api to receive new `accessToken` and replace it in client.
  6. Along with `accessToken` you receive `accessToken_expire` witch shows the time `accessToken` get invalid.
  7. It's better to watch for it before request and call `getToken` to receive new `accessToken` this way you prevent from getting 403 error.
  8. If you get 401 error, you should remove and `accessToken` and redirect user to login page.
  9. When user is logged in and closes the browser, after opening browser again `accessToken` doesn't exist, so you should call `getToken` api before calling apis.


<br/>

- #### for clients without ability to use cookie, like mobile apps:
  1. add `?noCookie=true` at the end of login/signup/getToken api url.
  2. Save `accessToken` and `refreshToken` into variables.
  3. `refreshToken` should be saved to client storage secretly.
  4. Put `accessToken` and `refreshToken` in headers for all the requests.
  5. When user `login` or `signup` you will get `accessToken` and `refreshToken`.
  6. After some time `accessToken` will get invalid and server gives 403 error.
  7. After getting 403 error, use `getToken` api to receive new `accessToken` and `refreshToken` and replace them in client.
  8. Along with `accessToken` you receive `accessToken_expire` witch shows the time `accessToken` get invalid.
  9. It's better to watch for it before request and call `getToken` to receive new `accessToken` this way you prevent from getting 403 error.
  10. If you get 401 error, you should remove `accessToken` and `refreshToken` redirect user to login page.
  11. When user is logged in and closes the browser, after opening browser again `accessToken` and `refreshToken` doesn't exist, so you should call `getToken` api before calling apis.
</details>

<br/>

<details>
<summary>
DeviceInfo Example
</summary>

```javascript
deviceInfo = {
    appName:"downloader_app",
    appVersion:"1.0.0",
    os:"Android",
    deviceModel:"SM-A525F",
}
```

</details>


<br/>

### POST /users/signup
> receives { __username__, __email__, __password__, __confirmPassword__, __deviceInfo__ } in request body. ([DeviceInfo schema](SCHEMA.README.md#Device-Info))
>
> return Tokens and also `refreshToken`. ([Tokens schema](SCHEMA.README.md#Tokens))

<details>
<summary>
Example Code
</summary>

```Dart
--- (Dart - flutter)

Future<String> signUpUser(String userName, String email, String password,
    String confirmPassword) async {
  try {
    final response = await dio.post(
      'users/signup?noCookie=true',
      data: jsonEncode(<String, dynamic>{
        'username': userName,
        'email': email,
        'password': password,
        'confirmPassword': confirmPassword,
        'deviceInfo': deviceInfo,
      }),
    );
    if (response.statusCode == 201) {
      userClient = UserClient.fromJson(response.data);
      Preferences.writeUser(userClient);
      return '201';
    } else {
      return response.data["errorMessage"];
    }
  }catch(error){
    return 'wrong username or password';
  }
}
```
</details>

<br/>

### POST /users/login
> receives { __username_email__, __password__, __deviceInfo__ } in request body. ([DeviceInfo schema](SCHEMA.README.md#Device-Info))
> 
> __username_email__ means user can log in with username or email address.
> 
> return Tokens and also `refreshToken`. ([Tokens schema](SCHEMA.README.md#Tokens))

<details>
<summary>
Example Code
</summary>

```Dart
--- (Dart - flutter)

Future<String> logInUser(String userName, String password) async {
  try {
    final response = await dio.post(
      'users/login?noCookie=true',
      data: jsonEncode(<String, dynamic>{
        'username_email': userName,
        'password': password,
        'deviceInfo': deviceInfo,
      }),
    );
    if (response.statusCode == 200) {
      userClient = UserClient.fromJson(response.data);
      await Preferences.writeUser(userClient);
      return '200';
    } else {
      return response.data['errorMessage'];
    }
  } catch (error) {
    return 'wrong username or password';
  }
}
```
</details>

<br/>

### PUT /users/getToken
> receives __deviceInfo__ in request body. ([DeviceInfo schema](SCHEMA.README.md#Device-Info))
> 
> return __Tokens__ and also `refreshToken`. ([Tokens schema](SCHEMA.README.md#Tokens))

<br/>

### PUT /users/logout
> return __accessToken__ as empty string and also reset/remove `refreshToken` cookie if use in browser. in other environments reset `refreshToken` from client after successful logout.

<br/>

### PUT /users/forceLogout/[deviceId]
> return remaining active sessions in field __activeSessions__. ([session schema](SCHEMA.README.md#Session))

<br/>

### PUT /users/forceLogoutAll
> force logout all session except current session.
> 
> return __activeSessions__ as empty array.

<br/>

### GET /users/myProfile
> return users profile data. ([profile schema](SCHEMA.README.md#Profile))

Example: https://downloader-node-api.herokuapp.com/users/myProfile?testUser=true

<br/>

### GET /users/activeSessions
> return users current session and other active sections. ([session schema](SCHEMA.README.md#Session))

Example: https://downloader-node-api.herokuapp.com/users/activeSessions?testUser=true

<br/>

### GET /users/sendVerifyEmail
> send an email with an activation link. the link will expire after 6 hour.
> 
> maybe email goes to spam folder.
>
> **NOTE: limited to 2 call per minute**

Example: https://downloader-node-api.herokuapp.com/users/sendVerifyEmail?testUser=true

<br/>

### GET /users/verifyEmail/[token]
> verify given email token. create activation link on server side.
> 
> **NOTE: limited to 2 call per minute**

Example: https://downloader-node-api.herokuapp.com/users/verifyEmail/tokkkkken?testUser=true

<br/>

### POST /users/uploadProfileImage
> receive profileImage from request body.
>> **Note: send data as formData and don't forget to set contentType**
> 
> returns new profileImages array.
> 
> file size limited to `1mb` and accept `jpg` formats only, (error code 400).
> 
> **Note: 20 profile image per user, (error code 409)**.

<details>
<summary>
Example Code
</summary>

```Dart
--- (Dart - flutter)

Future<List<String>> addProfileImage(File file) async {
  try {
    String fileName = file.path.split('/').last;
    FormData formData = FormData.fromMap({
      'profileImage': await MultipartFile.fromFile(file.path, filename:fileName, contentType: MediaType("image", "jpg"))});

    final response = await dio.post(
      'users/uploadProfileImage?noCookie=true',
      data: formData,
    );
    return response.data['data']['profileImages'].cast<String>();
  } catch (error) {
    print('sth wrong  :  $error');
    return [];
  }
}
```
</details>

<br/>



## Profile Image Api

### DELETE /users/removeProfileImage/[filename]
> returns new profileImages array.
>
>> image url: https://profile-image.s3.xxxxx.com/user-userId-timestamp.jpg --> filename: user-userId-timestamp.jpg

<br/>

### PUT /users/setFavoriteGenres/[genres]
> **Note: maximum number of genres is 6, (error code 409)**.

<br/>



## Settings Api

### GET /users/allUserSettings
> returns user settings for movies, downloadLinks and notifications.

<br/>

### GET /users/userSettings/[settingName]
> returns user settings based on __settingName__.

<br/>

### PUT /users/changeUserSettings/[settingName]
> receives object __settings__ in request body. ([profile schema](SCHEMA.README.md#Profile))
> 
> __settings__ fields depends on the value of __settingName__.
> 
> return updated value of setting.

<br/>


## Compute User Stats
**NOTE: every week at 01:00 of sunday, extract favorite genres from last 500 titles from [like, save, follow, finished] movies.**

### PUT /users/computeUserStats
> returns data based on computeUserStats
> 
> **NOTE: limited to 3 call per minute**


<br />

# API
- Open [admin api docs](API.ADMIN.README.md).
- Open [movie api docs](API.MOVIES.README.md).
- Open [schema](SCHEMA.README.md).
- Open [error messages docs](ERRORMESSAGE.README.md).
