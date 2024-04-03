## API Parameters

| param name | Values            | Description                    | Required |
|------------|-------------------|--------------------------------|----------|
| appName    | String            | The name of the application    | true     |
| os         | String            | The os of the application      | true     |
| version    | String (\d.\d.\d) | The version of the application | true     |


## API Resources

- [GET /utils/getMessage](#get-utilsgetmessage)
- [GET /utils/getApps](#get-utilsgetapps)
- [GET /utils/checkAppUpdate/[appName]/[os]/[version]](#get-utilscheckappupdateappnameosversion)

<br />
<br />


### GET /utils/getMessage
> return global message

<br />


### GET /utils/getApps
> return apps with their data <br />
> receive optional query param `appName`.

<br />


### GET /utils/checkAppUpdate/[appName]/[os]/[version]
> return apps with their data <br />

<br />


# API
- Open [user api docs](API.USER.README.md).
- Open [movies api docs](API.MOVIES.README.md).
- Open [schema](SCHEMA.README.md).
- Open [error messages docs](ERRORMESSAGE.README.md).
- Open [configs schema](CONFIGS.README.md).