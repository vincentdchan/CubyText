const a = "a".charCodeAt(0);
const z = "z".charCodeAt(0);

const A = "A".charCodeAt(0);
const Z = "Z".charCodeAt(0);

const n0 = "0".charCodeAt(0);
const n9 = "9".charCodeAt(0);

function insertCodeBetween(begin: number, end: number, candidates: string[]) {
  for (let i = begin; i <= end; i++) {
    candidates.push(String.fromCharCode(i));
  }
}

const candidates: string[] = [];
insertCodeBetween(a, z, candidates);
insertCodeBetween(A, Z, candidates);
insertCodeBetween(n0, n9, candidates);

function randomStr(count: number) {
  let result = "";
  for (let i = 0; i < count; i++) {
    const rand = (Math.random() * candidates.length) | 0;
    result += candidates[rand];
  }
  return result;
}

export function mkAnonymousId(): string {
  return "Anm-" + randomStr(8);
}

function mkDocId(): string {
  return "Doc-" + randomStr(12);
}

function isDocId(id: string): boolean {
  return id.startsWith("Doc-");
}

export function mkCardId(): string {
  return "Crd-" + randomStr(12);
}

function mkBlockId(): string {
  return "Blk-" + randomStr(12);
}

function isBlockId(id: string): boolean {
  return id.startsWith("Blk-");
}

export function mkClientId(userId: string): string {
  return userId + "/CLT" + "-" + randomStr(4);
}

export function mkUserId(): string {
  return "Usr-" + randomStr(12);
}

function mkSpanId(): string {
  return "Spn-" + randomStr(12);
}

function isSpanId(id: string): boolean {
  return id.startsWith("Spn-");
}

function mkChangesetId(): string {
  return "Chs-" + randomStr(12);
}

function isTabId(id: string): boolean {
  return id.startsWith("Tab-");
}

function mkTabId(): string {
  return "Tab-" + randomStr(12);
}

function mkBlobId(): string {
  return "Blb-" + randomStr(12);
}

export interface IdGenerator {
  mkDocId: () => string;
  isDocId: (id: string) => boolean;
  mkBlockId: () => string;
  isBlockId: (id: string) => boolean;
  mkSpanId: () => string;
  isSpanId: (id: string) => boolean;
  mkChangesetId: () => string;
  isTabId: (id: string) => boolean;
  mkTabId: () => string;
  mkBlobId: () => string;
}

export function makeDefaultIdGenerator(): IdGenerator {
  return {
    mkDocId,
    isDocId,
    mkBlockId,
    isBlockId,
    mkSpanId,
    isSpanId,
    mkChangesetId,
    isTabId,
    mkTabId,
    mkBlobId,
  };
}
