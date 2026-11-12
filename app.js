'use strict';
const c=window.CHECK_CONFIG,$=id=>document.getElementById(id);
let busy=false,initialized=false;
const messages={STOPPED:'照合試験は停止中です。',REQUEST:'照合要求を確認できません。',AUTH:'LINEの認証を確認できません。試験画面を開き直してください。',FORBIDDEN:'このLINEアカウントは今回の試験対象ではありません。',READ_UNAVAILABLE:'会員情報を読み取れませんでした。管理者に結果をお知らせください。',CHECK_FAILED:'ID054との一致・有効会員状態を確認できませんでした。',INTERNAL:'照合を完了できませんでした。'};
async function checkSdk_(){
 if(typeof liff!=='undefined')return;
 await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://static.line-scdn.net/liff/edge/2/sdk.js';s.integrity='sha384-1oGcmuvrrA8FN0gjWHb5JnzfrBAcRfLRUY3yykZMm79iIMHAWTxEgEmWJrN6CxLN';s.crossOrigin='anonymous';s.onload=resolve;s.onerror=()=>reject(Error('INTERNAL'));document.head.appendChild(s);});
}
function validConfig(){return c&&c.enabled===true&&c.liffId==='2012477968-vhsIfsUM'&&c.apiUrl==='https://script.google.com/macros/s/AKfycbx7epwRjsQ2HtjVCT5Tq2-DI3LNE8XdpNV7PbE7zKOHFN4KL3T6x5P_fXSAaCAKD-LpdQ/exec';}
if(!validConfig()){$('start').disabled=true;$('status').textContent='照合試験は停止中です。';}
// No init, login, API call, automatic retry, storage, or telemetry before a click.
$('start').onclick=async()=>{
 if(busy||!validConfig())return;busy=true;$('start').disabled=true;$('error').textContent='';$('result').textContent='';$('status').textContent='認証・照合を確認しています…';
 try{
  if(!initialized){await checkSdk_();await liff.init({liffId:c.liffId});initialized=true;}
  if(!liff.isLoggedIn()){liff.login({redirectUri:location.origin+location.pathname});$('status').textContent='LINE認証後に、開始ボタンをもう一度押してください。';return;}
  const token=liff.getIDToken();if(!token)throw Error('AUTH');
  const r=await fetch(c.apiUrl,{method:'POST',credentials:'omit',referrerPolicy:'no-referrer',body:new URLSearchParams({action:'compare054',idToken:token}),signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw Error('INTERNAL');const d=await r.json();if(!d.ok)throw Error(Object.hasOwnProperty.call(messages,d.code)?d.code:'INTERNAL');
  if(d.matched!==true||d.memberId!=='054'||d.active!==true||typeof d.admin!=='boolean')throw Error('INTERNAL');
  $('status').textContent='本人照合が完了しました。';$('result').textContent=d.admin?'ID054：一致／有効会員／管理者':'ID054：一致／有効会員／一般会員';
 }catch(e){$('status').textContent='照合は完了していません。';$('error').textContent=messages[e.message]||'通信または認証を完了できませんでした。';}
 finally{busy=false;$('start').disabled=false;}
};
