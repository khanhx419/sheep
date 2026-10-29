import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { translate, tr, setLanguage, readLanguage, LANGUAGE_KEY } from './i18n.js';
import { ITEMS, WOLVES } from './catalog.js';
import { CHARMS } from './charms.js';
import { newGame, readSave, SAVE_KEY } from './rules.js';
const vietnamese=/[ĂăÂâĐđÊêÔôƠơƯư\u1ea0-\u1ef9]/;
test('English covers all item and wolf names, descriptions, clues and abilities',()=>{
 for(const item of [...Object.values(ITEMS),...Object.values(CHARMS),...Object.values(WOLVES)])for(const key of ['name','description','clue','mechanic'])if(item[key]){
  const result=translate(item[key],'en');assert.ok(!vietnamese.test(result),result);
  assert.equal(translate(item[key],'vi'),item[key]);
 }
});
test('dynamic amounts and composed dawn reports translate without changing numbers',()=>{
 assert.equal(translate('Đặt 12 Xu · Cân bùa ngẫu nhiên','en'),'Offer 12 coins · Weigh a random charm');
 assert.equal(translate('Đêm 4: Sói ăn mất 2 cừu. Thu 6 xu (1 xu/cừu lớn).','en'),'Night 4: Wolves ate 2 sheep. Earned 6 coins (1 coin/adult sheep).');
 assert.equal(translate('Ba xúc xắc: 4 + 4 + 4 = 12. Đoán đúng · May mắn ×2.','en'),'Three dice: 4 + 4 + 4 = 12. Correct guess · Luck ×2.');
 assert.equal(translate('Đã mua Bùa Hỏa Bộc. Đã dùng Bia thợ săn.','en'),"Bought Blast Charm. Used Hunter's beer.");
 assert.equal(translate('#07','en'),'#07');
});
test('language storage is separate from progress and blocked storage falls back safely',()=>{
 assert.equal(readLanguage({getItem:()=> 'en'}),'en');assert.equal(readLanguage({getItem:()=> 'invalid'}),'vi');assert.equal(readLanguage({getItem(){throw Error();}}),'vi');
 const state=newGame(),raw=JSON.stringify(state);let writes=[];
 globalThis.localStorage={getItem:key=>key===SAVE_KEY?raw:null,setItem:(...args)=>writes.push(args)};
 try{setLanguage('en');assert.deepEqual(writes,[[LANGUAGE_KEY,'en']]);assert.equal(JSON.stringify(readSave(localStorage)),raw);setLanguage('vi');assert.equal(JSON.stringify(readSave(localStorage)),raw);}finally{delete globalThis.localStorage;setLanguage('vi');}
});
test('render localization preserves handlers, control values, keys and Vietnamese switching',()=>{
 const handler=()=>{},node=createElement('button',{key:'low',value:'low',onClick:handler,'aria-label':'Cài đặt'},['Cài đặt',createElement('strong',{key:'n'},'Túi đồ')]);
 setLanguage('en');try{const result=tr(node);assert.equal(result.props.onClick,handler);assert.equal(result.props.value,'low');assert.equal(result.key,'low');assert.equal(result.props['aria-label'],'Settings');assert.equal(result.props.children[0],'Settings');assert.equal(result.props.children[1].props.children,'Inventory');
 const unkeyed=createElement('section',null,createElement('span',null,'Cài đặt'),createElement('span',null,'Túi đồ'));const translated=tr(unkeyed);assert.equal(translated.props.children[0].key,null);assert.equal(translated.props.children[1].key,null);}finally{setLanguage('vi');}assert.equal(tr(node),node);
});
