import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {create} from 'zustand';
import {createHash,createHmac,randomUUID} from 'node:crypto';
import {learningText,learningErrorText} from '../utils/learningLabels.ts';

const read=p=>fs.readFileSync(p,'utf8');
const axes=['plot_situation','character_detail','narrator_pov','space_time','language_tone_symbol','form_argument'];
const source=ts.transpileModule(read('src/app/store/usePortfolioStore.ts'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText
  .replace(/^import .*;\s*$/gm,'').replace('export const usePortfolioStore','const usePortfolioStore');
const makeStore=()=>new Function('create','mockDb','POETIC_AXES','saveDraftRecovery','clearDraftRecovery','learningText','learningErrorText',source+'\nreturn usePortfolioStore;')(
  create,{savePortfolio(){},reset(){}},axes.map(id=>({id})),async()=>{},async()=>{},learningText,learningErrorText);
const portfolio=(assignmentId)=>({id:`port-student-${assignmentId}`,assignmentId,studentId:'student',studentName:'Test',className:'TEST',status:'drafting',draftRevision:0,versions:[],currentDraft:Object.fromEntries(axes.map(id=>[id,{axisId:id,analysisText:'',evidenceQuotes:[]}]))});
const originalFetch=globalThis.fetch;
let total=0;
async function test(name,fn){await fn();total++;console.log('PASS',name)}
try{
 await test('Switching workspaces preserves an unsaved draft from the previous assignment',async()=>{
  const store=makeStore();const first=portfolio('first');store.getState().hydratePortfolios({[first.id]:first});
  store.getState().updateDraft('student','first',axes[0],'Chưa đồng bộ');
  const second=portfolio('second');store.getState().hydratePortfolios({[second.id]:second});
  assert.equal(store.getState().portfolios[first.id].currentDraft[axes[0]].analysisText,'Chưa đồng bộ');
  store.getState().resetSessionState();
 });
 await test('An old save acknowledgement does not mark newly typed content as saved',async()=>{
  const store=makeStore();const first=portfolio('first');store.getState().hydratePortfolios({[first.id]:first});
  store.getState().updateDraft('student','first',axes[0],'Bản cũ');
  let respond;globalThis.fetch=()=>new Promise(resolve=>respond=resolve);
  const save=store.getState().manualSaveDraft('student','first');await Promise.resolve();await Promise.resolve();
  store.getState().updateDraft('student','first',axes[0],'Nội dung mới');
  respond({ok:true,json:async()=>({draftRevision:1})});await save;
  assert.equal(store.getState().autosaveStatus,'dirty');
  const second=portfolio('second');store.getState().hydratePortfolios({[second.id]:second});
  assert.equal(store.getState().portfolios[first.id].currentDraft[axes[0]].analysisText,'Nội dung mới');
  store.getState().resetSessionState();
 });
 await test('Lost submission response retries the same immutable key without saving a locked draft',async()=>{
  const store=makeStore();const first=portfolio('first');store.getState().hydratePortfolios({[first.id]:first});
  const requests=[];let lost=true;
  globalThis.fetch=async(_url,options)=>{
   const input=JSON.parse(options.body);requests.push(input);
   if(input.action==='save_draft')return {ok:true,json:async()=>({draftRevision:1})};
   if(lost){lost=false;throw new TypeError('Failed to fetch')}
   return {ok:true,json:async()=>({version:{id:randomUUID(),versionNumber:'V1',stage:'initial',responses:{...first.currentDraft,[axes[0]]:{axisId:axes[0],analysisText:'Bản đã lưu trên máy chủ',evidenceQuotes:[]}}},portfolioStatus:'submitted_waiting_ai',draftRevision:2})};
  };
  assert.equal(await store.getState().createSnapshot('student','first','V1','Bài đầu tiên','Test',{stage:'initial'}),false);
  assert.equal(store.getState().autosaveStatus,'saved','Successful draft save must stay saved when only submission fails');
  assert.equal(await store.getState().createSnapshot('student','first','V1','Bài đầu tiên','Test',{stage:'initial'}),true);
  assert.deepEqual(requests.map(r=>r.action),['save_draft','create_version','create_version']);
  assert.equal(requests[1].submissionKey,requests[2].submissionKey);
  assert.equal(store.getState().portfolios[first.id].draftRevision,2);
  assert.equal(store.getState().portfolios[first.id].versions[0].responses[axes[0]].analysisText,'Bản đã lưu trên máy chủ');
  store.getState().resetSessionState();
 });
 await test('API messages reach students and raw network errors become readable',async()=>{
  assert.match(learningErrorText(new TypeError('Failed to fetch')),/Mất kết nối/);
  assert.equal(learningErrorText(new Error('Em cần nộp phần dự đoán.')),'Em cần nộp phần dự đoán.');
  const editor=read('src/views/PortfolioEditorView.tsx');
  assert.equal((editor.match(/onClick=\{openSubmitModal\}/g)||[]).length,2);
  assert(editor.includes('setIsPredictionMode(predictionAvailable)'));
  assert(editor.includes('usePortfolioStore.getState().lastSaveError'));
  assert(!editor.includes('setIsPredictionMode(false)'));
 });

 // Execute the actual backend module with an isolated database adapter. No real accounts are written.
 const coreText=read('api/_lib/academic-core.js').replace(/^import .*;\s*$/gm,'').replace(/export /g,'');
 function core(pool){return new Function('getPool','createHash','createHmac','randomUUID',coreText+'\nreturn {createVersion,saveDraft,emptyDraft};')(async()=>pool,createHash,createHmac,randomUUID)}
 function database({existing=null,revision=1,savedContent=null,predictions=1,submissions=0,revisions=0,status='drafting',feedback=true}={}){
  const calls=[];const p={id:randomUUID(),student_id:'student',assignment_status:'published',status,workflow_config:{predictionEnabled:true,aiReviewRequired:true,aiReviewStages:['initial']}};
  const query=async(sql,args=[])=>{
   calls.push(sql);let rows=[];
   if(sql.includes('SELECT p.*, a.public_id'))rows=[p];
   else if(sql.includes('SELECT * FROM portfolio_versions'))rows=existing?[existing]:[];
   else if(sql.includes('SELECT draft_revision'))rows=[{draft_revision:revision,content_json:savedContent}];
   else if(sql.includes('INSERT INTO portfolio_drafts'))rows=[{draft_revision:revision+1}];
   else if(sql.includes('SELECT id,sequence_no,stage'))rows=submissions?[{id:'previous',sequence_no:2,stage:'initial'}]:[];
   else if(sql.includes('prediction_count'))rows=[{prediction_count:predictions,submission_count:submissions}];
   else if(sql.includes("stage='revision' LIMIT 1"))rows=revisions?[{exists:1}]:[];
   else if(sql.includes('SELECT 1 FROM feedbacks'))rows=feedback?[{exists:1}]:[];
   else if(sql.includes('INSERT INTO portfolio_versions'))rows=[{id:randomUUID(),version_number:args[1],sequence_no:args[6],stage:args[7]}];
   return {rows};
  };
  return {query,connect:async()=>({query,release(){}}),calls};
 }
 const user={id:'student',role:'student'};
 const input={assignmentId:'test-assignment',submissionKey:randomUUID(),stage:'initial',draftRevision:1,content:{[axes[0]]:{analysisText:'Bài kiểm tra',evidenceQuotes:[]}}};
 await test('A late autosave cannot modify a portfolio after another tab submits it',async()=>{
  const db=database({status:'submitted_waiting_ai'});
  await assert.rejects(core(db).saveDraft(user,input,{}),/PORTFOLIO_READ_ONLY/);
  assert(db.calls.includes('ROLLBACK'));assert(!db.calls.some(s=>s.includes('UPDATE portfolio_drafts')));
 });
 await test('A fresh submission writes the immutable version and returns the new draft revision',async()=>{
  const db=database();const result=await core(db).createVersion(user,input,{});
  assert.equal(result.version.stage,'initial');assert.equal(result.draftRevision,2);
  assert.equal(db.calls.filter(s=>s.includes('INSERT INTO portfolio_versions')).length,1);
 });
 await test('A lost draft-save acknowledgement can still submit the exact content already saved',async()=>{
  const db=database({revision:2,savedContent:input.content});
  const result=await core(db).createVersion(user,input,{});assert.equal(result.draftRevision,3);
 });
 await test('An acknowledged retry succeeds even when the portfolio is locked, without creating a duplicate',async()=>{
  const existing={id:randomUUID(),version_number:'V2',stage:'revision',sequence_no:3,content_json:input.content};
  const db=database({existing,status:'completed',revision:6});
  const result=await core(db).createVersion(user,input,{});assert.equal(result.version.id,existing.id);assert.equal(result.draftRevision,6);
  assert(!db.calls.some(s=>s.includes('INSERT INTO')));
 });
 for(const [name,dbOptions,request,error] of [
  ['Prediction is mandatory',{predictions:0},input,'PREDICTION_REQUIRED_FIRST'],
  ['Two tabs cannot turn a second initial submission into an unreviewed revision',{submissions:1},input,'INITIAL_ALREADY_SUBMITTED'],
  ['A newer draft on another device cannot be overwritten',{revision:2},input,'DRAFT_CONFLICT'],
  ['A revision still needs feedback',{submissions:1,status:'feedback_received',feedback:false},{...input,stage:'revision',revisionReason:'Sửa theo góp ý'},'FEEDBACK_REQUIRED_BEFORE_REVISION'],
  ['A second revision cannot be inserted',{submissions:1,revisions:1,status:'feedback_received'},{...input,stage:'revision',revisionReason:'Sửa theo góp ý'},'REVISION_ALREADY_SUBMITTED']
 ]) await test(name,async()=>{
  const db=database(dbOptions);await assert.rejects(core(db).createVersion(user,request,{}),new RegExp(error));
  assert(db.calls.includes('ROLLBACK'));assert(!db.calls.some(s=>s.includes('INSERT INTO portfolio_versions')));
 });
 const serviceText=read('api/_lib/academic-service.js').replace(/^import \{[\s\S]*?\} from ['"][^'"]+['"];\s*/gm,'').replace(/export /g,'');
 for(const existing of [true,false]) await test(existing ? 'A retried reflection preserves completed status and the official grade' : 'A completed portfolio cannot be reopened by a new reflection',async()=>{
  const calls=[];
  const query=async sql=>{
   calls.push(sql);
   if(sql.includes('SELECT p.id portfolio_id'))return {rows:[{portfolio_id:'portfolio',version_id:'version',stage:'revision',portfolio_status:'completed',assignment_status:'published'}]};
   if(sql.includes('SELECT id, created_at FROM student_reflections'))return {rows:existing?[{id:'reflection',created_at:'2026-10-14'}]:[]};
   return {rows:[]};
  };
  const pool={connect:async()=>({query,release(){}})};
  const fn=new Function('getPool',serviceText+'\nreturn saveReflection;')(async()=>pool);
  const request={assignmentId:'test',versionId:randomUUID(),reflection:Object.fromEntries(['changedUnderstanding','mostUsefulFeedback','incompleteInV1','improvedInV2','transferToNextReading'].map(key=>[key,'Câu trả lời kiểm tra']))};
  if(existing){const result=await fn(user,request,{});assert.equal(result.portfolioStatus,'completed');assert(result.isIdempotentRetry)}
  else await assert.rejects(fn(user,request,{}),/PORTFOLIO_READ_ONLY/);
  assert(!calls.some(sql=>sql.includes('UPDATE portfolios')||sql.includes('INSERT INTO')));
 });
 await test('The workflow wrapper recognises an existing submission before rejecting completed portfolios',async()=>{
  let delegated=false;const pool={query:async sql=>({rows:sql.includes('GROUP BY')?[{portfolio_id:'portfolio',portfolio_status:'completed',assignment_status:'closed'}]:[{exists:1}]})};
  const fn=new Function('getPool','academicActionV3',serviceText+'\nreturn createVersionWithWorkflow;')(async()=>pool,async()=>{delegated=true;return {ok:true}});
  const result=await fn(user,input,{});assert.equal(result.ok,true);assert(delegated);
 });
 console.log(`${total}/${total} submission recovery checks passed`);
}finally{globalThis.fetch=originalFetch}
