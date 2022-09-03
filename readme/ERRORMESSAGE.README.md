## Error Messages

```js
errorMesages = {
    serverError: "Server error, try again later",
    exceedProfileImage: "Exceeded 20 profile image",
    exceedGenres: "Exceeded number of genres limit (6)",
    movieSourcesNotFound: "Movie sources not found",
    moviesNotFound: "Movies not found",
    movieNotFound: "Movie not found",
    genresNotFound: "Genres not found",
    documentsNotFound: "Documents not found",
    documentNotFound: "Document not found",
    staffNotFound: "Staff not found",
    characterNotFound: "Character not found",
    mscNotFound: "Movie/Staff/Character not found",
    scNotFound: "Staff/Character not found",
    userNotFound: "Cannot find user",
    profileImageNotFound: "Cannot find profile image",
    emailNotFound: "Cannot find user email",
    invalidRefreshToken: "Invalid RefreshToken",
    invalidToken: "Invalid/Stale Token",
    invalidDeviceId: "Invalid deviceId",
    userPassNotMatch: "Username and password do not match",
    badRequestBody: "Incorrect request body",
    usernameAlreadyExist: "This username already exists",
    emailAlreadyExist: "This email already exists",
    alreadyExist: "Already exist"
}
```

<br/>

## Query parameters

```js
queryParamErrors = {
    USERNAME_IS_EMPTY: "Username Is Empty",
    EMAIL_IS_EMPTY: "Email Is Empty",
    USERNAME_LENGTH_MUST_BE_MORE_THAN_6: "Username Length Must Be More Than 6",
    USERNAME_LENGTH_MUST_BE_LESS_THAN_50: "Username Length Must Be Less Than 50",
    USERNAME_BAD_FORMAT: "Only a-z, 0-9, and underscores are allowed",
    EMAIL_IS_IN_WRONG_FORMAT: "Email Is in Wrong Format",
    PASSWORD_IS_EMPTY: "Password Is Empty",
    PASSWORD_LENGTH_MUST_BE_MORE_THAN_8: "Password Length Must Be More Than 8",
    PASSWORD_LENGTH_MUST_BE_LESS_THAN_50: "Password Length Must Be LESS Than 50",
    PASSWORDS_DONT_MATCH: "Passwords Don\'t Match",
    PASSWORD_IS_EQUAL_WITH_USERNAME: "Password Is Equal With Username",
    Password_Must_Contain_A_Number: "Password Must Contain A Number",
    Password_Must_Contain_An_Uppercase: "Password Must Contain An Uppercase",
    Password_Cannot_Have_Space: "Password Cannot Have Space",

    id: "Invalid parameter id :: MongoId",
    title: "Invalid parameter title :: String",
    types: "Invalid parameter types :: (movie|serial|anime_movie|anime_seria)",
    dataLevel: "Invalid parameter dataLevel :: (dlink|low|telbot|medium|info|high)",
    malScores: "Invalid parameter malScores :: ([0-10]-[0-10])",
    imdbScores: "Invalid parameter imdbScores :: ([0-10]-[0-10])",
    genres: "Invalid parameter genres :: String",
    statType: "Invalid parameter statType :: (${statTypes.join("|")})",
    sortBase: "Invalid parameter sortBase :: (${sortBases.join("|")})",
    dayNumber: "Invalid parameter dayNumber :: Number 0 to 6",
    count: "Invalid parameter count :: Number 1 to Infinite",
    page: "Invalid parameter page :: Number 1 to Infinite",
    date: "Invalid parameter date :: (Date String | Time in milliseconds)",
    years: "Invalid parameter years :: ([dddd]-[dddd])",
    age: "Invalid parameter age :: \d+-\d+",
    seasons: "Invalid parameter seasons :: (\d+ | \d+-\d+)",
    numberOfSeason: "Invalid parameter numberOfSeason :: (\d+ | \d+-\d+)",
    japaneseNames: "Invalid parameter japaneseNames :: (array of string, {min:1, max:20})",
    deviceId: "Invalid parameter deviceId :: String(UUID)",
    remove: "Invalid parameter remove :: (true|false)",
    settingName: "Invalid parameter settingName :: String",
    'settings.**': "Missed parameter settings.**",
    'settings.**': "Wrong parameter settings.**",
    'settings.**': "Invalid parameter settings.** :: String",

}
```

<br/>
<br/>

## Docs

- Open [admin api docs](API.ADMIN.README.md).
- Open [user api docs](API.USER.README.md).
- Open [movie api docs](API.MOVIES.README.md).
- Open [schema](SCHEMA.README.md).
