#!/bin/bash

rm -rf gecko-dev/js/src/build_OPT

export CC="$PWD/../fuzz/afl/afl-clang-fast"
export CXX="$PWD/../fuzz/afl/afl-clang-fast++"

pushd gecko-dev/js/src

autoconf2.13

mkdir "build_OPT"
pushd "build_OPT"

../configure --enable-debug --enable-jit --disable-tests
make -j$(nproc)
popd