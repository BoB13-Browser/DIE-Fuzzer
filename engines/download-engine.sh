#!/bin/bash

# check webkit latest here: https://webkitgtk.org/releases/

if [ -z $1 ] ; then
  echo "usage: $0 <engines> (engines : ch, jsc, v8, sm, hm)"
fi

if [ "$1" = "jsc" ] ; then
  git clone https://github.com/WebKit/WebKit.git WebKit-master
elif [ "$1" = "ch" ] ; then
  git clone --single-branch --branch master https://github.com/Microsoft/ChakraCore.git chakracore-master
elif [ "$1" = "v8" ] ; then
  mkdir v8-master
  pushd v8-master
  export PYTHONHTTPSVERIFY=0
  fetch v8
  popd
elif [ "$1" = "sm" ]; then
  git clone https://github.com/mozilla/gecko-dev.git
elif [ "$1" = "hm" ]; then
  git clone https://github.com/facebook/hermes.git hermes-master
fi