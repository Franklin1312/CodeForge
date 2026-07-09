/**
 * Judge integration test — run directly with Node:
 *   node scripts/test-judge.js
 *
 * Tests every supported language with:
 *   - A correct solution (expects AC)
 *   - A wrong solution (expects WA)
 *   - A syntax error (expects CE, compiled languages only)
 */

import "dotenv/config";
import { judgeSubmission } from "../backend/src/workers/judgeDispatcher.js";

const GREEN  = "\x1b[32m";
const RED    = "\x1b[31m";
const YELLOW = "\x1b[33m";
const RESET  = "\x1b[0m";

// Simple "two sum" test cases (space-separated integers + target on next line)
const TEST_CASES = [
  { input: "2 7 11 15\n9",  expectedOutput: "0 1", isHidden: false },
  { input: "3 2 4\n6",      expectedOutput: "1 2", isHidden: false },
  { input: "3 3\n6",        expectedOutput: "0 1", isHidden: true  },
];

const CORRECT_SOLUTIONS = {
  python: `
import sys

def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i
    return []

data = sys.stdin.read().split()
nums = list(map(int, data[:-1]))
target = int(data[-1])
result = two_sum(nums, target)
print(' '.join(map(str, result)))
`.trim(),

  javascript: `
const lines = require('fs').readFileSync('/dev/stdin','utf8').trim().split('\\n');
const nums = lines[0].split(' ').map(Number);
const target = Number(lines[1]);
const map = new Map();
for (let i = 0; i < nums.length; i++) {
  const comp = target - nums[i];
  if (map.has(comp)) { process.stdout.write(map.get(comp) + ' ' + i + '\\n'); break; }
  map.set(nums[i], i);
}
`.trim(),

  java: `
import java.util.*;
public class Solution {
  public static void main(String[] args) {
    Scanner sc = new Scanner(System.in);
    String[] parts = sc.nextLine().trim().split(" ");
    int target = Integer.parseInt(parts[parts.length - 1]);
    int[] nums = new int[parts.length - 1];
    for (int i = 0; i < nums.length; i++) nums[i] = Integer.parseInt(parts[i]);
    Map<Integer,Integer> map = new HashMap<>();
    for (int i = 0; i < nums.length; i++) {
      int comp = target - nums[i];
      if (map.containsKey(comp)) { System.out.println(map.get(comp) + " " + i); return; }
      map.put(nums[i], i);
    }
  }
}
`.trim(),

  cpp: `
#include <bits/stdc++.h>
using namespace std;
int main() {
  vector<int> nums; int x;
  string line; getline(cin, line);
  istringstream iss(line);
  while (iss >> x) nums.push_back(x);
  int target = nums.back(); nums.pop_back();
  unordered_map<int,int> m;
  for (int i = 0; i < (int)nums.size(); i++) {
    int c = target - nums[i];
    if (m.count(c)) { cout << m[c] << " " << i << endl; return 0; }
    m[nums[i]] = i;
  }
}
`.trim(),
};

const WRONG_SOLUTION_PYTHON = `print("0 0")`;
const CE_SOLUTION_PYTHON    = `def broken(\n    this is syntax error`;

async function runTest(lang, code, expectedVerdict, label) {
  process.stdout.write(`  ${label.padEnd(30)} `);
  try {
    const result = await judgeSubmission({
      code,
      language: lang,
      testCases: TEST_CASES,
      timeLimit: 2000,
      memoryLimit: 256,
    });

    const pass = result.verdict === expectedVerdict;
    const mock = result._mock ? ` ${YELLOW}[mock]${RESET}` : "";
    const icon = pass ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
    console.log(`${icon} ${result.verdict} (expected ${expectedVerdict})${mock}`);
    return pass;
  } catch (err) {
    console.log(`${RED}✗ THREW: ${err.message}${RESET}`);
    return false;
  }
}

async function main() {
  console.log("\n🧪 CodeForge Judge Integration Tests\n");

  const results = [];
  const langs = Object.keys(CORRECT_SOLUTIONS);

  for (const lang of langs) {
    console.log(`\n${lang.toUpperCase()}`);

    results.push(await runTest(lang, CORRECT_SOLUTIONS[lang], "AC", "correct solution → AC"));
    results.push(await runTest(lang, WRONG_SOLUTION_PYTHON.replace("print", lang === "python" ? "print" : "//"), "WA", "wrong solution → WA"));
  }

  // Python-specific CE test
  console.log("\nCOMPILE ERROR");
  results.push(await runTest("python", CE_SOLUTION_PYTHON, "CE", "syntax error → CE"));

  const passed = results.filter(Boolean).length;
  const total  = results.length;

  console.log(`\n${"─".repeat(42)}`);
  console.log(`Results: ${passed}/${total} passed`);

  if (passed < total) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
