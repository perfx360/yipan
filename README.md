# yipan
A teaching and examination system based on MEAN Stack(MongoDB+Express+Angularjs+Node.js). It provides network disk, system and user management, online examination, homework statistics, and sign-in management in class. You can learn more details in two documents under `/doc` folder.

At the part of online examination, we design the intelligent test paper auto-generating system. In order to maintain the greatest degree of difference between test papers, the generating steps are designed as a three-tier random process.

[![Build Status](https://travis-ci.org/boennemann/badges.svg?branch=master)](https://github.com/ylasyn/yixan)
[![Node.js](https://img.shields.io/badge/node-4.x%2C6.x-blue.svg)](https://github.com/nodejs/node)
[![MongoDB](https://img.shields.io/badge/mongodb-2.x%2C3.0%2C3.2-blue.svg)](https://www.mongodb.com/)
[![Open Source Love](https://badges.frapsoft.com/os/v1/open-source.svg?v=102)](https://github.com/ylasyn/yixan)
[![MIT Licence](https://badges.frapsoft.com/os/mit/mit.svg?v=102)](https://opensource.org/licenses/mit-license.php)

## Installation
Download this project:
```bash
$ git clone git@github.com:meior/yipan.git
```

Install dependencies:
```bash
$ cd yipan
$ npm install
$ ./node_modules/.bin/bower install
```

## Deployment
### Data recovery
You should create MongoDB database in `mongo shell` firstly:
```bash
$ use yipan
```

Create database user, role: readWrite:
```bash
$ db.createUser({
    user: 'admin',
    pwd: 'myl',
    roles: [{
      role: 'readWrite',
      db: 'yipan'
    }]
  });
```

Import data from JSON and BSON files which have been packed in folder `/data`, using `mongorestore` command under the root of project:
```bash
$ mongorestore -d yipan --drop ./data -uadmin -pmyl
```

Backing up database from time to time is necessary:
```bash
$ mongodump -uadmin -pmyl -d yipan -o ./data
```

### Start server
Now, you can start the server:
```bash
$ npm start
```

You can visit this system at [http://127.0.0.1:28081](http://127.0.0.1:28081), default port is 28081. Enjoy it.

## Exhibition
Here are some pages of this web application:
![sign](http://7xs1tt.com1.z0.glb.clouddn.com/yipan/exhibition/sign.PNG)
![examation](http://7xs1tt.com1.z0.glb.clouddn.com/yipan/exhibition/examation.PNG)
![marking](http://7xs1tt.com1.z0.glb.clouddn.com/yipan/exhibition/marking.PNG)
![file manage](http://7xs1tt.com1.z0.glb.clouddn.com/yipan/exhibition/file%20manage.PNG)
![file upload](http://7xs1tt.com1.z0.glb.clouddn.com/yipan/exhibition/file%20upload.PNG)
![system manage](http://7xs1tt.com1.z0.glb.clouddn.com/yipan/exhibition/system%20manage.PNG)