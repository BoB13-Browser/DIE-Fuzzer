import * as fs from 'fs';
import { inspect } from "util";

import * as bt from "@babel/types"
import { parse } from "@babel/parser";
import traverse, { Node, NodePath, Binding } from "@babel/traverse"
import generate from "@babel/generator"

import { TSNode } from "./esparse";
import { TestCase } from "./estestcase";
import { dbglog, assert, printf, Random } from "./utils";
import { builder, buildStatementForMutation, buildNodeForMutation } from "./engine/esbuild";
import { Types, st, isEqual, FunctionType } from "./estypes";

// 새 ES6 뮤테이션 모듈 연동
import * as ES6_MUTATOR from "./esmutator_es6";

export type MutateChangeType = 0 | 1;
export const MUTATE_NODE: MutateChangeType = 0; 
export const MUTATE_OPRND: MutateChangeType = 1;
export type MutateChange = { 
    "type": MutateChangeType, 
    "path": NodePath,
    "old": any,
    "new": any 
};

export const TRYTIMES : number = 3;

function isOpMutableExpression(node): boolean {
    return bt.isBinaryExpression(node) 
        || bt.isLogicalExpression(node) 
        || bt.isUnaryExpression(node) 
        || bt.isUpdateExpression(node);
}

export function revertOp(node: TSNode, op: string): void {
    if (isOpMutableExpression(node)) {
        (<any>node).operator = <any>op;
    } else {
        assert(false, "Invalid expression to revert the operand.");
    }
}

export function mutateExpOp(tc: TestCase, path: NodePath): MutateChange {
    let node: TSNode = <TSNode>path.node;
    let change: MutateChange = null;

    if (!Random.number(3)) {
        if (bt.isBinaryExpression(node)) {
            change = builder.BinaryExpressionBuilder.mutateOp(path);
        } else if (bt.isLogicalExpression(node)) {
            change = builder.LogicalExpressionBuilder.mutateOp(path);
        } else if (bt.isUnaryExpression(node)) {
            change = builder.UnaryExpressionBuilder.mutateOp(path);
        } else if (bt.isUpdateExpression(node)) {
            change = builder.UpdateExpressionBuilder.mutateOp(path);
        }
    }

    return change;
}

export function mutate(tc: TestCase, path: NodePath): MutateChange {
    let node: TSNode = <TSNode>path.node;
    let type: Types = node.itype;
  
    // console.log("\n\n\n\n[mutate] Starting mutation for node of type:", node.itype);
  
    // 스킵: FunctionType 또는 undefinedType이면
    // if (type && type instanceof FunctionType || type === st.undefinedType) {
    //   console.log("[mutate] Skipping mutation: node is FunctionType or undefined type");
    //   return null;
    // }
    if (type && type === st.undefinedType) {
        // console.log("[mutate] Skipping mutation: node is FunctionType or undefined type");
        return null;
    }
    
  
    builder.initBuildingContext(tc, path, 0);
  
    // Statement인 경우
    if (bt.isStatement(node)) {
      // console.log("[mutate] Node is a statement");
      if (bt.isExpressionStatement(node)) {
        // console.log("[mutate] Node is an ExpressionStatement branch");
        return buildStatementForMutation(tc, path);
      }
    //   } else {
        // console.log("[mutate] Node is a statement but not an ExpressionStatement, skipping mutation");
        // return null;
    //   }
    }
  
    // Expression 중 op 뮤테이션 시도
    if (bt.isExpression(node) && isOpMutableExpression(node)) {
      // console.log("[mutate] Node is an expression and op mutable; trying mutateExpOp branch");
      let change: MutateChange = mutateExpOp(tc, path);
      if (change) {
        // console.log("[mutate] mutateExpOp succeeded");
        return change;
      } else {
        // console.log("[mutate] mutateExpOp did not yield a change");
      }
    }
  
    // --- ES6+ 뮤테이션 연동 시작 ---

    /*────────────────────────────
    [1] 객체 프로퍼티 변형 확장
    ────────────────────────────*/
    if (bt.isVariableDeclarator(node)) {
        // node가 VariableDeclarator이면, 그 init을 가져옵니다.
        if (node.init && bt.isObjectExpression(node.init)) {
            // console.log("[mutate] Node is a VariableDeclarator with an ObjectExpression init; trying ES6_MUTATOR.mutateObjectProperty on init");
            // path.get("init")를 사용하여 해당 NodePath를 얻습니다.
            let initPath = path.get("init") as NodePath<bt.ObjectExpression>;
            let change = ES6_MUTATOR.mutateObjectProperty(tc, initPath);
            if (change) {
                // console.log("[mutate] ES6_MUTATOR.mutateObjectProperty succeeded on init");
                return change;
            }
        }
    }
    
    /*────────────────────────────
    [2] 배열 변형 확장
    ────────────────────────────*/
    if (bt.isVariableDeclarator(node)) {
        // node가 VariableDeclarator이면, 그 init을 가져옵니다.
        if (node.init && bt.isArrayExpression(node.init)) {
            // console.log("[mutate] Node is an ArrayExpression; trying ES6_MUTATOR.mutateArrayExpression\n");
            // path.get("init")를 사용하여 해당 NodePath를 얻습니다.
            let initPath = path.get("init") as NodePath<bt.ArrayExpression>;
            let change = ES6_MUTATOR.mutateArrayExpression(tc, initPath);
            if (change) {
                // console.log("[mutate] ES6_MUTATOR.mutateArrayExpression succeeded\n");
                return change;
            }
        }
    }

    /*────────────────────────────
    [3] 함수 매개변수 변형 확장
    ────────────────────────────*/
    if (bt.isFunction(node) && !node.async && node.params) {
        // console.log("[mutate] Node is a synchronous function; trying mutateFunctionParameters branch");
        let change = ES6_MUTATOR.mutateFunctionParameters(tc, path as NodePath<bt.Function>);
        if (change) {
            // console.log("[mutate] mutateFunctionParameters succeeded");
            return change;
        }
    }

    /*────────────────────────────
    [4] async 변형
    
    동기 함수(동기적 FunctionDeclaration, FunctionExpression, ArrowFunctionExpression)를
    비동기 함수로 변경한다.
    ────────────────────────────*/
    if (bt.isFunction(node) && !node.async) {
        // console.log("[mutate] Node is a function and not async; trying mutateFunctionToAsync branch");
        let change = ES6_MUTATOR.mutateFunctionToAsync(tc, path as NodePath<bt.Function>);
        if (change) {
            // console.log("[mutate] mutateFunctionToAsync succeeded");
            return change;
        }
    }

    /*────────────────────────────
    [5] await 변형
    
    AwaitExpression에서 await 키워드를 제거하여, 해당 표현식을 단순히 그 인자로 대체한다.
    ────────────────────────────*/
    if (bt.isVariableDeclarator(node) && node.init && bt.isAwaitExpression(node.init)) {
        // console.log("[mutate] Node is a VariableDeclarator with AwaitExpression in init; trying mutateRemoveAwait branch");
        let change = ES6_MUTATOR.mutateRemoveAwait(tc, path.get("init") as NodePath<bt.AwaitExpression>);
        if (change) {
            // console.log("[mutate] mutateRemoveAwait succeeded");
            return change;
        }
    }

    /*────────────────────────────
    [6] Object.assign → Spread 변형
    ────────────────────────────*/
    if (bt.isVariableDeclarator(node) && node.init && bt.isCallExpression(node.init)) {
        const callExpr = node.init;
        const callee = callExpr.callee;
        // Object.assign(...) 인지 확인 (callee가 MemberExpression이고, object가 "Object", property가 "assign")
        if (
            bt.isMemberExpression(callee) &&
            bt.isIdentifier(callee.object) &&
            callee.object.name === "Object" &&
            bt.isIdentifier(callee.property) &&
            callee.property.name === "assign"
        ) {
            // console.log("[mutate] Node is Object.assign; trying mutateObjectAssignToSpread branch");
            let change = ES6_MUTATOR.mutateObjectAssignToSpread(tc, path.get('init') as NodePath<bt.CallExpression>);
            if (change) {
            // console.log("[mutate] mutateObjectAssignToSpread succeeded");
            return change;
            }
        }
    }
    
    // if (bt.isCallExpression(node)) {
    //   console.log("[mutate] Node is a CallExpression; trying ES6_MUTATOR.mutateObjectAssignToSpread\n");
    //   let change = ES6_MUTATOR.mutateObjectAssignToSpread(tc, path as NodePath<bt.CallExpression>);
    //   if (change) {
    //     console.log("[mutate] ES6_MUTATOR.mutateObjectAssignToSpread succeeded\n");
    //     return change;
    //   }
    // }
    // --- ES6+ 뮤테이션 연동 끝 ---
  
    if (type) {
      // console.log("[mutate] Falling back to buildNodeForMutation branch");
      return buildNodeForMutation(tc, path);
    }
  
    // console.log("[mutate] No mutation applied\n");
    return null;
}