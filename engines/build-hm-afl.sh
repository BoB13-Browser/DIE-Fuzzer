#!/bin/bash

export CC="$PWD/../fuzz/afl/afl-clang-fast"
export CXX="$PWD/../fuzz/afl/afl-clang-fast++"
export LLVM_DIR="/usr/lib/llvm-18"
export AFL_USE_ASAN=1

pushd hermes-master
mkdir build
pushd build

cmake .. \
  -DCMAKE_BUILD_TYPE=Debug \
  -DCMAKE_C_COMPILER="$CC" \
  -DCMAKE_CXX_COMPILER="$CXX"
  
make -j$(nproc)

popd
