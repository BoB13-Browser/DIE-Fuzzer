#!/bin/bash

rm -rf chakracore-master/out/Debug/

export CC="$PWD/../fuzz/afl/afl-clang-fast"
export CXX="$PWD/../fuzz/afl/afl-clang-fast++"

pushd chakracore-master
patch -p0 < ../utils/new-chakra.patch

export AFL_USE_ASAN=1
export CXXFLAGS="-O1 -fno-omit-frame-pointer"
export CFLAGS="-O1 -fno-omit-frame-pointer"

./build.sh --static -j $(nproc) -d --cc=$CC --cxx=$CXX 