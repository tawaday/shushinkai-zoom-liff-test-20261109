'use strict';
const c=window.CHECK_CONFIG,$=id=>document.getElementById(id);
$('version').textContent='限定接続試験 A3';
let busy=false,initialized=false;
const messages={READ_RANGE:'読取範囲の指定を受理されませんでした（D12）。',READ_FIELDS:'応答項目の指定を受理されませんでした（D13）。',READ_TRANSPORT:'読取通信を開始または完了できませんでした（D06）。',READ_REQUEST:'読取要求を受理されませんでした（D07）。',READ_THROTTLED:'読取要求が制限されました（D08）。',READ_UPSTREAM:'読取先で一時的な障害が発生しました（D09）。',READ_HTTP_OTHER:'読取応答を確認できませんでした（D10）。',READ_RESPONSE:'読取結果を解析できませんでした（D11）。',LIMIT:'今回の操作上限（各10回）に達しました。担当者にお知らせください。',BUSY:'処理が重なりました。再試行せず担当者にお知らせください。',L01:'LINE機能を読み込めませんでした（L01）。',L02:'LINE機能を初期化できませんでした（L02）。',C01:'通信応答が正常ではありません（C01）。',C02:'応答を解析できません（C02）。',C03:'照合結果の形式を確認できません（C03）。',C04:'通信要求を完了できません（C04）。',C05:'応答のエラー分類を確認できません（C05）。',S01:'サーバーの開始処理で停止しました（S01）。',S02:'要求の解析処理で停止しました（S02）。',S03:'本人認証処理で停止しました（S03）。',S04:'台帳照合処理で停止しました（S04）。',S05:'設定読取処理で停止しました（S05）。',STOPPED:'現在は試験を受け付けていません。担当者にお知らせください。',REQUEST:'照合要求を確認できません。',AUTH:'LINEの認証を確認できません。試験画面を開き直してください。',FORBIDDEN:'このLINEアカウントは今回の試験対象ではありません。',READ_API_DISABLED:'試験環境でGoogle Sheets APIが利用できません（D01）。',READ_SCOPE:'試験環境のGoogle認可範囲を確認してください（D02）。',READ_AUTH:'試験環境のGoogle認可を確認してください（D03）。',READ_DENIED:'Google側で台帳の読み取りを拒否されました（D04）。',READ_NOT_FOUND:'試験環境から対象台帳を参照できません（D05）。',READ_UNAVAILABLE:'会員情報を読み取れませんでした。管理者に結果をお知らせください。',CHECK_FAILED:'本人との一致・有効会員状態を確認できませんでした。',INTERNAL:'照合を完了できませんでした。',MEETING_UNAVAILABLE:'保存済みの試験会議室を確認できませんでした。'};
async function checkSdk_(){
 if(typeof liff!=='undefined')return;
 await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://static.line-scdn.net/liff/edge/versions/2.32.0/sdk.js';s.integrity='sha384-wgOpgXplapxd5Zyqw6Ct1szjtBMcmRJxoemPCuBN3KQo6jVacPu/6jyF5vTcjScF';s.crossOrigin='anonymous';s.onload=()=>typeof liff!=='undefined'?resolve():reject(Error('L01'));s.onerror=()=>reject(Error('L01'));document.head.appendChild(s);});
}
function validConfig(){return c&&c.enabled===true&&/^\d+-[A-Za-z0-9]+$/.test(c.liffId)&&/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(c.apiUrl);}
if(!validConfig()){$('start').disabled=true;$('status').textContent='現在は試験を受け付けていません。担当者にお知らせください。';}
// No init, login, API call, automatic retry, storage, or telemetry before a click.
$('start').onclick=async()=>{
 if(busy||!validConfig())return;$('admin').hidden=true;$('join').hidden=true;$('settingStatus').textContent='';busy=true;$('start').disabled=true;$('error').textContent='';$('result').textContent='';$('status').textContent='認証・照合を確認しています…';
 try{
  if(!initialized){await checkSdk_();try{await liff.init({liffId:c.liffId});}catch(_){throw Error('L02');}initialized=true;}
  if(!liff.isLoggedIn()){liff.login({redirectUri:location.origin+location.pathname});$('status').textContent='LINE認証後に、開始ボタンをもう一度押してください。';return;}
  const d=await request('compare');
  if(d.matched!==true||!['054','057'].includes(d.memberId)||d.active!==true||typeof d.admin!=='boolean')throw Error('C03');
  $('status').textContent='本人確認ができました。Zoomにお進みください。';$('result').textContent='有効会員／'+(d.admin?'管理者':'一般会員');$('admin').hidden=true;$('join').hidden=false;
 }catch(e){$('status').textContent='照合は完了していません。';$('error').textContent=messages[e.message]||'通信または認証を完了できませんでした。';}
 finally{busy=false;$('start').disabled=false;}
};

async function request(action){
 const token=liff.getIDToken();if(!token)throw Error('AUTH');
 let r;try{r=await fetch(c.apiUrl,{method:'POST',credentials:'omit',referrerPolicy:'no-referrer',body:new URLSearchParams({action,idToken:token}),signal:AbortSignal.timeout(20000)});}catch(_){throw Error('C04');}
 if(!r.ok)throw Error('C01');let d;try{d=await r.json();}catch(_){throw Error('C02');}if(!d||typeof d!=='object')throw Error('C03');if(!d.ok){
  if(d.code==='READ_REQUEST'&&d.diagnostic==='D12')throw Error('READ_RANGE');
  if(d.code==='READ_REQUEST'&&d.diagnostic==='D13')throw Error('READ_FIELDS');
  throw Error(Object.hasOwnProperty.call(messages,d.code)?d.code:'C05');
 }return d;
}
function validZoom(v){return typeof v==='string'&&v.length<=1024&&/^https:\/\/((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)?zoom\.us)\/j\/\d{9,11}(?:\?pwd=[A-Za-z0-9_.~-]{1,256})?$/.test(v);}
async function runAction(fn){
 if(busy||!validConfig())return;busy=true;for(const id of ['start','settings','join'])$(id).disabled=true;$('error').textContent='';
 try{await fn();}catch(e){$('admin').hidden=true;$('join').hidden=true;$('settingStatus').textContent='';$('error').textContent=messages[e.message]||messages.INTERNAL;}
 finally{busy=false;for(const id of ['start','settings','join'])$(id).disabled=false;}
}
$('settings').onclick=()=>{};
$('join').onclick=()=>runAction(async()=>{const d=await request('join');if(!validZoom(d.zoomUrl))throw Error('MEETING_UNAVAILABLE');$('retryNote').hidden=false;if(liff.isInClient())liff.openWindow({url:d.zoomUrl,external:true});else window.location.assign(d.zoomUrl);});
