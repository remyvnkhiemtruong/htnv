import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getPool } from "../_lib/db.js";
import { assertSameOrigin, body, checkRateLimit, login, requestIp, send } from "./auth.js";
import { normalizeLoginIdentifier } from "./login-identifier.js";

function scryptHash(password:string) {
  const salt=randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password,salt,64).toString("hex")}`;
}

function safeEqual(a:string,b:string) {
  const aa=Buffer.from(a);
  const bb=Buffer.from(b);
  return aa.length===bb.length && timingSafeEqual(aa,bb);
}

function seededPassword(secret:string,studentCode:string) {
  const digest=createHmac("sha256",secret).update(studentCode).digest("hex").slice(0,20);
  return `VT26-${digest}!`;
}

async function migrateTemporaryCredential(email:string,password:string) {
  const pool = await getPool();
  const row=(await pool.query(
    "SELECT id,password_hash,must_change_password,profile_json FROM app_users WHERE email=$1 AND account_status='active' LIMIT 1",
    [email]
  )).rows[0];
  if(!row||!row.must_change_password) return;

  if(String(row.password_hash||"").startsWith("$2")) {
    const verified=(await pool.query("SELECT crypt($1,$2)=$2 AS ok",[password,row.password_hash])).rows[0]?.ok===true;
    if(!verified) return;
    await pool.query(
      "UPDATE app_users SET password_hash=$2,updated_at=now() WHERE id=$1 AND password_hash=$3",
      [row.id,scryptHash(password),row.password_hash]
    );
    return;
  }

  if(row.password_hash!=="PENDING_V1" || row.profile_json?.seedSource!=="student-list-2026-09-11") return;
  const studentCode=String(row.profile_json?.studentCode||"");
  if(!studentCode) return;
  const secretRow=(await pool.query(
    "SELECT config_value FROM app_runtime_config WHERE config_key='student_roster_seed_v1' LIMIT 1"
  )).rows[0];
  const secret=String(secretRow?.config_value||"");
  if(secret.length<32) return;
  const expected=seededPassword(secret,studentCode);
  if(!safeEqual(expected,password)) return;
  await pool.query(
    "UPDATE app_users SET password_hash=$2,updated_at=now() WHERE id=$1 AND password_hash='PENDING_V1'",
    [row.id,scryptHash(password)]
  );
}

export default async function handler(req:any,res:any) {
  if(req.method!=="POST") return send(res,405,{code:"METHOD_NOT_ALLOWED"});
  try {
    assertSameOrigin(req);
    const {email,password}=body(req);
    if(!email||!password) return send(res,400,{code:"VALIDATION_ERROR",message:"Tài khoản và mật khẩu là bắt buộc."});
    const cleanEmail=normalizeLoginIdentifier(email);
    const cleanPassword=String(password);
    if(cleanPassword.length>512) return send(res,400,{code:"VALIDATION_ERROR",message:"Thông tin đăng nhập không hợp lệ."});
    const key=`login:${requestIp(req)}:${cleanEmail}`;
    if(!await checkRateLimit(key,8,900)) return send(res,429,{code:"RATE_LIMITED",message:"Em đã thử đăng nhập quá nhiều lần. Hãy đợi 15 phút rồi thử lại."});
    await migrateTemporaryCredential(cleanEmail,cleanPassword);
    const result=await login(cleanEmail,cleanPassword);
    if(!result) return send(res,401,{code:"INVALID_CREDENTIALS",message:"Tài khoản hoặc mật khẩu chưa đúng. Nếu đã đổi mật khẩu, em cần dùng mật khẩu mới."});
    return send(res,200,{user:result.user},result.token);
  } catch(e:any) {
    const code=String(e?.message||'LOGIN_ERROR');
    if(code==='CSRF_ORIGIN_MISMATCH'||code==='INVALID_ORIGIN') return send(res,403,{code:'CSRF_ORIGIN_MISMATCH',message:'Yêu cầu không hợp lệ.'});
    return send(res,500,{code:'LOGIN_ERROR',message:'Dịch vụ đăng nhập tạm thời không khả dụng.'});
  }
}
