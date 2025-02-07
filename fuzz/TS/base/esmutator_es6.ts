// esmutator_es6.ts
import * as bt from "@babel/types";
import { NodePath } from "@babel/traverse";
import { TSNode } from "./esparse";
import { MutateChange, MUTATE_NODE } from "./esmutator";
import { Random } from "./utils";
import { TestCase } from "./estestcase";

import { INTERESTING_VALUES } from "../config";

/**
 * 랜덤 알파벳 3글자 문자열을 생성하는 헬퍼 함수.
 * (예: "abc", "xyz" 등)
 */
function randomAlphaString(length: number): string {
    const chars = "abcdefghijklmnopqrstuvwxyz";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Random.number(chars.length));
    }
    return result;
}

/*────────────────────────────
  [1] 객체 프로퍼티 변형 확장
────────────────────────────*/
export function mutateObjectProperty(tc: TestCase, path: NodePath<bt.ObjectExpression>): MutateChange | null {
    const objExpr = path.node;
    const properties = objExpr.properties;
    if (!properties) return null;
    
    // --- 기존 데이터가 없는 경우 ---
    if (properties.length === 0) {
        const newKey = bt.identifier(randomAlphaString(Random.range(1, 5))); // 예: "xyz"
        const newValue = bt.numericLiteral(Random.pick(INTERESTING_VALUES));
        const newProp = bt.objectProperty(newKey, newValue);
        properties.push(newProp);
        const propPaths = path.get("properties") as NodePath<bt.ObjectProperty>[];
        return { type: MUTATE_NODE, path: propPaths[propPaths.length - 1], old: null, new: newProp };
    }
    
    // --- 기존 데이터가 있을 경우 ---
    const r = Random.range(0, 5); // 0 ~ 6, 총 7가지 경우
    if (r === 0) {
        // 1/5 확률: 기존 데이터 중 1개의 키 이름 변경
        const idx = Random.number(properties.length);
        const prop = properties[idx];
        // SpreadElement는 건너뛰고, ObjectProperty 또는 ObjectMethod인 경우만 처리
        if (bt.isObjectProperty(prop) || bt.isObjectMethod(prop)) {
        if (bt.isIdentifier(prop.key)) {
            const oldKey = prop.key;
            const newKey = bt.identifier(randomAlphaString(Random.range(1, 5)));
            prop.key = newKey;
            const propertiesPaths = path.get("properties") as NodePath<bt.ObjectProperty | bt.ObjectMethod>[];
            return { 
            type: MUTATE_NODE, 
            path: (propertiesPaths[idx].get("key") as unknown) as NodePath<bt.Node>, 
            old: oldKey, 
            new: newKey 
            };
        } else if (bt.isStringLiteral(prop.key)) {
            const oldKey = prop.key;
            const newKey = bt.stringLiteral(randomAlphaString(Random.range(1, 5)));
            prop.key = newKey;
            const propertiesPaths = path.get("properties") as NodePath<bt.ObjectProperty | bt.ObjectMethod>[];
            return { 
            type: MUTATE_NODE, 
            path: (propertiesPaths[idx].get("key") as unknown) as NodePath<bt.Node>, 
            old: oldKey, 
            new: newKey 
            };
        }
        }
        return null;
    } else {
        // 4/5 확률: 기존 데이터 중 사이에 키 추가
        const insertIdx = Random.number(properties.length + 1);
        const newKey = bt.identifier(randomAlphaString(Random.range(1, 5)));
        const newValue = bt.numericLiteral(Random.pick(INTERESTING_VALUES));
        const newProp = bt.objectProperty(newKey, newValue);
        properties.splice(insertIdx, 0, newProp);
        return { type: MUTATE_NODE, path: path, old: null, new: newProp };
    }
}

/*────────────────────────────
  [2] 배열 변형 확장
────────────────────────────*/
export function mutateArrayExpression(tc: TestCase, path: NodePath<bt.ArrayExpression>): MutateChange | null {
    const arrExpr = path.node;
    const elements = arrExpr.elements;
    if (!elements) return null;

    const option = Random.range(0, 2);

    // console.log("option =", option);
    if (option === 0 && elements.length > 0) {
        // [옵션 0] 요소 삭제: 배열의 임의 인덱스 요소를 제거한 새로운 배열을 만듦.
        const idx = Random.number(elements.length);
        const newElements = elements.slice(); // 기존 요소 복사
        const removedElem = newElements.splice(idx, 1)[0];
        const newArrayExpr = bt.arrayExpression(newElements);
        return { type: MUTATE_NODE, path: path, old: arrExpr, new: newArrayExpr };
        
    } else if (option === 1) {
        // [옵션 1] 요소 삽입: 배열의 임의 위치에 새 숫자 리터럴을 삽입한 새로운 배열을 만듦.
        const newElem = bt.numericLiteral(Random.pick(INTERESTING_VALUES));
        const idx = Random.number(elements.length + 1);
        const newElements = elements.slice(); // 기존 요소 복사
        newElements.splice(idx, 0, newElem);
        const newArrayExpr = bt.arrayExpression(newElements);
        return { type: MUTATE_NODE, path: path, old: arrExpr, new: newArrayExpr };
        
    } else if (option === 2 && elements.length >= 2) {
        // [옵션 2] 요소 스왑: 배열 내 두 요소의 순서를 바꾼 새로운 배열을 만듦.
        const newElements = elements.slice(); // 복사
        const idx1 = Random.number(newElements.length);
        let idx2 = Random.number(newElements.length);
        while (idx2 === idx1) {
        idx2 = Random.number(newElements.length);
        }
        const tmp = newElements[idx1];
        newElements[idx1] = newElements[idx2];
        newElements[idx2] = tmp;
        const newArrayExpr = bt.arrayExpression(newElements);
        return { type: MUTATE_NODE, path: path, old: arrExpr, new: newArrayExpr };
    }

    return null;
}

/*────────────────────────────
  [3] 함수 매개변수 변형 확장
────────────────────────────*/
export function mutateFunctionParameters(tc: TestCase, path: NodePath<bt.Function>): MutateChange | null {
  const option = Random.range(0, 5);
  if (option === 0) {
    // 변경 전 함수 전체 노드를 deep clone 합니다.
    const oldNode = bt.cloneDeep(path.node);
    
    const funcNode = path.node;
    const newParam = bt.identifier(randomAlphaString(Random.range(1, 5)));
    // 추가 위치: 시작 또는 끝 (랜덤 결정)
    const idx = 0;
    funcNode.params.splice(idx, 0, newParam);
    
    // 변경 후 함수 전체 노드를 deep clone 하여 반환합니다.
    return { type: MUTATE_NODE, path: path, old: oldNode, new: bt.cloneDeep(funcNode) };
  } else if (option === 1 || option === 2) {
    // 변경 전 함수 전체 노드를 deep clone 합니다.
    const oldNode = bt.cloneDeep(path.node);
    
    const funcNode = path.node;
    const newParam = bt.identifier(randomAlphaString(Random.range(1, 5)));
    // 추가 위치: 시작 또는 끝 (랜덤 결정)
    const idx = funcNode.params.length;
    funcNode.params.splice(idx, 0, newParam);
    
    // 변경 후 함수 전체 노드를 deep clone 하여 반환합니다.
    return { type: MUTATE_NODE, path: path, old: oldNode, new: bt.cloneDeep(funcNode) };
  }

  return null;
}

/*────────────────────────────
  [4] async 변형
  
  동기 함수(동기적 FunctionDeclaration, FunctionExpression, ArrowFunctionExpression)를
  비동기 함수로 변경한다.
────────────────────────────*/
export function mutateFunctionToAsync(tc: TestCase, path: NodePath<bt.Function>): MutateChange | null {
  const option = Random.range(0, 4);
  if (option === 0) {  
    // 클론을 통해 변경한 새 노드 생성 (deep clone)
    const oldNode = path.node;
    // bt.cloneNode는 기본적으로 shallow clone이므로,
    // 필요한 경우 deep clone을 구현하거나, 단순히 async 플래그만 변경할 수 있다.
    // const newNode = bt.cloneNode(oldNode, /* deep */ true) as bt.Function;
    const newNode = bt.cloneDeep(oldNode);
    newNode.async = true;
    // 여기서 추가: 함수 내부에 await가 필요한 부분이 있다면,
    // 해당 부분은 별도의 mutation으로 처리할 수 있음 (여기서는 단순히 async 추가만 함)
    
    return { type: MUTATE_NODE, path: path, old: oldNode, new: newNode };
  }

  return null;
}

/*────────────────────────────
  [5] await 변형
  
  AwaitExpression에서 await 키워드를 제거하여, 해당 표현식을 단순히 그 인자로 대체한다.
────────────────────────────*/
export function mutateRemoveAwait(tc: TestCase, path: NodePath<bt.AwaitExpression>): MutateChange | null {
  const option = Random.range(0, 3);
  if (option === 0) {
  
    const oldNode = path.node;
    // await의 인자를 new node로 사용한다.
    const newNode = oldNode.argument;
    if (!newNode) {
      return null;
    }
    
    return { type: MUTATE_NODE, path: path, old: oldNode, new: newNode };
  }
  return null;
}

/*────────────────────────────
  [5] class 및 prototype 변형
────────────────────────────*/
export function mutateClassPrototype(tc: TestCase, path: NodePath<bt.ClassDeclaration | bt.ClassExpression>): MutateChange | null {
  const classNode = path.node;
  if (!classNode.body || !classNode.body.body) return null;
  const methods = classNode.body.body.filter(member => bt.isClassMethod(member));
  if (methods.length === 0) return null;
  
  const option = Random.range(0, 3);
  if (option === 0) {
    const idx = Random.number(methods.length);
    const method = methods[idx] as bt.ClassMethod;
    if (bt.isIdentifier(method.key)) {
      const oldKey = method.key;
      const newKey = bt.identifier(oldKey.name + "_mut");
      method.key = newKey;
      const methodsPaths = path.get("body").get("body") as NodePath<bt.ClassMethod>[];
      return { type: MUTATE_NODE, path: (methodsPaths[idx].get("key") as unknown) as NodePath<bt.Node>, old: oldKey, new: newKey };
    }
  } else if (option === 1) {
    const idx = Random.number(methods.length);
    const removedMethod = methods[idx];
    classNode.body.body = classNode.body.body.filter(member => member !== removedMethod);
    return { type: MUTATE_NODE, path: path, old: removedMethod, new: null };
  } else if (option === 2) {
    const dummyMethod = bt.classMethod(
      "method",
      bt.identifier("dummy" + Random.prefix(2)),
      [],
      bt.blockStatement([bt.expressionStatement(bt.stringLiteral("dummy method"))])
    );
    classNode.body.body.push(dummyMethod);
    return { type: MUTATE_NODE, path: path, old: null, new: dummyMethod };
  }
  return null;
}

/*────────────────────────────
  [6] Object.assign → Spread 변형
────────────────────────────*/
export function mutateObjectAssignToSpread(tc: TestCase, path: NodePath<bt.CallExpression>): MutateChange | null {
  const callExpr = path.node;
  // 첫 번째 인자가 빈 객체인지 확인
  if (callExpr.arguments.length < 1) return null;
  const firstArg = callExpr.arguments[0];
  if (!bt.isObjectExpression(firstArg)) return null;
  if (firstArg.properties.length > 0) return null;

  // 나머지 인수들을 spread element로 변환
  const newProperties = callExpr.arguments.slice(1).map(arg => bt.spreadElement(arg as bt.Expression));
  const newObjExpr = bt.objectExpression(newProperties);
  
  return { type: MUTATE_NODE, path: path, old: callExpr, new: newObjExpr };
}
