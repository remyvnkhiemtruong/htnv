// One-time, explicit school import. Keep roster and credentials outside the repository.
// Usage: DATABASE_URL=... node scripts/provision-school.mjs /private/accounts.json /private/submissions.json /private/result.json --apply
import fs from 'node:fs/promises';
import { createHash, randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { Pool } from 'pg';

const [accountsPath, submissionsPath, resultPath, flag] = process.argv.slice(2);
if (!accountsPath || !submissionsPath || !resultPath || flag !== '--apply') {
  console.error('Usage: node scripts/provision-school.mjs ACCOUNTS_JSON SUBMISSIONS_JSON RESULT_JSON --apply');
  process.exit(2);
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const accounts = JSON.parse(await fs.readFile(accountsPath, 'utf8')).accounts;
const submissions = JSON.parse(await fs.readFile(submissionsPath, 'utf8')).submissions;
if (accounts.length !== 171 || submissions.length !== 332) throw new Error('Unexpected roster or submission count');
if (new Set(accounts.map(a => a.email)).size !== 171 || accounts.some(a => !a.email.endsWith('@htnv.io.vn'))) {
  throw new Error('Invalid or duplicate emails');
}
if (new Set(submissions.map(s => s.contentChecksum)).size !== 332) throw new Error('Simulated essays are not unique');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2, connectionTimeoutMillis: 15000 });
const client = await pool.connect();
const AXES = ['plot_situation','character_detail','narrator_pov','space_time','language_tone_symbol','form_argument'];
const TEXTS = {
  'vo-nhat': ['Vợ nhặt','Kim Lân','1954','Truyện ngắn','Tình huống nhặt vợ giữa nạn đói và khát vọng sống.'],
  'chi-pheo': ['Chí Phèo','Nam Cao','1941','Truyện ngắn','Tha hóa, thức tỉnh và bi kịch bị cự tuyệt quyền làm người.'],
  'xuan-toc-do-cuu-quoc': ['Xuân Tóc Đỏ cứu quốc','Vũ Trọng Phụng','1936','Tiểu thuyết trào phúng – đoạn trích','Khoảng cách giữa thực chất và sự tung hô.'],
  'mua-la-rung-trong-vuon': ['Mùa lá rụng trong vườn','Ma Văn Kháng','1985','Tiểu thuyết','Xung đột giá trị và khả năng gìn giữ tình thân.']
};
const LABELS = ['Tình huống – Cốt truyện','Nhân vật – Chi tiết','Người kể – Điểm nhìn','Không gian – Thời gian','Ngôn ngữ – Biểu tượng','Tổng hợp – Lập luận'];
const levels = [1,2,3,4].map((level) => ({level,score:level,label:['Chưa đạt','Đạt','Khá','Tốt'][level-1]}));
const hash = (password) => {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password,salt,64).toString('hex')}`;
};
const stable = (value) => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(k => [k,stable(value[k])])) : value;
const digest = (value) => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const countWords = (value) => Object.values(value).reduce((n, x) => n + String(x.analysisText || '').trim().split(/\s+/u).filter(Boolean).length, 0);
const result = { created: [], existing: [], classes: [], memberships: 0, assignments: [], simulatedPortfolios: 0,
  simulatedVersions: 0, skippedPortfoliosWithHistory: [], status: 'not_committed' };

try {
  await client.query('BEGIN');
  await client.query("SELECT set_config('app.class_member_write','admin',true)");
  const required = ['app_users','app_runtime_config','auth_rate_events','classes','class_members','literature_texts','literature_text_versions',
    'rubrics','rubric_criteria','assignments','portfolios','portfolio_drafts','portfolio_versions',
    'ai_review_requests','audit_logs'];
  const check = await client.query('SELECT name,to_regclass($1||name) IS NOT NULL AS ready FROM unnest($2::text[]) name', ['public.', required]);
  const missing = check.rows.filter(r => !r.ready).map(r => r.name);
  if (missing.length) throw new Error('Schema missing: ' + missing.join(', '));
  const schema = await client.query("SELECT 1 FROM information_schema.columns WHERE table_name='assignments' AND column_name='literature_text_version_id'");
  if (!schema.rowCount) throw new Error('Workflow V4 migration is missing');

  const ids = new Map();
  for (const account of accounts) {
    const found = await client.query('SELECT id,name,role FROM app_users WHERE lower(email)=$1 FOR UPDATE', [account.email]);
    if (found.rows.length) {
      if (found.rows[0].role !== account.role) throw new Error(`Role conflict: ${account.email}`);
      ids.set(account.email, found.rows[0].id);
      result.existing.push(account.email);
      continue;
    }
    const profile = account.role === 'student' ? {
      studentCode: account.studentCode, school: 'THPT Vị Thanh', schoolYear: '2026-2027',
      grade: account.classCode.slice(0,2)
    } : {};
    const created = await client.query(`
      INSERT INTO app_users(email,name,role,password_hash,must_change_password,account_status,profile_json)
      VALUES($1,$2,$3,$4,true,'active',$5::jsonb) RETURNING id
    `, [account.email,account.name,account.role,hash(account.password),JSON.stringify(profile)]);
    ids.set(account.email, created.rows[0].id);
    result.created.push(account.email);
  }
  const teacherId = ids.get('nguyen.thi.kieu.duyen@htnv.io.vn');
  const adminId = ids.get('admin01@htnv.io.vn');
  for (const code of ['11A3','11A5','11A8','12A7']) {
    await client.query(`INSERT INTO classes(code,name,school_year,created_by)
      VALUES($1,$2,'2026-2027',$3) ON CONFLICT(code) DO NOTHING`, [code, `Lớp ${code}`, adminId]);
  }
  const classes = await client.query('SELECT id,code,school_year FROM classes ORDER BY code');
  const classIds = new Map(classes.rows.map(row => [row.code,row.id]));
  for (const code of ['11A3','11A5','11A8','12A7']) {
    if (classes.rows.find(row => row.code === code)?.school_year !== '2026-2027') throw new Error(`Class year conflict: ${code}`);
  }
  result.classes = classes.rows.map(row => row.code);
  const teacherEmails = ['doan.sin@htnv.io.vn','nguyen.thi.kieu.duyen@htnv.io.vn'];
  for (const classRow of classes.rows) {
    for (const email of teacherEmails) {
      await client.query(`INSERT INTO class_members(class_id,user_id,member_role) VALUES($1,$2,'teacher')
        ON CONFLICT(class_id,user_id) DO UPDATE SET member_role='teacher'`, [classRow.id,ids.get(email)]);
      result.memberships++;
    }
  }
  for (const account of accounts.filter(a => a.role === 'student')) {
    await client.query(`INSERT INTO class_members(class_id,user_id,member_role) VALUES($1,$2,'student')
      ON CONFLICT(class_id,user_id) DO UPDATE SET member_role='student'`, [classIds.get(account.classCode),ids.get(account.email)]);
    result.memberships++;
  }

  const rubricPublicId = 'rubric-htnv-vithanh-2026';
  const rubric = await client.query(`INSERT INTO rubrics(public_id,title,description,created_by,is_active)
    VALUES($1,'Hồ sơ đọc theo 6 trục thi pháp','Bốn mức đánh giá; điểm chính thức do giáo viên chấm.',$2,true)
    ON CONFLICT(public_id) DO UPDATE SET is_active=true RETURNING id`, [rubricPublicId,teacherId]);
  const rubricId = rubric.rows[0].id;
  for (let i=0;i<AXES.length;i++) {
    await client.query(`INSERT INTO rubric_criteria(rubric_id,public_id,axis_id,title,weight,levels_json,sort_order)
      VALUES($1,$2,$3,$4,1,$5::jsonb,$6) ON CONFLICT(rubric_id,public_id) DO NOTHING`,
      [rubricId,`htnv-${AXES[i]}`,AXES[i],LABELS[i],JSON.stringify(levels),i+1]);
  }
  const textIds = new Map();
  const revisionIds = new Map();
  for (const [publicId, [title,author,year,genre,synopsis]] of Object.entries(TEXTS)) {
    const t = await client.query(`INSERT INTO literature_texts(public_id,title,author,year_text,genre,synopsis,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(public_id) DO UPDATE SET public_id=EXCLUDED.public_id RETURNING id`,
      [publicId,title,author,year,genre,synopsis,teacherId]);
    textIds.set(publicId,t.rows[0].id);
    const version = await client.query(`INSERT INTO literature_text_versions(
      literature_text_id,version_no,title,author,year_text,genre,synopsis,excerpt,full_content,historical_context,tags,content_checksum,created_by)
      VALUES($1,1,$2,$3,$4,$5,$6,'','','',ARRAY[]::text[],$7,$8)
      ON CONFLICT(literature_text_id,version_no) DO UPDATE SET literature_text_id=EXCLUDED.literature_text_id RETURNING id`,
      [t.rows[0].id,title,author,year,genre,synopsis,digest([publicId,title,author,synopsis]),teacherId]);
    revisionIds.set(publicId,version.rows[0].id);
  }
  const assignments = new Map();
  const targetClassCodes = classes.rows
    .filter(row => row.school_year === '2026-2027' && /^(11|12)[A-Z0-9]/.test(row.code))
    .map(row => row.code);
  for (const code of targetClassCodes) {
    const works = code.startsWith('11') ? ['vo-nhat','chi-pheo'] : ['xuan-toc-do-cuu-quoc','mua-la-rung-trong-vuon'];
    for (const workId of works) {
      const title = TEXTS[workId][0];
      const publicId = `htnv-${code.toLowerCase()}-${workId}-2026`;
      const prompt = `Đọc ${title} và hoàn thành hồ sơ theo sáu trục: tình huống, nhân vật, điểm nhìn, không gian–thời gian, ngôn ngữ và lập luận. Phân tích bằng chi tiết từ văn bản được giao; nộp dự đoán V0 và bài V1, sau đó sửa V2 theo phản hồi.`;
      const guidance = ['Dự đoán trước đọc và ghi căn cứ, mức tự tin.', 'Phân tích đủ sáu trục thi pháp, dẫn chứng phải đúng ngữ liệu.', 'Nộp V1, đọc góp ý, chỉnh sửa V2 và giải thích thay đổi.', 'Hoàn thành tự phản tư trước đánh giá chính thức.'];
      const cfg = {predictionEnabled:true,aiReviewRequired:true,manualAiResponse:true,aiFeedbackVisibleImmediately:true,
        teacherFollowUpEnabled:true,reflectionRequired:true,officialRubricRequired:true};
      const existing = await client.query('SELECT id,class_id,created_by FROM assignments WHERE public_id=$1', [publicId]);
      if (existing.rows.length && (existing.rows[0].class_id !== classIds.get(code) || existing.rows[0].created_by !== teacherId)) {
        throw new Error(`Assignment identity conflict: ${publicId}`);
      }
      const a = await client.query(`INSERT INTO assignments(public_id,class_id,text_id,rubric_id,title,assigned_at,deadline,
        difficulty,target_axes,prompt,guiding_steps,status,ai_guidance,common_mistakes,reference_guide,prediction_template,
        workflow_config,created_by,literature_text_version_id)
        VALUES($1,$2,$3,$4,$5,now(),now()+interval '90 days','Nâng cao',$6::text[],$7,$8::jsonb,'published',
        'Phản hồi theo đúng phiên bản; AI không chấm điểm chính thức.','Tránh kể lại cốt truyện thay cho phân tích.',
        'Kiểm chứng luận điểm bằng bản văn giáo viên cung cấp.',
        '{"enabled":true,"requireConfidence":true}'::jsonb,$9::jsonb,$10,$11)
        ON CONFLICT(public_id) DO UPDATE SET public_id=EXCLUDED.public_id RETURNING id`,
        [publicId,classIds.get(code),textIds.get(workId),rubricId,`Hồ sơ đọc số: ${title}`,AXES,prompt,
          JSON.stringify(guidance),JSON.stringify(cfg),teacherId,revisionIds.get(workId)]);
      assignments.set(`${code}:${workId}`, a.rows[0].id);
      result.assignments.push(publicId);
    }
  }

  for (const submission of submissions) {
    const assignmentId = assignments.get(`${submission.classCode}:${submission.workId}`);
    const studentId = ids.get(submission.email);
    const portfolio = await client.query(`INSERT INTO portfolios(assignment_id,student_id,status,active_version)
      VALUES($1,$2,'drafting','Nháp') ON CONFLICT(assignment_id,student_id)
      DO UPDATE SET assignment_id=EXCLUDED.assignment_id RETURNING id`, [assignmentId,studentId]);
    const portfolioId = portfolio.rows[0].id;
    const prior = await client.query('SELECT count(*)::int AS count FROM portfolio_versions WHERE portfolio_id=$1', [portfolioId]);
    if (prior.rows[0].count) {
      result.skippedPortfoliosWithHistory.push({email:submission.email,assignmentId});
      continue;
    }
    await client.query(`INSERT INTO portfolio_drafts(portfolio_id,content_json,updated_by)
      VALUES($1,$2::jsonb,NULL) ON CONFLICT(portfolio_id) DO NOTHING`, [portfolioId,JSON.stringify(submission.content)]);
    const marker = 'DỮ LIỆU MÔ PHỎNG — không phải bài nộp của học sinh; không dùng chấm điểm chính thức.';
    let previousId = null;
    for (const [index, content] of [submission.prediction,submission.content].entries()) {
      const stage = index === 0 ? 'prediction' : 'initial';
      const v = await client.query(`INSERT INTO portfolio_versions(
        portfolio_id,version_number,content_json,change_summary,created_by,word_count,
        sequence_no,stage,confidence,change_source,previous_version_id,content_checksum,submission_key)
        VALUES($1,$2,$3::jsonb,$4,NULL,$5,$6,$7,$8,'simulation',$9,$10,$11)
        RETURNING id`, [portfolioId,index === 0 ? 'V0' : 'V1',JSON.stringify(content),marker,countWords(content),
          index+1,stage,index === 0 ? 3 : null,previousId,digest(content),randomUUID()]);
      previousId = v.rows[0].id;
      await client.query(`INSERT INTO ai_review_requests(portfolio_id,version_id,prompt,stage)
        VALUES($1,$2,$3,$4) ON CONFLICT(version_id) DO NOTHING`, [portfolioId,previousId,
          'Đây là dữ liệu mô phỏng; chỉ phản hồi nếu đang kiểm thử.',stage]);
      result.simulatedVersions++;
    }
    await client.query("UPDATE portfolios SET active_version='V1',status='submitted_waiting_ai',updated_at=now() WHERE id=$1", [portfolioId]);
    result.simulatedPortfolios++;
  }
  await client.query(`INSERT INTO audit_logs(actor_id,actor_role,action,target_type,target_id,after_json,ip_address)
    VALUES(NULL,'system','SYSTEM_IMPORT_SIMULATED','batch',$1,$2::jsonb,'local-import')`,
    [`htnv-vithanh-${new Date().toISOString()}`,JSON.stringify({accounts:result.created.length,
      classes:result.classes,assignments:result.assignments.length,portfolios:result.simulatedPortfolios,
      versions:result.simulatedVersions,simulated:true})]);
  await client.query('COMMIT');
  result.status = 'committed';
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  throw error;
} finally {
  client.release();
  await pool.end();
}
await fs.writeFile(resultPath, JSON.stringify(result,null,2), {mode:0o600});
console.log(JSON.stringify({status:result.status,created:result.created.length,existing:result.existing.length,
  classes:result.classes.length,assignments:result.assignments.length,portfolios:result.simulatedPortfolios,
  versions:result.simulatedVersions,skipped:result.skippedPortfoliosWithHistory.length}));
