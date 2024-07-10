# Web Server
This repository contains the source code of the web server, which is part of the [Underwater Camera Project](https://underwater-camera-project.github.io).

## Features

The service provides a web page on port 8081 containing the underwater camera's MPJPEG video stream, a menu for changing the camera module's settings (e.g. contrast) and a section showing the values reported by the monitoring service. Don't access it directly, as web browsers will block the video. The reason for this is that the web content comes from a different service/port than the video. This is enough for a browser to think that the two sources are not part of the same thing and block the video from downloading. To solve this, a proxy (nginx) was used in the underwater camera project.

## Installation

The following steps describe how to install the monitoring service on your Raspberry Pi.

1. Execute `sudo apt-get update`.
2. Execute `sudo apt install nodejs npm` to install the JavaScript runtime environment.
5.  Clone this repository
6.  Execute `build.sh`

## Starting the service

Execute `start.sh`.
