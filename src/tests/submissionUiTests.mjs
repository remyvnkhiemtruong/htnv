import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as icons from '@heroicons/react/24/outline/index.js';
import {POETIC_AXES} from '../data/seedData.ts';
import {deriveStudentWorkflow} from '../app/workflow/workflowState.ts';
import {learningVersionLabel} from '../utils/learningLabels.ts';

let workspace;
const basic = tag => ({children,title,...props}) => React.createElement(tag,{className:props.className,title},tag==='aside'?title:null,children);
const deps={
 React,useEffect:React.useEffect,useMemo:React.useMemo,useRef:React.useRef,useState:React.useState,
 ...icons,POETIC_AXES,deriveStudentWorkflow,learningVersionLabel,
 useQueryClient:()=>({}),useAuthStore:select=>select({currentUser:{id:'student',name:'Kiểm tra',role:'student'}}),
 usePortfolioStore:()=>({portfolios:{},hydratePortfolios(){},updateDraft(){},manualSaveDraft(){},createSnapshot(){},autosaveStatus:'saved'}),
 useNotificationStore:()=>({addToast(){}}),useStudentAcademicAction:()=>({}),
 useStudentWorkspaceQuery:()=>({data:workspace,isLoading:false}),studentAcademicKeys:{},
 clearDraftRecovery(){},getDraftRecovery(){},Alert:basic('aside'),Badge:basic('span'),Button:basic('button'),SkeletonEditor:()=>null,CreateVersionModal:()=>null
};
const compiled=ts.transpileModule(fs.readFileSync('src/views/PortfolioEditorView.tsx','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.React}}).outputText
 .replace(/^import \{[\s\S]*?\} from ['"][^'"]+['"];\s*/gm,'').replace(/^import .*;\s*$/gm,'').replace('export const PortfolioEditorView','const PortfolioEditorView');
const Editor=new Function(...Object.keys(deps),compiled+'\nreturn PortfolioEditorView;')(...Object.values(deps));
function render(predictionEnabled,versions=[]){
 workspace={assignment:{id:'test',title:'Bài kiểm tra',workflowConfig:{predictionEnabled},predictionTemplate:{questions:['Em dự đoán điều gì?']}},portfolio:{id:'port-student-test',assignmentId:'test',studentId:'student',status:'drafting',versions,currentDraft:Object.fromEntries(POETIC_AXES.map(axis=>[axis.id,{axisId:axis.id,analysisText:'',evidenceQuotes:[]}]))},feedbacks:[],reflections:[],rubricSubmissions:[],literatureText:null};
 return renderToStaticMarkup(React.createElement(Editor,{assignmentId:'test',onNavigate(){}}));
}
const before=render(true);
assert.equal((before.match(/>Nộp dự đoán<\/button>/g)||[]).length,2,'Both desktop and mobile must submit the prediction first');
assert(!/>Nộp bài đầu tiên<\/button>/.test(before));
assert(before.includes('Nộp dự đoán trước khi làm bài'));
for(const html of [render(false),render(true,[{id:'prediction',stage:'prediction',versionNumber:'V0',createdAt:new Date().toISOString()}])]){
 assert.equal((html.match(/>Nộp bài đầu tiên<\/button>/g)||[]).length,2);
 assert(!/>Nộp dự đoán<\/button>/.test(html));
}
console.log('PASS actual editor rendering: required prediction, optional prediction, completed prediction; desktop and mobile');
