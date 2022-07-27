#!/bin/bash
if [ ! -n "$*" ]
then
    echo "请输入"
    exit 2
else 
    echo "提交：" $*
    npm run test
    git status
    git add  .
    git commit -m "$*"
    git push
fi

