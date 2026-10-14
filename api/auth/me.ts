import { assertSameOrigin, authenticate, body, send, updateProfile } from "./auth.js";

export default async function handler(req:any,res:any) {
  if(req.method==="GET") {
    const user=await authenticate(req,{allowPasswordChangeRequired:true});
    return user?send(res,200,{user}):send(res,401,{code:"UNAUTHENTICATED"});
  }
  if(req.method==="PATCH") {
    try {
      assertSameOrigin(req);
      const user=await authenticate(req);
      if(!user)return send(res,401,{code:"UNAUTHENTICATED"});
      const result=await updateProfile(user.id,body(req));
      if(!result)return send(res,404,{code:"USER_NOT_FOUND"});
      return send(res,200,{user:result.user},result.token);
    } catch(error:any) {
      const code=String(error?.message||"PROFILE_UPDATE_ERROR");
      const status=code==="CSRF_ORIGIN_MISMATCH"?403:code==="INVALID_NAME"?400:500;
      console.error('[auth/me]', { code, status, route: '/api/auth/me' });
      return send(res,status,{code:status>=500?"PROFILE_UPDATE_ERROR":code,message:code==="INVALID_NAME"?"Họ tên phải có ít nhất 2 ký tự.":"Không thể cập nhật hồ sơ."});
    }
  }
  return send(res,405,{code:"METHOD_NOT_ALLOWED"});
}
