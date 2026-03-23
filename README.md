# Web Server
This repository contains the source code of the web server, which is part of the [Underwater Camera Project](https://underwater-camera-project.github.io).

## Features

The service provides a web page on port 8081 containing the underwater camera's MPJPEG video stream, a menu for changing the camera module's settings (e.g. contrast) and a section showing the values reported by the monitoring service. Don't access it directly, as web browsers will block the video. The reason for this is that the web content comes from a different service/port than the video. This is enough for a browser to think that the two sources are not part of the same thing and block the video from downloading. To solve this, a proxy (nginx) was used in the underwater camera project.

## Installation

The following steps describe how to install the monitoring service on your Raspberry Pi.

1. Execute `sudo apt-get update`.
2. Execute `sudo apt install nodejs npm` to install the JavaScript runtime environment.
3. Navigate to your home folder by executing `cd`.
4. Execute `git clone https://github.com/tederer/octowatch-webservice.git` to clone this repository.
5. Execute `cd ./octowatch-webservice` to navigate to root folder of the project.
6. Execute `build.sh` to install all dependencies ond build the project.

## Starting the service

Execute `start.sh`.

## Starting the service automatically

To enable automatic start at system boot, create a file called `octowatch-webserver.service` in `/usr/lib/systemd/system` containing the following content (replace `<user>`, `<group>` and `<user-home>` with the corresponding values for your system):

```
[ Unit ]
Description = OctoWatch WebServer Service
After = network-online.target
Wants = network-online.target

[ Service ]
Type = simple
User = <user>
Group =<group>
ExecStart = <user-home>/octowatch-webservice/start.sh

[ Install ]
WantedBy = multi-user.target
