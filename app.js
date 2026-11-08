'use strict';
const $=id=>document.getElementById(id),c=window.NY_CONFIG;
let revision=0,ticket='',busy=false;
const messages={CONFIG:'参加入口は準備中です。',STOPPED:'現在、参加入口を停止しています。',AUTH:'LINEから開き直して認証してください。',IDENTITY:'有効な会員情報を確認できません。事務局へお問い合わせください。',FORBIDDEN:'設定変更の権限がありません。',NOT_LINKED:'本人確認・登録を行ってください。',URL:'Zoomの招待URLを確認してください（https://…zoom.us/j/会議ID）。',CONFLICT:'別の画面で設定が変わりました。再読み込みしてください。',EXPIRED:'確認期限が切れました。URLを確認し直してください。',AUDIT_FULL:'設定履歴の保守が必要です。管理者へお問い合わせください。'};
async function api(action,extra={}){const token=liff.getIDToken();if(!token)throw Error(messages.AUTH);const r=await fetch(c.apiUrl,{method:'POST',credentials:'omit',referrerPolicy:'no-referrer',body:new URLSearchParams({action,idToken:token,...extra}),signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('通信できませんでした。再試行してください。');const d=await r.json();if(!d.ok)throw Error(messages[d.code]||'処理できませんでした。再読み込みしてお試しください。');return d;}
async function run(fn){if(busy)return;busy=true;$('error').textContent='';try{await fn();}catch(e){$('error').textContent=e.message||'再試行してください。';}finally{busy=false;}}
function clearConfirmation(){ticket='';$('confirmation').hidden=true;$('checked').checked=false;$('commit').disabled=true;}
async function resolve(){
 $('join').hidden=true;$('admin').hidden=true;$('register').hidden=true;clearConfirmation();
 const d=await api('resolve');if(!d.registered){$('status').textContent='先に会員本人確認を行ってください。';$('register').href='https://liff.line.me/'+c.registrationLiffId+'?view=register&next=newyear2027';$('register').hidden=false;return;}
 $('status').textContent=d.preparing?'本人確認が完了しました。Zoom会議室は準備中です。':'本人確認が完了しました。';$('join').hidden=d.preparing;
 $('admin').hidden=!d.admin;if(d.admin){revision=d.revision;$('current').textContent=d.zoomUrl||'未設定';$('url').value=d.zoomUrl||'';}
}
// Same strict invitation subset as GAS; preserve the opaque pwd unchanged.
function nyValidZoom(v){
 return typeof v==='string'&&v.length<=1024&&v===v.trim()&&!/[\r\n]/.test(v)&&/^https:\/\/((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)?zoom\.us)\/j\/(\d{9,11})(?:\?pwd=([A-Za-z0-9_.~-]{1,256}))?$/.test(v);
}
$('join').onclick=()=>run(async()=>{const d=await api('join');if(d.preparing){await resolve();return;}if(!nyValidZoom(d.zoomUrl))throw Error('会議室URLを確認できません。');$('retryNote').hidden=false;if(liff.isInClient())liff.openWindow({url:d.zoomUrl,external:true});else window.location.assign(d.zoomUrl);});
$('settings').onsubmit=e=>{e.preventDefault();run(async()=>{clearConfirmation();if(!nyValidZoom($('url').value))throw Error(messages.URL);const d=await api('preview',{url:$('url').value,revision:String(revision)});ticket=d.ticket;$('candidate').textContent=d.url;$('meeting').textContent='会議ID：'+d.meetingId;$('confirmation').hidden=false;});};
$('checked').onchange=()=>{$('commit').disabled=!$('checked').checked;};
$('url').oninput=clearConfirmation;$('cancel').onclick=clearConfirmation;
$('commit').onclick=()=>run(async()=>{if(!ticket||!$('checked').checked)return;await api('commit',{ticket});clearConfirmation();await resolve();$('status').textContent='Zoom招待URLを保存しました。';});
$('reload').onclick=()=>window.location.reload();
run(async()=>{if(!/^\d+-[A-Za-z0-9]+$/.test(c.liffId)||!/^\d+-[A-Za-z0-9]+$/.test(c.registrationLiffId)||c.liffId===c.registrationLiffId||!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(c.apiUrl))throw Error(messages.CONFIG);await liff.init({liffId:c.liffId});if(!liff.isLoggedIn()){liff.login({redirectUri:window.location.origin+window.location.pathname});return;}await resolve();});
