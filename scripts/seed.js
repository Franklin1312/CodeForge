/**
 * Seed script — adds sample problems and an admin user.
 * Run: node scripts/seed.js
 * Requires MONGODB_URI in environment (or uses localhost default).
 */

import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/codeforge";

// ─── Inline minimal models (avoids importing full app) ────────────
const userSchema = new mongoose.Schema({
  username: String, email: String, passwordHash: String,
  role: { type: String, default: "user" },
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: true },
  stats: {
    solved: { type: Number, default: 0 },
    attempted: { type: Number, default: 0 },
    submissions: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
  },
}, { timestamps: true });
const User = mongoose.model("User", userSchema);

const problemSchema = new mongoose.Schema({
  slug: String, title: String, difficulty: String, description: String,
  constraints: String, examples: Array, testCases: Array, tags: Array,
  allowedLanguages: Array, timeLimit: Number, memoryLimit: Number,
  starterCode: Map, isPublished: Boolean, isPremium: Boolean,
  stats: {
    totalSubmissions: { type: Number, default: 0 },
    acceptedSubmissions: { type: Number, default: 0 },
    acceptanceRate: { type: Number, default: 0 },
  },
}, { timestamps: true });
const Problem = mongoose.model("Problem", problemSchema);

// ─── Data ─────────────────────────────────────────────────────────
const ADMIN = {
  username: "admin",
  email: "admin@codeforge.dev",
  password: "Admin123",
  role: "admin",
};

const PROBLEMS = [
  {
    slug: "two-sum",
    title: "Two Sum",
    difficulty: "easy",
    description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
    constraints: `- 2 ≤ nums.length ≤ 10^4\n- -10^9 ≤ nums[i] ≤ 10^9\n- -10^9 ≤ target ≤ 10^9\n- Only one valid answer exists.`,
    examples: [
      { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]." },
      { input: "nums = [3,2,4], target = 6", output: "[1,2]" },
    ],
    testCases: [
      { input: "2 7 11 15\n9", expectedOutput: "0 1", isHidden: false },
      { input: "3 2 4\n6", expectedOutput: "1 2", isHidden: false },
      { input: "3 3\n6", expectedOutput: "0 1", isHidden: true },
      { input: "1 2 3 4 5\n9", expectedOutput: "3 4", isHidden: true },
    ],
    tags: ["array", "hash-table"],
    allowedLanguages: ["python", "javascript", "java", "cpp"],
    timeLimit: 1000, memoryLimit: 128,
    starterCode: new Map([
      ["python", "def two_sum(nums, target):\n    # your code here\n    pass\n"],
      ["javascript", "function twoSum(nums, target) {\n    // your code here\n};\n"],
      ["java", "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // your code here\n    }\n}\n"],
      ["cpp", "#include <vector>\nusing namespace std;\n\nvector<int> twoSum(vector<int>& nums, int target) {\n    // your code here\n}\n"],
    ]),
    isPublished: true, isPremium: false,
  },
  {
    slug: "valid-parentheses",
    title: "Valid Parentheses",
    difficulty: "easy",
    description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
    constraints: `- 1 ≤ s.length ≤ 10^4\n- s consists of parentheses only \`'()[]{}'.\``,
    examples: [
      { input: 's = "()"', output: "true" },
      { input: 's = "()[]{}"', output: "true" },
      { input: 's = "(]"', output: "false" },
    ],
    testCases: [
      { input: "()", expectedOutput: "true", isHidden: false },
      { input: "()[]{}", expectedOutput: "true", isHidden: false },
      { input: "(]", expectedOutput: "false", isHidden: false },
      { input: "([)]", expectedOutput: "false", isHidden: true },
      { input: "{[]}", expectedOutput: "true", isHidden: true },
      { input: "", expectedOutput: "true", isHidden: true },
    ],
    tags: ["string", "stack"],
    allowedLanguages: ["python", "javascript", "java", "cpp"],
    timeLimit: 1000, memoryLimit: 128,
    isPublished: true, isPremium: false,
    starterCode: new Map([
      ["python", "def is_valid(s: str) -> bool:\n    pass\n"],
      ["javascript", "function isValid(s) {\n    \n};\n"],
    ]),
  },
  {
    slug: "maximum-subarray",
    title: "Maximum Subarray",
    difficulty: "medium",
    description: `Given an integer array \`nums\`, find the subarray with the largest sum, and return its sum.`,
    constraints: `- 1 ≤ nums.length ≤ 10^5\n- -10^4 ≤ nums[i] ≤ 10^4`,
    examples: [
      { input: "nums = [-2,1,-3,4,-1,2,1,-5,4]", output: "6", explanation: "The subarray [4,-1,2,1] has the largest sum 6." },
      { input: "nums = [1]", output: "1" },
      { input: "nums = [5,4,-1,7,8]", output: "23" },
    ],
    testCases: [
      { input: "-2 1 -3 4 -1 2 1 -5 4", expectedOutput: "6", isHidden: false },
      { input: "1", expectedOutput: "1", isHidden: false },
      { input: "5 4 -1 7 8", expectedOutput: "23", isHidden: true },
    ],
    tags: ["array", "dynamic-programming", "divide-and-conquer"],
    allowedLanguages: ["python", "javascript", "java", "cpp", "go"],
    timeLimit: 2000, memoryLimit: 256,
    isPublished: true, isPremium: false,
    starterCode: new Map([["python", "def max_subarray(nums):\n    pass\n"]]),
  },
  {
    slug: "merge-k-sorted-lists",
    title: "Merge K Sorted Lists",
    difficulty: "hard",
    description: `You are given an array of \`k\` linked-lists \`lists\`, each linked-list is sorted in ascending order.

Merge all the linked-lists into one sorted linked-list and return it.`,
    constraints: `- k == lists.length\n- 0 ≤ k ≤ 10^4\n- 0 ≤ lists[i].length ≤ 500\n- -10^4 ≤ lists[i][j] ≤ 10^4`,
    examples: [
      { input: "lists = [[1,4,5],[1,3,4],[2,6]]", output: "[1,1,2,3,4,4,5,6]" },
      { input: "lists = []", output: "[]" },
    ],
    testCases: [
      { input: "3\n1 4 5\n1 3 4\n2 6", expectedOutput: "1 1 2 3 4 4 5 6", isHidden: false },
    ],
    tags: ["linked-list", "divide-and-conquer", "heap", "merge-sort"],
    allowedLanguages: ["python", "javascript", "java", "cpp"],
    timeLimit: 3000, memoryLimit: 256,
    isPublished: true, isPremium: false,
    starterCode: new Map([["python", "def merge_k_lists(lists):\n    pass\n"]]),
  },
];

// ─── Main ─────────────────────────────────────────────────────────
async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected to MongoDB");

  // Admin user
  const existing = await User.findOne({ email: ADMIN.email });
  if (!existing) {
    await User.create({
      username: ADMIN.username,
      email: ADMIN.email,
      passwordHash: await bcrypt.hash(ADMIN.password, 12),
      role: "admin",
      isActive: true,
      isEmailVerified: true,
    });
    console.log(`✅ Admin user created: ${ADMIN.email} / ${ADMIN.password}`);
  } else {
    console.log("ℹ️  Admin user already exists");
  }

  // Problems
  for (const p of PROBLEMS) {
    const exists = await Problem.findOne({ slug: p.slug });
    if (!exists) {
      await Problem.create(p);
      console.log(`✅ Problem created: ${p.slug}`);
    } else {
      console.log(`ℹ️  Problem already exists: ${p.slug}`);
    }
  }

  console.log("\n🎉 Seed complete!");
  console.log(`   Admin login: ${ADMIN.email} / ${ADMIN.password}`);
  console.log("   Admin panel: http://localhost:5173/admin");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
