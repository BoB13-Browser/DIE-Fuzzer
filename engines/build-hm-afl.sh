#!/bin/bash

# rm -rf chakracore-master/out/Debug/

export CC="$PWD/../fuzz/afl/afl-clang-fast"
export CXX="$PWD/../fuzz/afl/afl-clang-fast++"
export LLVM_DIR="/usr/lib/llvm-18"

pushd hermes-master
mkdir build
pushd build

cmake .. -DCMAKE_BUILD_TYPE=Debug
make -j$(nproc)

popd