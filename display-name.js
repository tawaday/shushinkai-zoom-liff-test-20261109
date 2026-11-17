'use strict';
const NameGuide=(()=>{
 const node=id=>document.getElementById(id);let generation=0,pending=false;
 function clear(){generation++;pending=false;node('namePanel').hidden=true;node('displayName').value='';node('copyStatus').textContent='';node('copyName').disabled=true;}
 function show(value){clear();node('namePanel').hidden=false;
  const good=typeof value==='string'&&value.length<=105&&value.includes('\u3000')&&!/[\x00-\x1f\x7f<>\u202a-\u202e\u2066-\u2069]/.test(value);
  node('displayName').value=good?value:'';node('copyName').disabled=!good;
  if(!good)node('copyStatus').textContent='表示名を確認できませんでした。そのまま参加して事務局へお知らせください。';
 }
 node('copyName').onclick=async()=>{
  if(pending||node('namePanel').hidden||!node('displayName').value||node('copyName').disabled)return;
  const current=generation,value=node('displayName').value;pending=true;node('copyName').disabled=true;
  try{
   if(!window.isSecureContext||!navigator.clipboard?.writeText)throw Error('UNAVAILABLE');
   await navigator.clipboard.writeText(value);
   if(current===generation)node('copyStatus').textContent='コピーしました。Zoomの名前欄に貼り付けてください。';
  }catch(_){
   if(current===generation){node('displayName').focus();node('displayName').select();node('copyStatus').textContent='自動コピーできませんでした。表示名を長押し、または選択してコピーしてください。そのまま参加することもできます。';}
  }finally{if(current===generation){pending=false;node('copyName').disabled=false;}}
 };
 clear();return {show,clear};
})();
