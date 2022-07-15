#!/bin/bash
if [ ! -n "$1" ]
then
    echo "请输入"
    exit 2
else 
    echo "提交：" $1
    npm run test
    git status
    git add  .
    git commit -m $1
    git push
fi

