// Sample teacher-controlled Classroom 50 grader for CSF Interactive Conversation.
// Run: node grader.mjs [path/to/main.js]
// This is an instructional example. Run student source only inside the isolated
// Classroom 50/GitHub Actions grading environment, never with instructor secrets.
import fs from "node:fs";
import {spawnSync} from "node:child_process";

const path=process.argv[2]||"main.js";
let source="";
try {source=fs.readFileSync(path,"utf8");}
catch {console.error("Missing "+path);process.exit(1);}
if(source.length>100000){console.error("Program is too large.");process.exit(1);}
function run(answers) {
  const setup="const __answers="+JSON.stringify(answers)+";\n"+
    "globalThis.prompt = () => __answers.shift() ?? null;\n";
  const child=spawnSync(process.execPath,["--input-type=commonjs","--eval",setup+source],{
    timeout:2000,maxBuffer:32768,encoding:"utf8",env:{PATH:process.env.PATH||""}
  });
  if(child.error||child.status!==0)return {ok:false,output:child.stderr||String(child.error||"Program failed")};
  return {ok:true,output:child.stdout.trim()};
}
const cases=[
  {name:"Responds to valid text and number",answers:["Ada","21"],
    pass:result=>result.ok&&/ada/i.test(result.output)&&/\b42\b/.test(result.output)},
  {name:"Handles cancelled name input",answers:[],
    pass:result=>result.ok&&/cancel/i.test(result.output)},
  {name:"Rejects invalid numeric input",answers:["Ada","not a number"],
    pass:result=>result.ok&&/valid whole number/i.test(result.output)}
];
let score=0;
for(const c of cases) {
  const result=run([...c.answers]),passed=c.pass(result);
  if(passed)score++;
  console.log((passed?"PASS":"FAIL")+" | "+c.name);
  if(!passed)console.log("  Output: "+result.output.slice(0,300));
}
console.log("Score: "+score+"/"+cases.length);
process.exitCode=score===cases.length?0:1;
