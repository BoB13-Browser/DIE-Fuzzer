#!/bin/bash

export CC="$PWD/../fuzz/afl/afl-clang-fast"
export CXX="$PWD/../fuzz/afl/afl-clang-fast++"
export LLVM_DIR="/usr/lib/llvm-18"
export AFL_USE_ASAN=1

pushd jerryscript
mkdir build_afl
pushd build_afl

cmake .. \
    -DCMAKE_C_COMPILER="$CC" \
    -DCMAKE_CXX_COMPILER="$CXX" \
    -DCMAKE_BUILD_TYPE=Debug \
    -DJERRY_DEBUGGER=ON \
    -DJERRY_ERROR_MESSAGES=ON \
    -DENABLE_LTO=OFF
make -j$(nproc)

popd
