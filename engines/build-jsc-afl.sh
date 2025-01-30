#!/bin/bash

export CC="$PWD/compiler/clang" 
export CXX="$PWD/compiler/clang++" 

pushd WebKit-master
./Tools/Scripts/build-jsc --jsc-only --debug --cmakeargs="-DENABLE_STATIC_JSC=ON"