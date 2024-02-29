#!/bin/bash

scriptDir=$(cd $(dirname $0) && pwd)
cd $scriptDir

npm run build 

