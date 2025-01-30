#!/bin/bash

pushd fuzz/TS
npm i
node_modules/.bin/tsc
popd

pushd fuzz/afl
make clean
make all
popd
