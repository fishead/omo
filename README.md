# omo
Oh my OSS command-line tool


## Install
```shell
npm i -g omo
```


### How to use?
```shell
omo --help
```


## Manage Bucket
```shell
omo bucket <action> [flags ...]
```


### Create bucket
```shell
omo bucket create your-bucket-name
```


### Remove bucket
```shell
omo bucket remove your-bucket-name
```


### List files in bucket
```shell
omo bucket list your-bucket-name
```


## Manage Object
```shell
omo object <action> <resource> [flags ...]
```


### Create (or Upload) file (or dir) to OSS
```shell
omo bucket create <file-or-dir>
```


### Remove (or Upload) file (or dir) to OSS
```shell
omo bucket remove <object-key>
```


## Manage Meta
```shell
omo meta <action> [flags ...]
```
