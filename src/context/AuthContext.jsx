import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loginApi, meApi } from '../services/api.js';
const AuthContext = createContext(null);
const TOKEN_KEY = 'walangbrownout_ims_token';
const USER_KEY = 'walangbrownout_ims_user';
export function AuthProvider({ children }) {
 const [user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem(USER_KEY)||'null')}catch{return null}});
 const isAuthenticated=!!user && !!localStorage.getItem(TOKEN_KEY);
 const login=async(username,password)=>{try{const result=await loginApi(username.trim(),password);localStorage.setItem(TOKEN_KEY,result.token);localStorage.setItem(USER_KEY,JSON.stringify(result.user));setUser(result.user);return {ok:true};}catch(error){return {ok:false,error:error.message||'Unable to sign in. Check that the API server is running.'}}};
 const logout=()=>{localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(USER_KEY);setUser(null)};
 const can=permission=>{const map={addItem:'items:write',adjustStock:'stock:write',resolveAlert:'alerts:resolve',settings:'settings:write',reports:'reports:read'};return !!user&&(user.permissions?.includes(map[permission])||false)};

 // The API rejected our token (expired, revoked, account disabled): sign out.
 useEffect(()=>{const onUnauthorized=()=>logout();window.addEventListener('ims:unauthorized',onUnauthorized);return()=>window.removeEventListener('ims:unauthorized',onUnauthorized)},[]);

 // On load, re-read the role and permissions from the server so a role change
 // (or a tampered localStorage copy) can't leave stale access in the UI.
 useEffect(()=>{
  if(!localStorage.getItem(TOKEN_KEY)) return;
  let alive=true;
  meApi().then(r=>{if(!alive||!r?.user)return;localStorage.setItem(USER_KEY,JSON.stringify(r.user));setUser(r.user)}).catch(()=>{});
  return()=>{alive=false};
 },[]);

 const value=useMemo(()=>({user,role:user?.role||null,isAuthenticated,login,logout,can}),[user,isAuthenticated]);
 return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(){return useContext(AuthContext)}