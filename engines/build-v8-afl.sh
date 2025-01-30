#!/bin/bash

export CC="$PWD/compiler/clang" 
export CXX="$PWD/compiler/clang++" 

pushd v8-master/v8

export PYTHONHTTPSVERIFY=0
gclient sync

./build/install-build-deps.sh

rm -rf out/Debug
gn args out/Debug
cp ../../utils/args_debug.gn out/Debug/args.gn
gn args out/Debug
mv third_party/llvm-build/Release+Asserts/bin/clang third_party/llvm-build/Release+Asserts/bin/clang.bak
ln -s $PWD/../../compiler/proxy.py third_party/llvm-build/Release+Asserts/bin/clang
ninja -C out/Debug