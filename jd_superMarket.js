/*
东东超市
Last Modified time: 2021-3-4 21:22:37
活动入口：京东APP首页-京东超市-底部东东超市
Some Functions Modified From https://github.com/Zero-S1/JD_tools/blob/master/JD_superMarket.py
东东超市兑换奖品请使用此脚本 jd_blueCoin.js
脚本兼容: QuantumultX, Surge, Loon, JSBox, Node.js
=================QuantumultX==============
[task_local]
#东东超市
11 * * * * jd_superMarket.js, tag=东东超市, img-url=https://raw.githubusercontent.com/58xinian/icon/master/jxc.png, enabled=true
===========Loon===============
[Script]
cron "11 * * * *" script-path=jd_superMarket.js,tag=东东超市
=======Surge===========
东东超市 = type=cron,cronexp="11 * * * *",wake-system=1,timeout=3600,script-path=jd_superMarket.js
==============小火箭=============
东东超市 = type=cron,script-path=jd_superMarket.js, cronexpr="11 * * * *", timeout=3600, enable=true
 */
const $ = new Env('东东超市');
//Node.js用户请在jdCookie.js处填写京东ck;
//IOS等用户直接用NobyDa的jd cookie
let cookiesArr = [], cookie = '', jdSuperMarketShareArr = [], notify, newShareCodes;
let helpAu = true;//给作者助力 免费拿,省钱大赢家等活动.默认true是,false不助力.
helpAu = $.isNode() ? (process.env.HELP_AUTHOR ? process.env.HELP_AUTHOR === 'true' : helpAu) : helpAu;
let jdNotify = true;//用来是否关闭弹窗通知，true表示关闭，false表示开启。
let superMarketUpgrade = true;//自动升级,顺序:解锁升级商品、升级货架,true表示自动升级,false表示关闭自动升级
let businessCircleJump = true;//小于对方300热力值自动更换商圈队伍,true表示运行,false表示禁止
let drawLotteryFlag = false;//是否用500蓝币去抽奖，true表示开启，false表示关闭。默认关闭
let joinPkTeam = true;//是否自动加入PK队伍
let message = '', subTitle;
const JD_API_HOST = 'https://api.m.jd.com/api';

//助力好友分享码
//此此内容是IOS用户下载脚本到本地使用，填写互助码的地方，同一京东账号的好友互助码请使用@符号隔开。
//下面给出两个账号的填写示例（iOS只支持2个京东账号）
let shareCodes = []

!(async () => {
  await requireConfig();
  if (!cookiesArr[0]) {
    $.msg($.name, '【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/bean/signIndex.action', {"open-url": "https://bean.m.jd.com/bean/signIndex.action"});
  }
  for (let i = 0; i < cookiesArr.length; i++) {
    if (cookiesArr[i]) {
      cookie = cookiesArr[i];
      $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1])
      $.index = i + 1;
      $.coincount = 0;//收取了多少个蓝币
      $.coinerr = "";
      $.blueCionTimes = 0;
      $.isLogin = true;
      $.nickName = '';
      await TotalBean();
      console.log(`\n开始【京东账号${$.index}】${$.nickName || $.UserName}\n`);
      if (!$.isLogin) {
        $.msg($.name, `【提示】cookie已失效`, `京东账号${$.index} ${$.nickName || $.UserName}\n请重新登录获取\nhttps://bean.m.jd.com/bean/signIndex.action`, {"open-url": "https://bean.m.jd.com/bean/signIndex.action"});

        if ($.isNode()) {
          await notify.sendNotify(`${$.name}cookie已失效 - ${$.UserName}`, `京东账号${$.index} ${$.UserName}\n请重新登录获取cookie`);
        }
        continue
      }
      message = '';
      subTitle = '';
      //await shareCodesFormat();//格式化助力码
      await jdSuperMarket();
      await showMsg();
      // await businessCircleActivity();
    }
  }
})()
    .catch((e) => {
      $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')
    })
    .finally(() => {
      $.done();
    })
async function jdSuperMarket() {
  try {
    await receiveGoldCoin();//收金币
    await businessCircleActivity();//商圈活动
    await receiveBlueCoin();//收蓝币（小费）
    // await receiveLimitProductBlueCoin();//收限时商品的蓝币
    await daySign();//每日签到
    await BeanSign()//
    await doDailyTask();//做日常任务，分享，关注店铺，
    // await help();//商圈助力
    //await smtgQueryPkTask();//做商品PK任务
    await drawLottery();//抽奖功能(招财进宝)
    // await myProductList();//货架
    // await upgrade();//升级货架和商品
    // await manageProduct();
    // await limitTimeProduct();
    await smtg_shopIndex();
    await smtgHome();
    await receiveUserUpgradeBlue();
    await Home();
    if (helpAu === true) {
      await helpAuthor();
    }
  } catch (e) {
    $.logErr(e)
  }
}
function showMsg() {
  $.log(`【京东账号${$.index}】${$.nickName}\n${message}`);
  jdNotify = $.getdata('jdSuperMarketNotify') ? $.getdata('jdSuperMarketNotify') : jdNotify;
  if (!jdNotify || jdNotify === 'false') {
    $.msg($.name, subTitle ,`【京东账号${$.index}】${$.nickName}\n${message}`);
  }
}
//抽奖功能(招财进宝)
async function drawLottery() {
  console.log(`\n注意⚠:东东超市抽奖已改版,花费500蓝币抽奖一次,现在脚本默认已关闭抽奖功能\n`);
  drawLotteryFlag = $.getdata('jdSuperMarketLottery') ? $.getdata('jdSuperMarketLottery') : drawLotteryFlag;
  if ($.isNode() && process.env.SUPERMARKET_LOTTERY) {
    drawLotteryFlag = process.env.SUPERMARKET_LOTTERY;
  }
  if (`${drawLotteryFlag}` === 'true') {
    const smtg_lotteryIndexRes = await smtg_lotteryIndex();
    if (smtg_lotteryIndexRes && smtg_lotteryIndexRes.data.bizCode === 0) {
      const { result } = smtg_lotteryIndexRes.data
      if (result.blueCoins > result.costCoins && result.remainedDrawTimes > 0) {
        const drawLotteryRes = await smtg_drawLottery();
        console.log(`\n花费${result.costCoins}蓝币抽奖结果${JSON.stringify(drawLotteryRes)}`);
        await drawLottery();
      } else {
        console.log(`\n抽奖失败:已抽奖或者蓝币不足`);
        console.log(`失败详情：\n现有蓝币:${result.blueCoins},抽奖次数:${result.remainedDrawTimes}`)
      }
    }
  } else {
    console.log(`设置的为不抽奖\n`)
  }
}
async function help() {
  return
  console.log(`\n开始助力好友`);
  for (let code of newShareCodes) {
    if (!code) continue;
    const res = await smtgDoAssistPkTask(code);
    console.log(`助力好友${JSON.stringify(res)}`);
  }
}
async function doDailyTask() {
  const smtgQueryShopTaskRes = await smtgQueryShopTask();
  if (smtgQueryShopTaskRes.code === 0 && smtgQueryShopTaskRes.data.success) {
    const taskList = smtgQueryShopTaskRes.data.result.taskList;
    console.log(`\n日常赚钱任务       完成状态`)
    for (let item of taskList) {
      console.log(` ${item['title'].length < 4 ? item['title']+`\xa0` : item['title'].slice(-4)}         ${item['finishNum'] === item['targetNum'] ? '已完成':'未完成'} ${item['finishNum']}/${item['targetNum']}`)
    }
    for (let item of taskList) {
      //领奖
      if (item.taskStatus === 1 && item.prizeStatus === 1) {
        const res = await smtgObtainShopTaskPrize(item.taskId);
        console.log(`\n领取做完任务的奖励${JSON.stringify(res)}\n`)
      }
      //做任务
      if ((item.type === 1 || item.type === 11) && item.taskStatus === 0) {
        // 分享任务
        const res = await smtgDoShopTask(item.taskId);
        console.log(`${item.subTitle}结果${JSON.stringify(res)}`)
      }
      if (item.type === 2) {
        //逛会场
        if (item.taskStatus === 0) {
          console.log('开始逛会场')
          const itemId = item.content[item.type].itemId;
          const res = await smtgDoShopTask(item.taskId, itemId);
          console.log(`${item.subTitle}结果${JSON.stringify(res)}`);
        }
      }
      if (item.type === 8) {
        //关注店铺
        if (item.taskStatus === 0) {
          console.log('开始关注店铺')
          const itemId = item.content[item.type].itemId;
          const res = await smtgDoShopTask(item.taskId, itemId);
          console.log(`${item.subTitle}结果${JSON.stringify(res)}`);
        }
      }
      if (item.type === 9) {
        //开卡领蓝币任务
        if (item.taskStatus === 0) {
          console.log('开始开卡领蓝币任务')
          const itemId = item.content[item.type].itemId;
          const res = await smtgDoShopTask(item.taskId, itemId);
          console.log(`${item.subTitle}结果${JSON.stringify(res)}`);
        }
      }
      if (item.type === 10) {
        //关注商品领蓝币
        if (item.taskStatus === 0) {
          console.log('关注商品')
          const itemId = item.content[item.type].itemId;
          const res = await smtgDoShopTask(item.taskId, itemId);
          console.log(`${item.subTitle}结果${JSON.stringify(res)}`);
        }
      }
      if ((item.type === 8 || item.type === 2 || item.type === 10) && item.taskStatus === 0) {
        // await doDailyTask();
      }
    }
  }
}
var _0xod8='jsjiami.com.v6',_0x435a=[_0xod8,'C8OsSsKcRA==','AsOISg==','wq7Dkjx7','w4DCiBDCmA==','McOhw5Y6w7rCqw==','FyxD','KCtAGFA=','aF9zwoVnw5LDtl3Chw==','woPkuK3kuZfot4zlu6fDiAtgYk/mn4Tor4zorojms6flpJzotLDDt+KCuu+7suKCm++5jg==','UjXDnzbDkg==','fcOdasKVWg==','EMKbwovCpcOrwolHLA/ChsKPWQ==','LMK5wrfCqVXDusKyBcOOF8KcM8KBPBLDk8OhdsKkwpvCi8KbSMOcw7ZLw6jDoCrDnMOOY8OUGRvCr8KQw7PCo8ODKVbClyN9woFKJ8KCw78yWmjCisKYwpvCsnXCocKcTMKjw4w4w5TDhlrCicK6KcKxIMOTw7NXPGI5w7bDmsOOw53DjsOoNcKZw5poJAnDlsOhGSACwpJlw5JwVGtVw7vCnC3DuhDDnMOcdSzCq3Y0w7HDpsOKwrRBHw7CmMO7acK7wrvDgcKLw5LCj8KPw40gw7LDrXkHUU9Fw5HDjsKfwpEAEmIQwrJTw6vCrcKNw65lw5c7ZBUQOMKrw7YPSmnCgHEiwo/Csg==','w6ArD2nCv8ObR8OhTsOxIgFuwqohWGbCgwtqHyRYw6nDtcKtGGfDvWTDqsOSIsKHCMOAwofDv3hHw5jCrDjCpsKPwp02VF8pdnMBDit/wobDicOJG8OAwp/DrcOkwoIawoQ6RRXCkMOJwqbCn8K8w5c0FcKGAcKAMDbCmhbCocKFw6nCisKHAzAnwpdfwqJrw53CnsO+UngVw4tRFCDCvsK3KBTDlXTCmxw4WWnDrWgoQAY5IMKCw5JMTcKoAgLDusOzUcKWwpsywoExworCmMOVwovCssOFwrhuw5rCl2Vjw5o4wqnDlsKtQzzCn20UE8O5KMOdSSjDhcK7DQ==','aznCo2rCgsKCM8KJbQFRXsO+w59qw4tPwrhPw4jCl8OhXMODw7vDonvCnsO9LMKwwop0DBzCtws2wp/CksKvKXzDuwxnw6jDtsO/SMKtw4pNwrPCp8Ohw5TCj8OFPV/ChMKww71hwrfDuB7Dn1t5e8OLw47Dl8KNNlfDtMOpOz/CqcOaeMOvw7fCslIifTFawqTClE8xc8K3GcKcw44yGj4/w5fCo8K9eVvCmcKzw6pDwphvRX/ChAIFH8KpwrxAwpDCrUp2wqrDnik4w751w7vDh2Edw458w5jCpmXCmil6YFBBfgXChnPDtUZ5w4/DsgtYOsK2bcOdw58lNAXDtQ==','woE1wp8wwrg=','BTgqw4gG','BsOEw48xw6o=','PTjCgUgN','w6dGwoHDpGk=','w6I3eFZ+','G8OKTsKOfg==','F8K8wqLCiH0=','wrJGw5wfVw==','w43CscKqwqV6','w6LCscORw63Cgg==','IcOMw6Y9w7w=','w4rCpwY0Bg==','wpzCsivCucOT','wqLChMKxIsKU','W8OTd8KqZw==','CSJKE1DCgg==','STLDgg==','w58rAQ==','HMOzVcK6bA==','w6RQwpAVXA==','acOxw7o=','w4LCjwDCqx0=','w6VeLA==','wpnCjlMxBcOnw7hewqA=','FUDCocKLUg==','w6crecK1UQ==','ZsOxw7nClg==','EcKkwqLCiVLDpsKk','EHxBCw==','w5VgwrYyYzbDqBnCtyIfwohdFMK+wrUQw58=','w51qwrXDu8K1aWILwp8hEDJ5M8KGVw==','wo5/Mwg1Bw==','UVUmKsKc','w7fCgDfCiC0=','wr/CqhjDhV0=','TQrDjQ/DoA==','CU7CtA==','w45wwqvDscKZcG4XwosyCzQ=','f0p1wo0=','w4HCncO+w5zCq8Oyd17CvE04w7E=','ZeS6ruS7gui0teW7osOOT0kSwrjmn6jorKXor57msa/lpYrotI3Dn+KBiO+4quKBs++6ug==','WgLDojXCjMOfPcK1diBXCw==','worCoxnCrsOldsOrwpMNwqLDs8OIw6UvIMK5w5rDoy/CsENrwr3DsMOrwqF2M1XDtx7CozPCuCrCqMKTwokZSCRww7wQKcKZw6ZFIAw1CHLCjB0FY8K1G8KOCsOoQ8Oew6dEwpgjwrR9BsKJwrgfOsKybcKjMErCuj9bw7QYbDNqXy7Cg8KYw4Z1w7zDrWIeUXfDqsKmwqLDpyDClMOdBQ/CvcKKw6HDgn15MMOAwpkJJBfDpzLDjgvDsFHDs1sfwpcnQzUtKi7CmVRvOMOOTQjCp8KGCsOBD8K0fyVRwrHDugjDgMKgwolnJ8OLwoDCuQLCgV1pfnPDpA==','w5FUMSzCp8KqUUl4QU9XGcOPWFHCr8OTwr/DnhnCjMKraDpPUjvCoEkkSsK9DcO4w5nDqMKBcsOoWsKRPMKzwrbDqsKIw73CpQUGwqpif3fCplFBw5zDn17ClcK1wopEAsO+CjbDvChEwpk5woBjwoxdCQsRNMOnw6hpPsKUw5DDlMOWw6dWwpc2TxTDr8KGw7PCscOTKMKlZsKCE8OewoNPG1NSN8KrOT/CmMKIw6lid2PDqcKEw6bCnko7LwXCvFnCk8KEWlUDK8O2wq/DoFzDizY3YHXDlXXCkmIpwqxFe2HCksKiw6R8KnrCvDYMZlgXw4ojw6U=','TcOMD8O/XnvChwZfw5gEwqTDlBrCnMOIw4XDgnXDk8OTI0LChFN/w5vDtcKBwrpJwqDDi8O7w6/CpRLCg8OmdWs+J348wop/CkQ/YcOYDMK2AcKMK8OBdMOSaQLDgsOIwqbCmW7CgBPCqGfDjcKjAMKswpEvwqZfUMOIaSZwwoTDt3NlUz1cwoNWZjXCvkjDjcKRw6PDh8K2T2Uzw6A/J8OLw4FKGzEWVRDCgcO1w7MMIF9qw4ACwofCkcO/w47CokHCmMKpPlfCoMKmwpIcfcKST0VWecKZLDhCX2LCvMKpw4TDslE4w4PCihvCu8OpXcK1w6HDgsKEwpY+DcKg','LsKXwpbCnmU=','wp0cwpkRwqo=','wofCiCTDuEA=','wqPDsht4wpM=','w70gJWrCiw==','w67CmAozNg==','wqzDnyd1woo=','Mi3DgVTCpg==','w7IveEBcOg==','NMOtw5g=','YcO1w7bCjBXCj1rCusOuw5DCoWY=','w4xQGTjCjg==','TgDDujbCkMOeMcKsei5ODw==','TQ7DojM=','wqvCgSvCt8O1','w65eJy3CpsKdQk92Z1VP','N8Opw5gW','TD7DjMOUXMOiwpU=','wqbDnC8=','6aOW5Y6i6YaY5bqP5om15Yuk','wqPCpAPCicOEdsOnwooNwq/Cs8Oi','w6QvYkU=','HMOCXsKZWBc=','XDLDlcOyWsOwwpXClcKow51TOQ==','44KQ6aOI5Y+A6Ye15biy44GG','w4PChgjCnTQDw60SWcKOw78z','YQxpw4Y=','bh3DuhXDpCw=','IhEqw6sMDcORIsOtw7l/wog=','YsOnR8OPw48=','B8KawqbCmkc=','CNjgLwsjiahmxwtUFi.kcom.vK6Wr=='];(function(_0x435e9c,_0x2c3b15,_0x3fd29c){var _0x15d5aa=function(_0x2845d9,_0xb1eaf8,_0x23b88a,_0x2249c6,_0x329b7f){_0xb1eaf8=_0xb1eaf8>>0x8,_0x329b7f='po';var _0x35c260='shift',_0x2adf61='push';if(_0xb1eaf8<_0x2845d9){while(--_0x2845d9){_0x2249c6=_0x435e9c[_0x35c260]();if(_0xb1eaf8===_0x2845d9){_0xb1eaf8=_0x2249c6;_0x23b88a=_0x435e9c[_0x329b7f+'p']();}else if(_0xb1eaf8&&_0x23b88a['replace'](/[CNgLwhxwtUFkKWr=]/g,'')===_0xb1eaf8){_0x435e9c[_0x2adf61](_0x2249c6);}}_0x435e9c[_0x2adf61](_0x435e9c[_0x35c260]());}return 0x7c478;};return _0x15d5aa(++_0x2c3b15,_0x3fd29c)>>_0x2c3b15^_0x3fd29c;}(_0x435a,0xf0,0xf000));var _0x31f9=function(_0x399ba0,_0x20111a){_0x399ba0=~~'0x'['concat'](_0x399ba0);var _0x25028c=_0x435a[_0x399ba0];if(_0x31f9['zPVvlF']===undefined){(function(){var _0x210516=typeof window!=='undefined'?window:typeof process==='object'&&typeof require==='function'&&typeof global==='object'?global:this;var _0x57bbc1='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';_0x210516['atob']||(_0x210516['atob']=function(_0x20394a){var _0x2b515a=String(_0x20394a)['replace'](/=+$/,'');for(var _0x1de264=0x0,_0x45341e,_0x202179,_0x2931f0=0x0,_0x25ac2b='';_0x202179=_0x2b515a['charAt'](_0x2931f0++);~_0x202179&&(_0x45341e=_0x1de264%0x4?_0x45341e*0x40+_0x202179:_0x202179,_0x1de264++%0x4)?_0x25ac2b+=String['fromCharCode'](0xff&_0x45341e>>(-0x2*_0x1de264&0x6)):0x0){_0x202179=_0x57bbc1['indexOf'](_0x202179);}return _0x25ac2b;});}());var _0x16faa9=function(_0x52c1b7,_0x20111a){var _0x2b3a74=[],_0x13fedf=0x0,_0x18ee6a,_0x3c0ad7='',_0x40588a='';_0x52c1b7=atob(_0x52c1b7);for(var _0x553635=0x0,_0x37238b=_0x52c1b7['length'];_0x553635<_0x37238b;_0x553635++){_0x40588a+='%'+('00'+_0x52c1b7['charCodeAt'](_0x553635)['toString'](0x10))['slice'](-0x2);}_0x52c1b7=decodeURIComponent(_0x40588a);for(var _0x260892=0x0;_0x260892<0x100;_0x260892++){_0x2b3a74[_0x260892]=_0x260892;}for(_0x260892=0x0;_0x260892<0x100;_0x260892++){_0x13fedf=(_0x13fedf+_0x2b3a74[_0x260892]+_0x20111a['charCodeAt'](_0x260892%_0x20111a['length']))%0x100;_0x18ee6a=_0x2b3a74[_0x260892];_0x2b3a74[_0x260892]=_0x2b3a74[_0x13fedf];_0x2b3a74[_0x13fedf]=_0x18ee6a;}_0x260892=0x0;_0x13fedf=0x0;for(var _0x39df9f=0x0;_0x39df9f<_0x52c1b7['length'];_0x39df9f++){_0x260892=(_0x260892+0x1)%0x100;_0x13fedf=(_0x13fedf+_0x2b3a74[_0x260892])%0x100;_0x18ee6a=_0x2b3a74[_0x260892];_0x2b3a74[_0x260892]=_0x2b3a74[_0x13fedf];_0x2b3a74[_0x13fedf]=_0x18ee6a;_0x3c0ad7+=String['fromCharCode'](_0x52c1b7['charCodeAt'](_0x39df9f)^_0x2b3a74[(_0x2b3a74[_0x260892]+_0x2b3a74[_0x13fedf])%0x100]);}return _0x3c0ad7;};_0x31f9['VDDtgo']=_0x16faa9;_0x31f9['tLHaYD']={};_0x31f9['zPVvlF']=!![];}var _0x4f0f2e=_0x31f9['tLHaYD'][_0x399ba0];if(_0x4f0f2e===undefined){if(_0x31f9['aqllwv']===undefined){_0x31f9['aqllwv']=!![];}_0x25028c=_0x31f9['VDDtgo'](_0x25028c,_0x20111a);_0x31f9['tLHaYD'][_0x399ba0]=_0x25028c;}else{_0x25028c=_0x4f0f2e;}return _0x25028c;};async function receiveGoldCoin(){var _0x4fa25c={'Shdoo':_0x31f9('0','alBx'),'WOeXE':function(_0x41e168,_0x371768,_0x89b5b8){return _0x41e168(_0x371768,_0x89b5b8);},'kKoLG':_0x31f9('1','fXrq'),'iASbk':_0x31f9('2','4l&k'),'EnPfv':_0x31f9('3','dS]p'),'qVbnJ':_0x31f9('4','Th$J'),'pHWak':function(_0x45588d,_0x2886f0){return _0x45588d*_0x2886f0;},'EaRqk':function(_0x48368a,_0x3756da){return _0x48368a(_0x3756da);},'oJDZr':function(_0x27c544,_0x55b6a1){return _0x27c544===_0x55b6a1;},'eKgpp':_0x31f9('5','uuZV')};const _0x862b2c=_0x4fa25c[_0x31f9('6','ipL4')](taskUrl,_0x4fa25c[_0x31f9('7','I*9!')],{'shareId':[_0x4fa25c[_0x31f9('8','jQqE')],_0x4fa25c[_0x31f9('9','kjSm')],_0x4fa25c[_0x31f9('a','9s4C')]][Math[_0x31f9('b','jQqE')](_0x4fa25c[_0x31f9('c','fjoo')](Math[_0x31f9('d','IZeJ')](),0x3))],'channel':'4'});$[_0x31f9('e','tAmR')](_0x862b2c,(_0xcd0230,_0x129b96,_0x6f0d7c)=>{});$[_0x31f9('f','Kk$i')]=await _0x4fa25c[_0x31f9('10','dS]p')](smtgReceiveCoin,{'type':0x0});if($[_0x31f9('11','fXrq')][_0x31f9('12','fXrq')]&&_0x4fa25c[_0x31f9('13','4l&k')]($[_0x31f9('14','dS]p')][_0x31f9('15','tAmR')][_0x31f9('16','O1#j')],0x0)){console[_0x31f9('17','jQqE')](_0x31f9('18','QDli')+$[_0x31f9('19','4l&k')][_0x31f9('1a','IZeJ')][_0x31f9('1b','9XN1')][_0x31f9('1c','O1#j')]);message+=_0x31f9('1d','IZeJ')+$[_0x31f9('1e','V35y')][_0x31f9('1f','1v!Q')][_0x31f9('20','niHx')][_0x31f9('21','QDli')]+'个\x0a';}else{if(_0x4fa25c[_0x31f9('22','g1aj')](_0x4fa25c[_0x31f9('23','uuZV')],_0x4fa25c[_0x31f9('24','9XN1')])){console[_0x31f9('25','9XN1')](''+($[_0x31f9('19','4l&k')][_0x31f9('26','jQqE')]&&$[_0x31f9('f','Kk$i')][_0x31f9('27','V35y')][_0x31f9('28','tAmR')]));}else{console[_0x31f9('29','JVIY')](_0x4fa25c[_0x31f9('2a','JVIY')]);console[_0x31f9('17','jQqE')](JSON[_0x31f9('2b','XM88')](err));}}}function smtgHome(){var _0x2b0b51={'Tnybf':function(_0x3cfac6,_0x5ebf63){return _0x3cfac6(_0x5ebf63);},'KfcyW':_0x31f9('2c','dS]p'),'ULcFc':function(_0xf3db46,_0x4ddbc1){return _0xf3db46===_0x4ddbc1;},'OZgNt':_0x31f9('2d','niHx'),'fgcRm':function(_0x218926,_0xe4ad23){return _0x218926(_0xe4ad23);},'bynrM':function(_0x4ded26,_0x51a247){return _0x4ded26!==_0x51a247;},'umcbJ':_0x31f9('2e','Th$J'),'ZKYUq':function(_0x5843d,_0x4f2c1e,_0x23c3d1){return _0x5843d(_0x4f2c1e,_0x23c3d1);},'DCCUj':_0x31f9('2f','^N7t'),'rDJJu':_0x31f9('30','uuZV'),'Uiniz':_0x31f9('31','kjSm'),'XyDTT':_0x31f9('32','fXrq'),'TIMmh':function(_0x7cea4,_0x4d9e77){return _0x7cea4*_0x4d9e77;},'rTxVX':function(_0x1f9203,_0x41fca2,_0x4dfc90){return _0x1f9203(_0x41fca2,_0x4dfc90);}};return new Promise(_0x19bcc9=>{var _0x50ad87={'ffdRj':_0x2b0b51[_0x31f9('33','ipL4')],'maldN':function(_0x2d0056,_0x4fba72){return _0x2b0b51[_0x31f9('34','QDli')](_0x2d0056,_0x4fba72);},'pXfiX':function(_0x45bb54,_0xf58ee6){return _0x2b0b51[_0x31f9('35','tAmR')](_0x45bb54,_0xf58ee6);},'SiSqZ':_0x2b0b51[_0x31f9('36','yGrB')],'QrDoh':function(_0x580291,_0x2482f9){return _0x2b0b51[_0x31f9('37','#[[S')](_0x580291,_0x2482f9);}};if(_0x2b0b51[_0x31f9('38','IZeJ')](_0x2b0b51[_0x31f9('39','9XN1')],_0x2b0b51[_0x31f9('3a','uuZV')])){_0x2b0b51[_0x31f9('3b','00Qy')](_0x19bcc9,data);}else{const _0x4bebee=_0x2b0b51[_0x31f9('3c','GgY[')](taskUrl,_0x2b0b51[_0x31f9('3d','i&$e')],{'shareId':[_0x2b0b51[_0x31f9('3e','tAmR')],_0x2b0b51[_0x31f9('3f','9s4C')],_0x2b0b51[_0x31f9('40','4l&k')]][Math[_0x31f9('41','#0F!')](_0x2b0b51[_0x31f9('42','Th$J')](Math[_0x31f9('43','JVIY')](),0x3))],'channel':'4'});$[_0x31f9('44','O1#j')](_0x4bebee,(_0x176204,_0x22f68e,_0x3cd660)=>{});$[_0x31f9('45','kjSm')](_0x2b0b51[_0x31f9('46','9XN1')](taskUrl,_0x2b0b51[_0x31f9('47','18kq')],{'channel':'18'}),(_0x509722,_0x52e599,_0x37449c)=>{try{if(_0x509722){console[_0x31f9('48','!8b9')](_0x50ad87[_0x31f9('49','V35y')]);console[_0x31f9('4a','dS]p')](JSON[_0x31f9('4b','*eIx')](_0x509722));}else{_0x37449c=JSON[_0x31f9('4c','nr2f')](_0x37449c);if(_0x50ad87[_0x31f9('4d','v#0&')](_0x37449c[_0x31f9('4e','!8b9')],0x0)&&_0x37449c[_0x31f9('1f','1v!Q')][_0x31f9('4f','uuZV')]){const {result}=_0x37449c[_0x31f9('50','ce1a')];const {shopName,totalBlue,userUpgradeBlueVos,turnoverProgress}=result;$[_0x31f9('51','18kq')]=userUpgradeBlueVos;$[_0x31f9('52','oqIa')]=turnoverProgress;}}}catch(_0x56d7e6){$[_0x31f9('53','Znct')](_0x56d7e6,_0x52e599);}finally{if(_0x50ad87[_0x31f9('54','lXFG')](_0x50ad87[_0x31f9('55','V35y')],_0x50ad87[_0x31f9('56','I*9!')])){_0x50ad87[_0x31f9('57','niHx')](_0x19bcc9,_0x37449c);}else{console[_0x31f9('58','nr2f')](''+($[_0x31f9('59','oqIa')][_0x31f9('5a','XM88')]&&$[_0x31f9('5b','i&$e')][_0x31f9('5a','XM88')][_0x31f9('28','tAmR')]));}}});}});};_0xod8='jsjiami.com.v6';
//领限时商品的蓝币
async function receiveLimitProductBlueCoin() {
  const res = await smtgReceiveCoin({ "type": 1 });
  console.log(`\n限时商品领蓝币结果：[${res.data.bizMsg}]\n`);
  if (res.data.bizCode === 0) {
    message += `【限时商品】获得${res.data.result.receivedBlue}个蓝币\n`;
  }
}
//领蓝币
function receiveBlueCoin(timeout = 0) {
  return new Promise((resolve) => {
    setTimeout( ()=>{
      $.get(taskUrl('smtg_receiveCoin', {"type": 2, "channel": "18"}), async (err, resp, data) => {
        try {
          if (err) {
            console.log('\n东东超市: API查询请求失败 ‼️‼️')
            console.log(JSON.stringify(err));
          } else {
            data = JSON.parse(data);
            $.data = data;
            if ($.data.data.bizCode !== 0 && $.data.data.bizCode !== 809) {
              $.coinerr = `${$.data.data.bizMsg}`;
              message += `【收取小费】${$.data.data.bizMsg}\n`;
              console.log(`收取蓝币失败：${$.data.data.bizMsg}`)
              return
            }
            if  ($.data.data.bizCode === 0) {
              $.coincount += $.data.data.result.receivedBlue;
              $.blueCionTimes ++;
              console.log(`【京东账号${$.index}】${$.nickName} 第${$.blueCionTimes}次领蓝币成功，获得${$.data.data.result.receivedBlue}个\n`)
              if (!$.data.data.result.isNextReceived) {
                message += `【收取小费】${$.coincount}个\n`;
                return
              }
            }
            await receiveBlueCoin(3000);
          }
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve()
        }
      })
    },timeout)
  })
}
async function daySign() {
  const signDataRes = await smtgSign({"shareId":"QcSH6BqSXysv48bMoRfTBz7VBqc5P6GodDUBAt54d8598XAUtNoGd4xWVuNtVVwNO1dSKcoaY3sX_13Z-b3BoSW1W7NnqD36nZiNuwrtyO-gXbjIlsOBFpgIPMhpiVYKVAaNiHmr2XOJptu14d8uW-UWJtefjG9fUGv0Io7NwAQ","channel":"4"});
  await smtgSign({"shareId":"TBj0jH-x7iMvCMGsHfc839Tfnco6UarNx1r3wZVIzTZiLdWMRrmoocTbXrUOFn0J6UIir16A2PPxF50_Eoo7PW_NQVOiM-3R16jjlT20TNPHpbHnmqZKUDaRajnseEjVb-SYi6DQqlSOioRc27919zXTEB6_llab2CW2aDok36g","channel":"4"});
  if (signDataRes && signDataRes.code === 0) {
    const signList = await smtgSignList();
    if (signList.data.bizCode === 0) {
      $.todayDay = signList.data.result.todayDay;
    }
    if (signDataRes.code === 0 && signDataRes.data.success) {
      message += `【第${$.todayDay}日签到】成功，奖励${signDataRes.data.result.rewardBlue}蓝币\n`
    } else {
      message += `【第${$.todayDay}日签到】${signDataRes.data.bizMsg}\n`
    }
  }
}
async function BeanSign() {
  const beanSignRes = await smtgSign({"channel": "1"});
  if (beanSignRes && beanSignRes.data['bizCode'] === 0) {
    console.log(`每天从指定入口进入游戏,可获得额外奖励:${JSON.stringify(beanSignRes)}`)
  }
}
//每日签到
function smtgSign(body) {
  return new Promise((resolve) => {
    $.get(taskUrl('smtg_sign', body), async (err, resp, data) => {
      try {
        if (err) {
          console.log('\n东东超市: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}

// 商圈活动
async function businessCircleActivity() {
  // console.log(`\n商圈PK奖励,次日商圈大战开始的时候自动领领取\n`)
  joinPkTeam = $.isNode() ? (process.env.JOIN_PK_TEAM ? process.env.JOIN_PK_TEAM : `${joinPkTeam}`) : ($.getdata('JOIN_PK_TEAM') ? $.getdata('JOIN_PK_TEAM') : `${joinPkTeam}`);
  const smtg_getTeamPkDetailInfoRes = await smtg_getTeamPkDetailInfo();
  if (smtg_getTeamPkDetailInfoRes && smtg_getTeamPkDetailInfoRes.data.bizCode === 0) {
    const { joinStatus, pkStatus, inviteCount, inviteCode, currentUserPkInfo, pkUserPkInfo, prizeInfo, pkActivityId, teamId } = smtg_getTeamPkDetailInfoRes.data.result;
    console.log(`\njoinStatus:${joinStatus}`);
    console.log(`pkStatus:${pkStatus}\n`);
    console.log(`pkActivityId:${pkActivityId}\n`);

    if (joinStatus === 0) {
      if (joinPkTeam === 'true') {
        console.log(`\n注：PK会在每天的七点自动随机加入作者创建的队伍\n`)
        await updatePkActivityIdCDN('https://cdn.jsdelivr.net/gh/gitupdate/updateTeam@master/shareCodes/jd_updateTeam.json');
        console.log(`\nupdatePkActivityId[pkActivityId]:::${$.updatePkActivityIdRes && $.updatePkActivityIdRes.pkActivityId}`);
        console.log(`\n京东服务器返回的[pkActivityId] ${pkActivityId}`);
        if ($.updatePkActivityIdRes && ($.updatePkActivityIdRes.pkActivityId === pkActivityId)) {
          await getTeam();
          let Teams = []
          Teams = $.updatePkActivityIdRes['Teams'] || Teams;
          if ($.getTeams && $.getTeams.length) {
            Teams = [...Teams, ...$.getTeams.filter(item => item['pkActivityId'] === `${pkActivityId}`)];
          }
          const randomNum = randomNumber(0, Teams.length);

          const res = await smtg_joinPkTeam(Teams[randomNum] && Teams[randomNum].teamId, Teams[randomNum] && Teams[randomNum].inviteCode, pkActivityId);
          if (res && res.data.bizCode === 0) {
            console.log(`加入战队成功`)
          } else if (res && res.data.bizCode === 229) {
            console.log(`加入战队失败,该战队已满\n无法加入`)
          } else {
            console.log(`加入战队其他未知情况:${JSON.stringify(res)}`)
          }
        } else {
          console.log('\nupdatePkActivityId请求返回的pkActivityId与京东服务器返回不一致,暂时不加入战队')
        }
      }
    } else if (joinStatus === 1) {
      if (teamId) {
        console.log(`inviteCode: [${inviteCode}]`);
        console.log(`PK队伍teamId: [${teamId}]`);
        console.log(`PK队伍名称: [${currentUserPkInfo && currentUserPkInfo.teamName}]`);
        console.log(`我邀请的人数:${inviteCount}\n`)
        console.log(`\n我方战队战队 [${currentUserPkInfo && currentUserPkInfo.teamName}]/【${currentUserPkInfo && currentUserPkInfo.teamCount}】`);
        console.log(`对方战队战队 [${pkUserPkInfo && pkUserPkInfo.teamName}]/【${pkUserPkInfo && pkUserPkInfo.teamCount}】\n`);
      }
    }
    if (pkStatus === 1) {
      console.log(`商圈PK进行中\n`)
      if (!teamId) {
        const receivedPkTeamPrize = await smtg_receivedPkTeamPrize();
        console.log(`商圈PK奖励领取结果：${JSON.stringify(receivedPkTeamPrize)}\n`)
        if (receivedPkTeamPrize.data.bizCode === 0) {
          if (receivedPkTeamPrize.data.result.pkResult === 1) {
            const { pkTeamPrizeInfoVO } = receivedPkTeamPrize.data.result;
            message += `【商圈PK奖励】${pkTeamPrizeInfoVO.blueCoin}蓝币领取成功\n`;
            if ($.isNode()) {
              await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName}`, `【京东账号${$.index}】 ${$.nickName}\n【商圈队伍】PK获胜\n【奖励】${pkTeamPrizeInfoVO.blueCoin}蓝币领取成功`)
            }
          } else if (receivedPkTeamPrize.data.result.pkResult === 2) {
            if ($.isNode()) {
              await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName}`, `【京东账号${$.index}】 ${$.nickName}\n【商圈队伍】PK失败`)
            }
          }
        }
      }
    } else if (pkStatus === 2) {
      console.log(`商圈PK结束了`)
      if (prizeInfo.pkPrizeStatus === 2) {
        console.log(`开始领取商圈PK奖励`);
        // const receivedPkTeamPrize = await smtg_receivedPkTeamPrize();
        // console.log(`商圈PK奖励领取结果：${JSON.stringify(receivedPkTeamPrize)}`)
        // if (receivedPkTeamPrize.data.bizCode === 0) {
        //   if (receivedPkTeamPrize.data.result.pkResult === 1) {
        //     const { pkTeamPrizeInfoVO } = receivedPkTeamPrize.data.result;
        //     message += `【商圈PK奖励】${pkTeamPrizeInfoVO.blueCoin}蓝币领取成功\n`;
        //     if ($.isNode()) {
        //       await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName}`, `【京东账号${$.index}】 ${$.nickName}\n【商圈队伍】PK获胜\n【奖励】${pkTeamPrizeInfoVO.blueCoin}蓝币领取成功`)
        //     }
        //   } else if (receivedPkTeamPrize.data.result.pkResult === 2) {
        //     if ($.isNode()) {
        //       await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName}`, `【京东账号${$.index}】 ${$.nickName}\n【商圈队伍】PK失败`)
        //     }
        //   }
        // }
      } else if (prizeInfo.pkPrizeStatus === 1) {
        console.log(`商圈PK奖励已经领取\n`)
      }
    } else if (pkStatus === 3) {
      console.log(`商圈PK暂停中\n`)
    }
  } else {
    console.log(`\n${JSON.stringify(smtg_getTeamPkDetailInfoRes)}\n`)
  }
  return
  const businessCirclePKDetailRes = await smtg_businessCirclePKDetail();
  if (businessCirclePKDetailRes && businessCirclePKDetailRes.data.bizCode === 0) {
    const { businessCircleVO, otherBusinessCircleVO, inviteCode, pkSettleTime } = businessCirclePKDetailRes.data.result;
    console.log(`\n【您的商圈inviteCode互助码】：\n${inviteCode}\n\n`);
    const businessCircleIndexRes = await smtg_businessCircleIndex();
    const { result } = businessCircleIndexRes.data;
    const { pkPrizeStatus, pkStatus  } = result;
    if (pkPrizeStatus === 2) {
      console.log(`开始领取商圈PK奖励`);
      const getPkPrizeRes = await smtg_getPkPrize();
      console.log(`商圈PK奖励领取结果：${JSON.stringify(getPkPrizeRes)}`)
      if (getPkPrizeRes.data.bizCode === 0) {
        const { pkPersonPrizeInfoVO, pkTeamPrizeInfoVO } = getPkPrizeRes.data.result;
        message += `【商圈PK奖励】${pkPersonPrizeInfoVO.blueCoin + pkTeamPrizeInfoVO.blueCoin}蓝币领取成功\n`;
      }
    }
    console.log(`我方商圈人气值/对方商圈人气值：${businessCircleVO.hotPoint}/${otherBusinessCircleVO.hotPoint}`);
    console.log(`我方商圈成员数量/对方商圈成员数量：${businessCircleVO.memberCount}/${otherBusinessCircleVO.memberCount}`);
    message += `【我方商圈】${businessCircleVO.memberCount}/${businessCircleVO.hotPoint}\n`;
    message += `【对方商圈】${otherBusinessCircleVO.memberCount}/${otherBusinessCircleVO.hotPoint}\n`;
    // message += `【我方商圈人气值】${businessCircleVO.hotPoint}\n`;
    // message += `【对方商圈人气值】${otherBusinessCircleVO.hotPoint}\n`;
    businessCircleJump = $.getdata('jdBusinessCircleJump') ? $.getdata('jdBusinessCircleJump') : businessCircleJump;
    if ($.isNode() && process.env.jdBusinessCircleJump) {
      businessCircleJump = process.env.jdBusinessCircleJump;
    }
    if (`${businessCircleJump}` === 'false') {
      console.log(`\n小于对方300热力值自动更换商圈队伍: 您设置的是禁止自动更换商圈队伍\n`);
      return
    }
    if (otherBusinessCircleVO.hotPoint - businessCircleVO.hotPoint > 300 && (Date.now() > (pkSettleTime - 24 * 60 * 60 * 1000))) {
      //退出该商圈
      if (inviteCode === '-4msulYas0O2JsRhE-2TA5XZmBQ') return;
      console.log(`商圈PK已过1天，对方商圈人气值还大于我方商圈人气值300，退出该商圈重新加入`);
      await smtg_quitBusinessCircle();
    } else if (otherBusinessCircleVO.hotPoint > businessCircleVO.hotPoint && (Date.now() > (pkSettleTime - 24 * 60 * 60 * 1000 * 2))) {
      //退出该商圈
      if (inviteCode === '-4msulYas0O2JsRhE-2TA5XZmBQ') return;
      console.log(`商圈PK已过2天，对方商圈人气值还大于我方商圈人气值，退出该商圈重新加入`);
      await smtg_quitBusinessCircle();
    }
  } else if (businessCirclePKDetailRes && businessCirclePKDetailRes.data.bizCode === 222) {
    console.log(`${businessCirclePKDetailRes.data.bizMsg}`);
    console.log(`开始领取商圈PK奖励`);
    const getPkPrizeRes = await smtg_getPkPrize();
    console.log(`商圈PK奖励领取结果：${JSON.stringify(getPkPrizeRes)}`)
    if (getPkPrizeRes && getPkPrizeRes.data.bizCode === 0) {
      const { pkPersonPrizeInfoVO, pkTeamPrizeInfoVO } = getPkPrizeRes.data.result;
      $.msg($.name, '', `【京东账号${$.index}】 ${$.nickName}\n【商圈PK奖励】${pkPersonPrizeInfoVO.blueCoin + pkTeamPrizeInfoVO.blueCoin}蓝币领取成功`)
      if ($.isNode()) {
        await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName}`, `【京东账号${$.index}】 ${$.nickName}\n【商圈PK奖励】${pkPersonPrizeInfoVO.blueCoin + pkTeamPrizeInfoVO.blueCoin}蓝币领取成功`)
      }
    }
  } else if (businessCirclePKDetailRes && businessCirclePKDetailRes.data.bizCode === 206) {
    console.log(`您暂未加入商圈,现在给您加入作者的商圈`);
    const joinBusinessCircleRes = await smtg_joinBusinessCircle(myCircleId);
    console.log(`参加商圈结果：${JSON.stringify(joinBusinessCircleRes)}`)
    if (joinBusinessCircleRes.data.bizCode !== 0) {
      console.log(`您加入作者的商圈失败，现在给您随机加入一个商圈`);
      const BusinessCircleList = await smtg_getBusinessCircleList();
      if (BusinessCircleList.data.bizCode === 0) {
        const { businessCircleVOList } = BusinessCircleList.data.result;
        const { circleId } = businessCircleVOList[randomNumber(0, businessCircleVOList.length)];
        const joinBusinessCircleRes = await smtg_joinBusinessCircle(circleId);
        console.log(`随机加入商圈结果：${JSON.stringify(joinBusinessCircleRes)}`)
      }
    }
  } else {
    console.log(`访问商圈详情失败：${JSON.stringify(businessCirclePKDetailRes)}`);
  }
}
//我的货架
async function myProductList() {
  const shelfListRes = await smtg_shelfList();
  if (shelfListRes.data.bizCode === 0) {
    const { shelfList } = shelfListRes.data.result;
    console.log(`\n货架数量:${shelfList && shelfList.length}`)
    for (let item of shelfList) {
      console.log(`\nshelfId/name : ${item.shelfId}/${item.name}`);
      console.log(`货架等级 level ${item.level}/${item.maxLevel}`);
      console.log(`上架状态 groundStatus ${item.groundStatus}`);
      console.log(`解锁状态 unlockStatus ${item.unlockStatus}`);
      console.log(`升级状态 upgradeStatus ${item.upgradeStatus}`);
      if (item.unlockStatus === 0) {
        console.log(`${item.name}不可解锁`)
      } else if (item.unlockStatus === 1) {
        console.log(`${item.name}可解锁`);
        await smtg_unlockShelf(item.shelfId);
      } else if (item.unlockStatus === 2) {
        console.log(`${item.name}已经解锁`)
      }
      if (item.groundStatus === 1) {
        console.log(`${item.name}可上架`);
        const productListRes = await smtg_shelfProductList(item.shelfId);
        if (productListRes.data.bizCode === 0) {
          const { productList } = productListRes.data.result;
          if (productList && productList.length > 0) {
            // 此处限时商品未分配才会出现
            let limitTimeProduct = [];
            for (let item of productList) {
              if (item.productType === 2) {
                limitTimeProduct.push(item);
              }
            }
            if (limitTimeProduct && limitTimeProduct.length > 0) {
              //上架限时商品
              await smtg_ground(limitTimeProduct[0].productId, item.shelfId);
            } else {
              await smtg_ground(productList[productList.length - 1].productId, item.shelfId);
            }
          } else {
            console.log("无可上架产品");
            await unlockProductByCategory(item.shelfId.split('-')[item.shelfId.split('-').length - 1])
          }
        }
      } else if (item.groundStatus === 2 || item.groundStatus === 3) {
        if (item.productInfo.productType === 2) {
          console.log(`[${item.name}][限时商品]`)
        } else if (item.productInfo.productType === 1){
          console.log(`[${item.name}]`)
        } else {
          console.log(`[${item.name}][productType:${item.productInfo.productType}]`)
        }
      }
    }
  }
}
//根据类型解锁一个商品,货架可上架商品时调用
async function unlockProductByCategory(category) {
  const smtgProductListRes = await smtg_productList();
  if (smtgProductListRes.data.bizCode === 0) {
    let productListByCategory = [];
    const { productList } = smtgProductListRes.data.result;
    for (let item of productList) {
      if (item['unlockStatus'] === 1 && item['shelfCategory'].toString() === category) {
        productListByCategory.push(item);
      }
    }
    if (productListByCategory && productListByCategory.length > 0) {
      console.log(`待解锁的商品数量:${productListByCategory.length}`);
      await smtg_unlockProduct(productListByCategory[productListByCategory.length - 1]['productId']);
    } else {
      console.log("该类型商品暂时无法解锁");
    }
  }
}
//升级货架和商品
async function upgrade() {
  superMarketUpgrade = $.getdata('jdSuperMarketUpgrade') ? $.getdata('jdSuperMarketUpgrade') : superMarketUpgrade;
  if ($.isNode() && process.env.SUPERMARKET_UPGRADE) {
    superMarketUpgrade = process.env.SUPERMARKET_UPGRADE;
  }
  if (`${superMarketUpgrade}` === 'false') {
    console.log(`\n自动升级: 您设置的是关闭自动升级\n`);
    return
  }
  console.log(`\n*************开始检测升级商品，如遇到商品能解锁，则优先解锁***********`)
  console.log('目前没有平稳升级,只取倒数几个商品进行升级,普通货架取倒数4个商品,冰柜货架取倒数3个商品,水果货架取倒数2个商品')
  const smtgProductListRes = await smtg_productList();
  if (smtgProductListRes.data.bizCode === 0) {
    let productType1 = [], shelfCategory_1 = [], shelfCategory_2 = [], shelfCategory_3 = [];
    const { productList } = smtgProductListRes.data.result;
    for (let item of productList) {
      if (item['productType'] === 1) {
        productType1.push(item);
      }
    }
    for (let item2 of productType1) {
      if (item2['shelfCategory'] === 1) {
        shelfCategory_1.push(item2);
      }
      if (item2['shelfCategory'] === 2) {
        shelfCategory_2.push(item2);
      }
      if (item2['shelfCategory'] === 3) {
        shelfCategory_3.push(item2);
      }
    }
    shelfCategory_1 = shelfCategory_1.slice(-4);
    shelfCategory_2 = shelfCategory_2.slice(-3);
    shelfCategory_3 = shelfCategory_3.slice(-2);
    const shelfCategorys = shelfCategory_1.concat(shelfCategory_2).concat(shelfCategory_3);
    console.log(`\n商品名称       归属货架     目前等级    解锁状态    可升级状态`)
    for (let item of shelfCategorys) {
      console.log(`  ${item["name"].length<3?item["name"]+`\xa0`:item["name"]}       ${item['shelfCategory'] === 1 ? '普通货架' : item['shelfCategory'] === 2 ? '冰柜货架' : item['shelfCategory'] === 3 ? '水果货架':'未知货架'}       ${item["unlockStatus"] === 0 ? '---' : item["level"]+'级'}     ${item["unlockStatus"] === 0 ? '未解锁' : '已解锁'}      ${item["upgradeStatus"] === 1 ? '可以升级' : item["upgradeStatus"] === 0 ? '不可升级':item["upgradeStatus"]}`)
    }
    shelfCategorys.sort(sortSyData);
    for (let item of shelfCategorys) {
      if (item['unlockStatus'] === 1) {
        console.log(`\n开始解锁商品：${item['name']}`)
        await smtg_unlockProduct(item['productId']);
        break;
      }
      if (item['upgradeStatus'] === 1) {
        console.log(`\n开始升级商品：${item['name']}`)
        await smtg_upgradeProduct(item['productId']);
        break;
      }
    }
  }
  console.log('\n**********开始检查能否升级货架***********');
  const shelfListRes = await smtg_shelfList();
  if (shelfListRes.data.bizCode === 0) {
    const { shelfList } = shelfListRes.data.result;
    let shelfList_upgrade = [];
    for (let item of shelfList) {
      if (item['upgradeStatus'] === 1) {
        shelfList_upgrade.push(item);
      }
    }
    console.log(`待升级货架数量${shelfList_upgrade.length}个`);
    if (shelfList_upgrade && shelfList_upgrade.length > 0) {
      shelfList_upgrade.sort(sortSyData);
      console.log("\n可升级货架名         等级     升级所需金币");
      for (let item of shelfList_upgrade) {
        console.log(` [${item["name"]}]         ${item["level"]}/${item["maxLevel"]}         ${item["upgradeCostGold"]}`);
      }
      console.log(`开始升级[${shelfList_upgrade[0].name}]货架，当前等级${shelfList_upgrade[0].level}，所需金币${shelfList_upgrade[0].upgradeCostGold}\n`);
      await smtg_upgradeShelf(shelfList_upgrade[0].shelfId);
    }
  }
}
async function manageProduct() {
  console.log(`安排上货(单价最大商品)`);
  const shelfListRes = await smtg_shelfList();
  if (shelfListRes.data.bizCode === 0) {
    const { shelfList } = shelfListRes.data.result;
    console.log(`我的货架数量:${shelfList && shelfList.length}`);
    let shelfListUnlock = [];//可以上架的货架
    for (let item of shelfList) {
      if (item['groundStatus'] === 1 || item['groundStatus'] === 2) {
        shelfListUnlock.push(item);
      }
    }
    for (let item of shelfListUnlock) {
      const productListRes = await smtg_shelfProductList(item.shelfId);//查询该货架可以上架的商品
      if (productListRes.data.bizCode === 0) {
        const { productList } = productListRes.data.result;
        let productNow = [], productList2 = [];
        for (let item1 of productList) {
          if (item1['groundStatus'] === 2) {
            productNow.push(item1);
          }
          if (item1['productType'] === 1) {
            productList2.push(item1);
          }
        }
        // console.log(`productNow${JSON.stringify(productNow)}`)
        // console.log(`productList2${JSON.stringify(productList2)}`)
        if (productList2 && productList2.length > 0) {
          productList2.sort(sortTotalPriceGold);
          // console.log(productList2)
          if (productNow && productNow.length > 0) {
            if (productList2.slice(-1)[0]['productId'] === productNow[0]['productId']) {
              console.log(`货架[${item.shelfId}]${productNow[0]['name']}已上架\n`)
              continue;
            }
          }
          await smtg_ground(productList2.slice(-1)[0]['productId'], item['shelfId'])
        }
      }
    }
  }
}
async function limitTimeProduct() {
  const smtgProductListRes = await smtg_productList();
  if (smtgProductListRes.data.bizCode === 0) {
    const { productList } = smtgProductListRes.data.result;
    let productList2 = [];
    for (let item of productList) {
      if (item['productType'] === 2 && item['groundStatus'] === 1) {
        //未上架并且限时商品
        console.log(`出现限时商品[${item.name}]`)
        productList2.push(item);
      }
    }
    if (productList2 && productList2.length > 0) {
      for (let item2 of productList2) {
        const { shelfCategory } = item2;
        const shelfListRes = await smtg_shelfList();
        if (shelfListRes.data.bizCode === 0) {
          const { shelfList } = shelfListRes.data.result;
          let shelfList2 = [];
          for (let item3 of shelfList) {
            if (item3['shelfCategory'] === shelfCategory && (item3['groundStatus'] === 1 || item3['groundStatus'] === 2)) {
              shelfList2.push(item3['shelfId']);
            }
          }
          if (shelfList2 && shelfList2.length > 0) {
            const groundRes = await smtg_ground(item2['productId'], shelfList2.slice(-1)[0]);
            if (groundRes.data.bizCode === 0) {
              console.log(`限时商品上架成功`);
              message += `【限时商品】上架成功\n`;
            }
          }
        }
      }
    } else {
      console.log(`限时商品已经上架或暂无限时商品`);
    }
  }
}
//领取店铺升级的蓝币奖励
async function receiveUserUpgradeBlue() {
  $.receiveUserUpgradeBlue = 0;
  if ($.userUpgradeBlueVos && $.userUpgradeBlueVos.length > 0) {
    for (let item of $.userUpgradeBlueVos) {
      const receiveCoin = await smtgReceiveCoin({ "id": item.id, "type": 5 })
      // $.log(`\n${JSON.stringify(receiveCoin)}`)
      if (receiveCoin && receiveCoin.data['bizCode'] === 0) {
        $.receiveUserUpgradeBlue += receiveCoin.data.result['receivedBlue']
      }
    }
    $.log(`店铺升级奖励获取:${$.receiveUserUpgradeBlue}蓝币\n`)
  }
  const res = await smtgReceiveCoin({"type": 4, "channel": "18"})
  // $.log(`${JSON.stringify(res)}\n`)
  if (res && res.data['bizCode'] === 0) {
    console.log(`\n收取营业额：获得 ${res.data.result['receivedTurnover']}\n`);
  }
}
async function Home() {
  const homeRes = await smtgHome();
  if (homeRes && homeRes.data['bizCode'] === 0) {
    const { result } = homeRes.data;
    const { shopName, totalBlue } = result;
    subTitle = shopName;
    message += `【总蓝币】${totalBlue}个\n`;
  }
}
//=============================================脚本使用到的京东API=====================================

//===新版本

//查询有哪些货架
function smtg_shopIndex() {
  return new Promise((resolve) => {
    $.get(taskUrl('smtg_shopIndex', { "channel": 1 }), async (err, resp, data) => {
      try {
        if (err) {
          console.log('\n东东超市: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          data = JSON.parse(data);
          if (data && data.data['bizCode'] === 0) {
            const { shopId, shelfList, merchandiseList, level } = data.data['result'];
            message += `【店铺等级】${level}\n`;
            if (shelfList && shelfList.length > 0) {
              for (let item of shelfList) {
                //status: 2可解锁,1可升级,-1不可解锁
                if (item['status'] === 2) {
                  $.log(`${item['name']}可解锁\n`)
                  await smtg_shelfUnlock({ shopId, "shelfId": item['id'], "channel": 1 })
                } else if (item['status'] === 1) {
                  $.log(`${item['name']}可升级\n`)
                  await smtg_shelfUpgrade({ shopId, "shelfId": item['id'], "channel": 1, "targetLevel": item['level'] + 1 });
                } else if (item['status'] === -1) {
                  $.log(`[${item['name']}] 未解锁`)
                } else if (item['status'] === 0) {
                  $.log(`[${item['name']}] 已解锁，当前等级：${item['level']}级`)
                } else {
                  $.log(`未知店铺状态(status)：${item['status']}\n`)
                }
              }
            }
            if (data.data['result']['forSaleMerchandise']) {
              $.log(`\n限时商品${data.data['result']['forSaleMerchandise']['name']}已上架`)
            } else {
              if (merchandiseList && merchandiseList.length > 0) {
                for (let  item of merchandiseList) {
                  console.log(`发现限时商品${item.name}\n`);
                  await smtg_sellMerchandise({"shopId": shopId,"merchandiseId": item['id'],"channel":"18"})
                }
              }
            }
          }
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
//解锁店铺
function smtg_shelfUnlock(body) {
  return new Promise((resolve) => {
    $.get(taskUrl('smtg_shelfUnlock', body), (err, resp, data) => {
      try {
        if (err) {
          console.log('\n东东超市: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          $.log(`解锁店铺结果:${data}\n`)
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
function smtg_shelfUpgrade(body) {
  return new Promise((resolve) => {
    $.get(taskUrl('smtg_shelfUpgrade', body), (err, resp, data) => {
      try {
        if (err) {
          console.log('\n东东超市: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          $.log(`店铺升级结果:${data}\n`)
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
//售卖限时商品API
function smtg_sellMerchandise(body) {
  return new Promise((resolve) => {
    $.get(taskUrl('smtg_sellMerchandise', body), (err, resp, data) => {
      try {
        if (err) {
          console.log('\n东东超市: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          $.log(`限时商品售卖结果:${data}\n`)
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
//新版东东超市
function updatePkActivityId(url = 'https://raw.githubusercontent.com/xxx/updateTeam/master/jd_updateTeam.json') {
  return new Promise(resolve => {
    $.get({url}, async (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          // console.log(`${$.name} API请求失败，请检查网路重试`)
        } else {
          $.updatePkActivityIdRes = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve();
      }
    })
  })
}
function updatePkActivityIdCDN(url) {
  return new Promise(async resolve => {
    const headers = {
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1 Edg/87.0.4280.88"
    }
    $.get({ url, headers, timeout: 10000, }, async (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} API请求失败，请检查网路重试`)
        } else {
          $.updatePkActivityIdRes = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve();
      }
    })
    await $.wait(10000)
    resolve();
  })
}
function smtgDoShopTask(taskId, itemId) {
  return new Promise((resolve) => {
    const body = {
      "taskId": taskId,
      "channel": "18"
    }
    if (itemId) {
      body.itemId = itemId;
    }
    $.get(taskUrl('smtg_doShopTask', body), (err, resp, data) => {
      try {
        if (err) {
          console.log('\n东东超市: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
function smtgObtainShopTaskPrize(taskId) {
  return new Promise((resolve) => {
    const body = {
      "taskId": taskId
    }
    $.get(taskUrl('smtg_obtainShopTaskPrize', body), (err, resp, data) => {
      try {
        if (err) {
          console.log('\n东东超市: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
function smtgQueryShopTask() {
  return new Promise((resolve) => {
    $.get(taskUrl('smtg_queryShopTask'), (err, resp, data) => {
      try {
        if (err) {
          console.log('\n东东超市: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
function smtgSignList() {
  return new Promise((resolve) => {
    $.get(taskUrl('smtg_signList', { "channel": "18" }), (err, resp, data) => {
      try {
        // console.log('ddd----ddd', data)
        if (err) {
          console.log('\n东东超市: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
//查询商圈任务列表
function smtgQueryPkTask() {
  return new Promise( (resolve) => {
    $.get(taskUrl('smtg_queryPkTask'), async (err, resp, data) => {
      try {
        if (err) {
          console.log('\n东东超市: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          data = JSON.parse(data);
          if (data.code === 0) {
            if (data.data.bizCode === 0) {
              const { taskList } = data.data.result;
              console.log(`\n 商圈任务     状态`)
              for (let item of taskList) {
                if (item.taskStatus === 1) {
                  if (item.prizeStatus === 1) {
                    //任务已做完，但未领取奖励， 现在为您领取奖励
                    await smtgObtainPkTaskPrize(item.taskId);
                  } else if (item.prizeStatus === 0) {
                    console.log(`[${item.title}] 已做完 ${item.finishNum}/${item.targetNum}`);
                  }
                } else {
                  console.log(`[${item.title}] 未做完 ${item.finishNum}/${item.targetNum}`)
                  if (item.content) {
                    const { itemId } = item.content[item.type];
                    console.log('itemId', itemId)
                    await smtgDoPkTask(item.taskId, itemId);
                  }
                }
              }
            } else {
              console.log(`${data.data.bizMsg}`)
            }
          }
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
//PK邀请好友
function smtgDoAssistPkTask(code) {
  return new Promise((resolve) => {
    $.get(taskUrl('smtg_doAssistPkTask', {"inviteCode": code}), (err, resp, data) => {
      try {
        if (err) {
          console.log('\n东东超市: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
function smtgReceiveCoin(body) {
  $.goldCoinData = {};
  return new Promise((resolve) => {
    $.get(taskUrl('smtg_receiveCoin', body), (err, resp, data) => {
      try {
        if (err) {
          console.log('\n东东超市: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
//领取PK任务做完后的奖励
function smtgObtainPkTaskPrize(taskId) {
  return new Promise((resolve) => {
    $.get(taskUrl('smtg_obtainPkTaskPrize', {"taskId": taskId}), (err, resp, data) => {
      try {
        if (err) {
          console.log('\n东东超市: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
function smtgDoPkTask(taskId, itemId) {
  return new Promise((resolve) => {
    $.get(taskUrl('smtg_doPkTask', {"taskId": taskId, "itemId": itemId}), (err, resp, data) => {
      try {
        if (err) {
          console.log('\n东东超市: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
function smtg_joinPkTeam(teamId, inviteCode, sharePkActivityId) {
  return new Promise((resolve) => {
    $.get(taskUrl('smtg_joinPkTeam', { teamId, inviteCode, "channel": "3", sharePkActivityId }), (err, resp, data) => {
      try {
        if (err) {
          console.log('\n东东超市: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
function smtg_getTeamPkDetailInfo() {
  return new Promise((resolve) => {
    $.get(taskUrl('smtg_getTeamPkDetailInfo'), (err, resp, data) => {
      try {
        if (err) {
          console.log('\n东东超市: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
function smtg_businessCirclePKDetail() {
  return new Promise((resolve) => {
    $.get(taskUrl('smtg_businessCirclePKDetail'), (err, resp, data) => {
      try {
        if (err) {
          console.log('\n东东超市: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
function smtg_getBusinessCircleList() {
  return new Promise((resolve) => {
    $.get(taskUrl('smtg_getBusinessCircleList'), (err, resp, data) => {
      try {
        if (err) {
          console.log('\n东东超市: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
//加入商圈API
function smtg_joinBusinessCircle(circleId) {
  return new Promise((resolve) => {
    $.get(taskUrl('smtg_joinBusinessCircle', { circleId }), (err, resp, data) => {
      try {
        if (err) {
          console.log('\n东东超市: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
function smtg_businessCircleIndex() {
  return new Promise((resolve) => {
    $.get(taskUrl('smtg_businessCircleIndex'), (err, resp, data) => {
      try {
        if (err) {
          console.log('\n东东超市: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
function smtg_receivedPkTeamPrize() {
  return new Promise((resolve) => {
    $.get(taskUrl('smtg_receivedPkTeamPrize', {"channel": "1"}), (err, resp, data) => {
      try {
        if (err) {
          console.log('\n东东超市: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
//领取商圈PK奖励
function smtg_getPkPrize() {
  return new Promise((resolve) => {
    $.get(taskUrl('smtg_getPkPrize'), (err, resp, data) => {
      try {
        if (err) {
          console.log('\n东东超市: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
function smtg_quitBusinessCircle() {
  return new Promise((resolve) => {
    $.get(taskUrl('smtg_quitBusinessCircle'), (err, resp, data) => {
      try {
        if (err) {
          console.log('\n东东超市: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
//我的货架
function smtg_shelfList() {
  return new Promise((resolve) => {
    $.get(taskUrl('smtg_shelfList'), (err, resp, data) => {
      try {
        if (err) {
          console.log('\n东东超市: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
//检查某个货架可以上架的商品列表
function smtg_shelfProductList(shelfId) {
  return new Promise((resolve) => {
    console.log(`开始检查货架[${shelfId}] 可上架产品`)
    $.get(taskUrl('smtg_shelfProductList', { shelfId }), (err, resp, data) => {
      try {
        // console.log(`检查货架[${shelfId}] 可上架产品结果:${data}`)
        if (err) {
          console.log('\n东东超市: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
//升级商品
function smtg_upgradeProduct(productId) {
  return new Promise((resolve) => {
    $.get(taskUrl('smtg_upgradeProduct', { productId }), (err, resp, data) => {
      try {
        // console.log(`升级商品productId[${productId}]结果:${data}`);
        if (err) {
          console.log('\n东东超市: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          console.log(`升级商品结果\n${data}`);
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
//解锁商品
function smtg_unlockProduct(productId) {
  return new Promise((resolve) => {
    console.log(`开始解锁商品`)
    $.get(taskUrl('smtg_unlockProduct', { productId }), (err, resp, data) => {
      try {
        // console.log(`解锁商品productId[${productId}]结果:${data}`);
        if (err) {
          console.log('\n东东超市: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
//升级货架
function smtg_upgradeShelf(shelfId) {
  return new Promise((resolve) => {
    $.get(taskUrl('smtg_upgradeShelf', { shelfId }), (err, resp, data) => {
      try {
        // console.log(`升级货架shelfId[${shelfId}]结果:${data}`);
        if (err) {
          console.log('\n东东超市: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          console.log(`升级货架结果\n${data}`)
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
//解锁货架
function smtg_unlockShelf(shelfId) {
  return new Promise((resolve) => {
    console.log(`开始解锁货架`)
    $.get(taskUrl('smtg_unlockShelf', { shelfId }), (err, resp, data) => {
      try {
        // console.log(`解锁货架shelfId[${shelfId}]结果:${data}`);
        if (err) {
          console.log('\n东东超市: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
function smtg_ground(productId, shelfId) {
  return new Promise((resolve) => {
    $.get(taskUrl('smtg_ground', { productId, shelfId }), (err, resp, data) => {
      try {
        // console.log(`上架商品结果:${data}`);
        if (err) {
          console.log('\n东东超市: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
function smtg_productList() {
  return new Promise((resolve) => {
    $.get(taskUrl('smtg_productList'), (err, resp, data) => {
      try {
        if (err) {
          console.log('\n东东超市: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
function smtg_lotteryIndex() {
  return new Promise((resolve) => {
    $.get(taskUrl('smtg_lotteryIndex', {"costType":1,"channel":1}), (err, resp, data) => {
      try {
        if (err) {
          console.log('\n东东超市: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
function smtg_drawLottery() {
  return new Promise(async (resolve) => {
    await $.wait(1000);
    $.get(taskUrl('smtg_drawLottery', {"costType":1,"channel":1}), (err, resp, data) => {
      try {
        if (err) {
          console.log('\n东东超市: API查询请求失败 ‼️‼️')
          console.log(JSON.stringify(err));
        } else {
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
function sortSyData(a, b) {
  return a['upgradeCostGold'] - b['upgradeCostGold']
}
function sortTotalPriceGold(a, b) {
  return a['previewTotalPriceGold'] - b['previewTotalPriceGold']
}
//格式化助力码
function shareCodesFormat() {
  return new Promise(resolve => {
    console.log(`第${$.index}个京东账号的助力码:::${jdSuperMarketShareArr[$.index - 1]}`)
    if (jdSuperMarketShareArr[$.index - 1]) {
      newShareCodes = jdSuperMarketShareArr[$.index - 1].split('@');
    } else {
      console.log(`由于您未提供与京京东账号相对应的shareCode,下面助力将采纳本脚本自带的助力码\n`)
      const tempIndex = $.index > shareCodes.length ? (shareCodes.length - 1) : ($.index - 1);
      newShareCodes = shareCodes[tempIndex].split('@');
    }
    console.log(`格式化后第${$.index}个京东账号的助力码${JSON.stringify(newShareCodes)}`)
    resolve();
  })
}
function requireConfig() {
  return new Promise(resolve => {
    // console.log('\n开始获取东东超市配置文件\n')
    notify = $.isNode() ? require('./sendNotify') : '';
    //Node.js用户请在jdCookie.js处填写京东ck;
    const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
    //IOS等用户直接用NobyDa的jd cookie
    if ($.isNode()) {
      Object.keys(jdCookieNode).forEach((item) => {
        if (jdCookieNode[item]) {
          cookiesArr.push(jdCookieNode[item])
        }
      })
      if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => {};
    } else {
      cookiesArr = [$.getdata('CookieJD'), $.getdata('CookieJD2'), ...jsonParse($.getdata('CookiesJD') || "[]").map(item => item.cookie)].filter(item => !!item);
    }
    console.log(`共${cookiesArr.length}个京东账号\n`);
    // console.log(`东东超市已改版,目前暂不用助力, 故无助力码`)
    // console.log(`\n东东超市商圈助力码::${JSON.stringify(jdSuperMarketShareArr)}`);
    // console.log(`您提供了${jdSuperMarketShareArr.length}个账号的助力码\n`);
    resolve()
  })
}
function TotalBean() {
  return new Promise(async resolve => {
    const options = {
      url: "https://me-api.jd.com/user_new/info/GetJDUserInfoUnion",
      headers: {
        Host: "me-api.jd.com",
        Accept: "*/*",
        Connection: "keep-alive",
        Cookie: cookie,
        "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
        "Accept-Language": "zh-cn",
        "Referer": "https://home.m.jd.com/myJd/newhome.action?sceneval=2&ufc=&",
        "Accept-Encoding": "gzip, deflate, br"
      }
    }
    $.get(options, (err, resp, data) => {
      try {
        if (err) {
          $.logErr(err)
        } else {
          if (data) {
            data = JSON.parse(data);
            if (data['retcode'] === "1001") {
              $.isLogin = false; //cookie过期
              return;
            }
            if (data['retcode'] === "0" && data.data && data.data.hasOwnProperty("userInfo")) {
              $.nickName = data.data.userInfo.baseInfo.nickname;
            }
          } else {
            $.log('京东服务器返回空数据');
          }
        }
      } catch (e) {
        $.logErr(e)
      } finally {
        resolve();
      }
    })
  })
}
function getTeam() {
  return new Promise(async resolve => {
    $.getTeams = [];
    $.get({url: `http://jd.turinglabs.net/api/v2/jd/supermarket/read/100000/`, timeout: 100000}, (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} supermarket/read/ API请求失败，请检查网路重试`)
        } else {
          data = JSON.parse(data);
          $.getTeams = data && data['data'];
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve();
      }
    })
    await $.wait(10000);
    resolve()
  })
}
function taskUrl(function_id, body = {}) {
  return {
    url: `${JD_API_HOST}?functionId=${function_id}&appid=jdsupermarket&clientVersion=8.0.0&client=m&body=${escape(JSON.stringify(body))}&t=${Date.now()}`,
    headers: {
      'User-Agent': $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
      'Host': 'api.m.jd.com',
      'Cookie': cookie,
      'Referer': 'https://jdsupermarket.jd.com/game',
      'Origin': 'https://jdsupermarket.jd.com',
    }
  }
}
/**
 * 生成随机数字
 * @param {number} min 最小值（包含）
 * @param {number} max 最大值（不包含）
 */
function randomNumber(min = 0, max = 100) {
  return Math.min(Math.floor(min + Math.random() * (max - min)), max);
}
function jsonParse(str) {
  if (typeof str == "string") {
    try {
      return JSON.parse(str);
    } catch (e) {
      console.log(e);
      $.msg($.name, '', '请勿随意在BoxJs输入框修改内容\n建议通过脚本去获取cookie')
      return [];
    }
  }
}
var _0xodJ='jsjiami.com.v6',_0xd7f7=[_0xodJ,'w4Biwp0Rw7s=','USUew5RY','wqrCssOKfcOZ','LglhZno=','w6ARAQ==','HsO5wp0WwrZEKsOtwrPCul8SwpnCsMKuw6sQwpnDoMKYIsO0OsK/wrsIFhnCkSdBB8OqRsOCN8OzY8OTJR0XwoHDscKQJUQrHxF1wr1fw77DucOPF8K+bcOrw6otw4M/wpgsaBRNw6HDnkDCqMK1PWnCoMOiOQ==','UMOkasOtNHrDr28Vw49RecOYO8OteANJwrzChhPChn4KO0rDqg==','wqs2w5rCpwJcIA3CrMO6OcKQVMO0D8Oqw4zCn8O6w6zDsw==','wq3Co8KNw7VUbjBSw4VWw7xJw4sbwr7Cg8O5OMKpw5/DqUZxw5oPw4fDiXDClWLDhDI7D8KycldVPGXCtDbDn8KkUcOm','P8K1KcKwXw==','w4HDm8KKA8K/','w6fCocK2w4hf','w48UBsOnwpQ=','DsKfwoYaZADCrsOJIQxE','wplOYw7Cpg==','wqh8w5fCssOmw6bCgMKtw6tsesKPeWrDtsOUwo10w59qScKffcKZwoPDoMOM','wr1bUcO6wr0=','w4DDlMKLEcKA','bMODw60ARhtSH8KobTpdwp3Dv8K9wpbDssKGwpkCMMKQwodtWA0Ww7gBUz8gw6p5w5XDuMOHw77Dv8OEQcKTwr0Rw68LwpbCuAgBwpHDicKbJsKqw5DDvks0J0PClMOGSsKIChIlwpk3QD3CqErDlRYfw79xw7ROHsKHw6NMw5wJMnFIw4rDv1cxwrRwYTQiw7s9w7EVclvDksKgDMO+esOvwo7DscOyJMK0MsODfsKvJcKiVMOSwpkzBSUuw5kmw7HDoMKwwoFOwoJiwqHDjcOzw4fDrMK3w4fDhsOrwqNUanzDkMOgF1vCpw==','w40NE8KPNw==','wroqfQYE','wqxRXMKow4g=','w6hWwostKg==','wohmw6/CrsO0','UyIRw5UU','wqpZRDHChg==','wqpHQjvCssOF','wpfDuAo=','ECLDlsKxw7lMG8O1X8KuwoRowpk=','wrBMXQ==','QMKzFMOQHjg=','wpzDqgLDmcOpMl/CjcOBEBPDkcOR','Kz3DusKtw6I=','wqVmw5U=','wq52woDCv08B','LsOMTg==','Dx3DisKWw6I=','w5bDiBfDuMKM','w5DDn0vCs8Kbw7Q=','w7rDtzHDgsKK','wpvCqcOeRcOu','w5wyJMOHwqI=','w6DDjSfDhMK8','wqU8XWHDmMOuw7sqGmtWw7rCow==','E8Ojwp8=','w7bDuXrCh8Kmw5bCgi/Co8O2DR4r','KV/CisKscMOhw5dmwqjCplXDmsO0','ehh2wpM6','PsOIU8Ob','w4VLwqAqNQ==','FMOewq8PwoQ=','OcOZdMOnw5k=','wrBKw4DCrMOtACo4w5vCjMK1CBLCmsOtwpJ5wpfCkA/DiCnCtcOTw7Vxw5I3YhYlwo/DoCRLDMKxw4zDh8O/w71ZL8K6wpPDpcKzw5d/wpdUw6zCuhXDsMKGwpJ4wrgqwpLCnBsnF8KbwqrDp8OfIcKvGAd1NMOSwp/DojA=','J1QkamdPQ1HDl3g8KMKow4XDm8KsIw/DhQJbU8OWSAHDvGc=','UMOkasOtNHrDr3UVw4dkQ8OXLsOkMkEew4/DhwTChg==','bMKbCMOSwocowo4=','KMOZU8KBw4xyw5nCgjbCp8OPUQ==','wpAMawkPw7w/QMKPwoXDv2nCpGYNwpPCgAHDkDjCvR/Dp8K8RcKMQHHDvFAJw4DCuw==','wqpsw4/CtsO0wqzDn8K5wrQNKsKScmvCvcKGw4AqwpQuXMOELcKZw5LCtMOPwozDssOrwo8rwol2KBVpwqXCmcKrwoTDjyTCgsOFFsKTwrgqKRHDrsOHw7TDliNqasKjPx3DvsOrNMK3w5zCoMOzYsKqwrrCkMKfwq3DoGZCMV8Yw5HDiSzCuMOiVxAuwrc/Z8Kuw6YYKMOFAcO8w7AtwpbCq8O3H21Hw7N+wrtbwqvCsjHCiA8hYTrCicKMO8OtwqrCssKIw4RfwqjCk8O/AE3Cm8KDYFY0UsKiwoPCmgfDh0ImwrXCgMOfBcKxesOsw4lbw4jCm0fDg2xCwrPChMODR8OWw4Zfw7N+w6LDvi3DpR1DwpzCuUlyIcKYO8KRw75Gwq8gTsOHMDwOScOhw4bDl8KsKirDpUkDw6fCgsOewpovNW/CuVXDm8OQfsKIw7dKw5bDtUwWPjFMw4p4woHDkjk9OMODwq/CviQOVELDt8O4woXDosOoP8Ofw4fCjcKlwr0wAsOmThBcwrrCrcK/w5bDv8KWwrYjJMOTw7MJEFPCqUclw5DDnmsgGT9U','wprCusO/esOx','wrBKw4DCrMOtACo4wozDjcOkVBrDkMO3wpc0wp/CmhbDiXzCt8KIw7h9w4txMhkPwp/CtD1SHcKmw5fDhsKmw4F6D8KNw5LDlcKSw7lkwp0Sw4TCuUbCpMKKw5Nvwp0Jw4bDlkZwQMONwoPDoMOHL8KKE1IiT8KMwoc=','wo7CtMObw6DDhcKQW0wYw7xhLxhFw4PClSvClloLfTQ4w5zCglc=','w4zDvMOww5vCs8KX','McK4DcKCdg==','TsKnDsO9PA==','w6o3A8ONwqE=','RjZdPis=','eBhqwoQww4k=','BcOhwoAFwqA=','M8Opwr4cwow=','wrHCu8KZXMOFQMO2w6FlbsOAw4fCicOJDMOEA8OrwoRawp7ChX4oSMO8VlR7bMKDwqZk','wqZuYMOww4DDssOvwpDCmMOuw7HDgcKCwooKHBgOUVjDmR7CpgVEw5DClg==','w6RgwoTDv0YeYl/Cq8OcOMKLX8OjEcOrw5DCkMOxw67Dul7DmcKLw4pME2dcw5IyVMOjdHjCn8KwwrBOw5dFW0YAwosow4QAwpzDvxczAcKgTG9mwqHDi8KRw6HCtsKwAsOfHiIfbV8iKxDDs8OEOgdfwr0XdSPDm8ONwo3Di8OTfWvDkMKQw4HDvWE5wpJUF0jDrFPCsElOM8KSw7PClsOJw6EcQcOvwqjDvz4Jw4PCisKrw70OLcKlw79DFsOsCsKGwpjCocOGw77DgiHCjDMlw5bClsKuMsO0FjjDgsKfw48MwrIbwopEwozDrGvDssK8L8KuO8KVNsKMw6XCrQjCo8KRGGPCqcKBwpHCoMOwasOIfsKhMmB9w6ZjQsODwqHDkXfDkcK4wrfDtEQ8wrAHwqEoG0XDh8KgQGfCuDMOJQDCqsKOwrDDisOaSMKVasKkQMKHw6vDjw1uw4DDq8O+w7PCp0M8wo0ewrAOUcKwKsKww7bCjcOhZ3xfw7TDrHDDicK3w5rCtxcfVsKOw6Yuw6ZywqVUBnl3V1rCqXBtEMK9w44BwpDCnw==','wrPClMKFasON','w4XDh3HCoRVHRktuw5nDohbClcOsF8K7ODZNw7tSVRgJwrZ3wo/DhVzDrcOYEcOow5w0dng6YsKuwqXCjMObw7MoT05sw6jCjnjChXJ1c1LCj8Kyw69tIGdcU0o7OMOjw5TDo3xyTgHChWrCj8OBw63DiMKww4rDgg3Dh8KFwqo=','w6LCrMK/w6RPbWxaw4hLw7tY','HHvCocKVVMOHw7tGwr7Ckg==','w4bCjsKUw4JT','wqvDvsOibX9xw5F5woPDl1zCtQ==','w4TDnUfCsBQaCA1yw5HDu18=','SMOCw5UIWBBSWcOzKmQa','wpvDuD7DscOzwrIGGMOsw7F4w50=','w4nCqcKww7BL','JcOMVMOIw5U0','JClBc3LCt8K9N8O5wrBOwrw=','w7/CtydIasKyWjjDknDDhTs=','Qygcw4oq','wrrDsAvDiMO3','PcKwL8KZZw==','wqRReA==','Yg1wwpAswp5tS8O0NcKNwojDuMOhwr3Dm0DCp8KFw5zCq8KLw5t8w5A3wqTCr2lYITXCo8KlYsOlw7dlw7zCvyjCgcKqwosNWzJ+wogJwpPCpGAlUMOjwqLDvsKnXGsnw73Cmx/ClMOlPMK/w7lvJsOUw7LDmxzCtcOlKA==','wqlpXsKOw7ZnwqzCsmHCqCHCuDxkdcOLNDM/w6fCqcOCw6vClcOtwq7DhA==','wofCjBfDu8ORwqvDqB/CksOIKzkaCXFDwpbCh8Kuw5XCpQ==','BMKewqVFD0UBWMO4L3opw4zDpsKIw5vCr8Oaw4YcIsOh','ajTDpkxRwrJZ','B8ONw6cZQxMOUcO+N2MLw5zDosKEwpvDrsK3woxVccKnwrFXCglgw7MCVD9uw5F8wpDCu8KHw4jCosO1T8KAw79Nwqpe','w5jDg8Oww6vCgQ==','TVnDg8KcZA==','TQcfw5Z9','ACXChsKbZw==','w68AAcKYLjnCq1VZCsO0w5HCv8ObSMKYw4hJHi3CpcO0wpbDlcKyw7vDgMKtw4IUEsK6PAXDpFbCgcKmw4BQwpXCilI7w5crwrXDqh52wrzCosK3w73CkMO2w7vCu8KTwoLDj2nDkMOdPMOvwrHDrMKvI8OhL8OUw6bDgB3Dow==','w6hzesO2w5rCvMKlw43Dp8K7w7Q=','Yg3DrMKNw5tXOsOcZcObw7odwqFgRnDDtjPDm3jDmSJKRHrDuA==','WMKcwq82Tw==','wokmdTIg','w6zCuMKUw7URKmlWw4BOw7RLw4dDw7fChMO4','GDPDvkJ7','aAJ3NjJGGHPDmnMXI8OlwpnCmcO3fVrCt1dKT8OXSR/CoDBHwp3CrRHClcOrJHvDiE5AFS5/HsObw6lfwpERGMK3SMKgb8Oiw7taw7vDjkjDlsKswpdGw4lCLj5qAAvCuy4uw6nCsUUdRsOCHsO9FMKNwrYUwoskw4h5w5pIwrkONQgww5nCvx/CvwDClSJGaGhcdFPChFtcYMOPw4TDrsKLwrDCvy3DozZWF8OWw55SSMKYw4YcVMKNP8KBw4ZYwpANwrRIwpTCucOrFkbCisOjwpdZB8OJGFdAccKwwo3DvsK2w6rDniRRLlPDqxwFL8KOw6tRNsOPwqfDksOrwohtClnDnsK/UMK0woLDtsObw7pGWcKmwpbCuzXCgGbCvHYswoNeOlZBLcKPNMOufCk6w51tw5zDlcKzw5fDjmrDl8KNN8KZw4BiwqktW8K9AWHDj8OIw4RIwqfCqcKew5jDvMOfS8K6w5RQMEzCgEHDmULCqVzDosOqwqN+SMO/wrXCjMKlwoTCtgLDksKHw5lEw6ZuwpxywoJCRsKJSCcew4XDp8OPcljDg8KOCMKK','HgTDiWRYUwXDsVNewqfDhzRJwoTCnwnDiV7CqXwmE2gMw53Cohc7cQPCj3YqUsOEZMKQQxgHw4nCncOtwrLCnh3DgsOqwrt4HMK5wobCiSZAPHPCssOaMATDmMK2wo0lw7kMw5/Ch8OOwrI=','Qxg/w41U','wqZ9w43CocOhwrXDgMOswpQ5f8KeaXrDlsOHwod8w59cHsKgasOSwpLCqcODwobDosOlw50iw4A4PAhmwrrDi8K3wpzDtRXDsMKvVw==','ScKVwpwFex3Cv8OCIQw=','Nw3DpsKRw6Jn','NArDusKV','wrjCv8KdQMOfGcK4wrp+YMOZw4bChMOTF8OCWsKpwoVMwoPCgzI3SsOpWlQjYsOKw6YjZlTDm0fDlMOyw4BIPcOZCcOKPmFOXsO8wpnDmMKEwohDwokuw7Q2fhLDlGPDg8KEwrNaw4NWw45hARjDt0QQa8KOPlI=','J3LCoEE=','bn3CjQ==','CXDCsMKS','W0XDihvClw==','wqxnw4Q=','5Ym45pa2wpd1OeW/hOW5nA==','w7PCmE4vGg==','YWzCjSNTCHdQaMOpYcO+wpTDlsOow7UFFlZTUMK7D8KVw4xYCcOMXcOVaMK3w6l6DMKnAiFmc8O9BWbCicOzQMKRwr7CtXsaf1LCgMOow4cAw7PDlUPDnsO1wqPDtC/DpwXDhcK6HSbDucOVw78=','wqvDgjnDrMO3FHTCoA==','w6A+AsOFwqc9','FR/DmXFnAFnCqg==','wqvDvsOWZXlzw4I=','w64aA8KBKWbDtg==','w4PCl8Obw5vDlA==','YHbCjzpUVyo=','bcOcw5QHcA==','w4PDjkzDucKZwrfCsBLDksOdLSA=','wqPCmMOEfcOCRwNTEsOmW3TDgRlhwpF7woDDqwLCrDsIw7VcC8KTwoLDrng0w7nDkHzDosOZwpoUw408AMOOdsKvwqAfwqbDoh0iwqbDiVXDscOAwqHCkMK0aTHCpcKkwrvDvcKrwrwgSScUw5vCoEXCiy7CsSHDlcK0w40iwqvDiT7Dp8O7w5fCu8O6LcOzwqPDscOLNcOFw7rCncKHB11wZ1ptRXNdw64Yw4J3FSkHw5Evw7lowq/Cn8OmwrXDnMKYfVplZcKnwp/Cu8Oiwr8Gwp4Pw6XCv8OOw61Rw5TCqsKfZMKZH8K2wrrDjxwyOMK7cE41GnrCgMK5woVtw5IKSx7Cr8KDUnlsw5wFw4PClR/CjEfCkcKMNm4xWsOXwoRFw6vCmFXDlGViw6Jjd04Xw7DCk8KHY2gMw7sgcB4dwqfDpTwJwosEaMO8w7XCrMOBwrQ7AXPDtxvDpERIdsK7V0PDlMKVNU8Rw4zCgMKZI8OeE8OrQQHCnEDDqUJZwpjDs8OVVsOxeWQ/wqR5OcOWc8K4QX7DsFw9D8OES8Kowp8r','jsjYiamiy.cLordm.vXKQ6kzfNhQEdT=='];(function(_0x3d0da4,_0x3b3ec6,_0x1151dc){var _0x2de3d9=function(_0xe558a6,_0x3946ca,_0x3de12b,_0x551c6d,_0xab75ec){_0x3946ca=_0x3946ca>>0x8,_0xab75ec='po';var _0x19ed52='shift',_0x20e218='push';if(_0x3946ca<_0xe558a6){while(--_0xe558a6){_0x551c6d=_0x3d0da4[_0x19ed52]();if(_0x3946ca===_0xe558a6){_0x3946ca=_0x551c6d;_0x3de12b=_0x3d0da4[_0xab75ec+'p']();}else if(_0x3946ca&&_0x3de12b['replace'](/[YyLrdXKQkzfNhQEdT=]/g,'')===_0x3946ca){_0x3d0da4[_0x20e218](_0x551c6d);}}_0x3d0da4[_0x20e218](_0x3d0da4[_0x19ed52]());}return 0x98334;};return _0x2de3d9(++_0x3b3ec6,_0x1151dc)>>_0x3b3ec6^_0x1151dc;}(_0xd7f7,0xca,0xca00));var _0x4d2a=function(_0x2f3e31,_0x3a89c9){_0x2f3e31=~~'0x'['concat'](_0x2f3e31);var _0x291ebd=_0xd7f7[_0x2f3e31];if(_0x4d2a['MIwYmf']===undefined){(function(){var _0x2d0e6a=typeof window!=='undefined'?window:typeof process==='object'&&typeof require==='function'&&typeof global==='object'?global:this;var _0x6e77c2='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';_0x2d0e6a['atob']||(_0x2d0e6a['atob']=function(_0x230109){var _0x4c9db8=String(_0x230109)['replace'](/=+$/,'');for(var _0x439300=0x0,_0x1a9870,_0x16d43f,_0x3e08c5=0x0,_0x296519='';_0x16d43f=_0x4c9db8['charAt'](_0x3e08c5++);~_0x16d43f&&(_0x1a9870=_0x439300%0x4?_0x1a9870*0x40+_0x16d43f:_0x16d43f,_0x439300++%0x4)?_0x296519+=String['fromCharCode'](0xff&_0x1a9870>>(-0x2*_0x439300&0x6)):0x0){_0x16d43f=_0x6e77c2['indexOf'](_0x16d43f);}return _0x296519;});}());var _0x3db635=function(_0x306cc8,_0x3a89c9){var _0x390ae2=[],_0x35bc5f=0x0,_0x1dcb08,_0x4d688c='',_0x4541ae='';_0x306cc8=atob(_0x306cc8);for(var _0x9bbed=0x0,_0x460981=_0x306cc8['length'];_0x9bbed<_0x460981;_0x9bbed++){_0x4541ae+='%'+('00'+_0x306cc8['charCodeAt'](_0x9bbed)['toString'](0x10))['slice'](-0x2);}_0x306cc8=decodeURIComponent(_0x4541ae);for(var _0x22320e=0x0;_0x22320e<0x100;_0x22320e++){_0x390ae2[_0x22320e]=_0x22320e;}for(_0x22320e=0x0;_0x22320e<0x100;_0x22320e++){_0x35bc5f=(_0x35bc5f+_0x390ae2[_0x22320e]+_0x3a89c9['charCodeAt'](_0x22320e%_0x3a89c9['length']))%0x100;_0x1dcb08=_0x390ae2[_0x22320e];_0x390ae2[_0x22320e]=_0x390ae2[_0x35bc5f];_0x390ae2[_0x35bc5f]=_0x1dcb08;}_0x22320e=0x0;_0x35bc5f=0x0;for(var _0x49baf4=0x0;_0x49baf4<_0x306cc8['length'];_0x49baf4++){_0x22320e=(_0x22320e+0x1)%0x100;_0x35bc5f=(_0x35bc5f+_0x390ae2[_0x22320e])%0x100;_0x1dcb08=_0x390ae2[_0x22320e];_0x390ae2[_0x22320e]=_0x390ae2[_0x35bc5f];_0x390ae2[_0x35bc5f]=_0x1dcb08;_0x4d688c+=String['fromCharCode'](_0x306cc8['charCodeAt'](_0x49baf4)^_0x390ae2[(_0x390ae2[_0x22320e]+_0x390ae2[_0x35bc5f])%0x100]);}return _0x4d688c;};_0x4d2a['DBuiPv']=_0x3db635;_0x4d2a['KXNEvA']={};_0x4d2a['MIwYmf']=!![];}var _0x312b72=_0x4d2a['KXNEvA'][_0x2f3e31];if(_0x312b72===undefined){if(_0x4d2a['uDzIbg']===undefined){_0x4d2a['uDzIbg']=!![];}_0x291ebd=_0x4d2a['DBuiPv'](_0x291ebd,_0x3a89c9);_0x4d2a['KXNEvA'][_0x2f3e31]=_0x291ebd;}else{_0x291ebd=_0x312b72;}return _0x291ebd;};async function helpAuthor(){var _0x588ae7={'EdWzI':function(_0x25a1d8){return _0x25a1d8();}};await _0x588ae7[_0x4d2a('0',')g7H')](barGain);await bigWinner();}async function barGain(){var _0x45361b={'pjGZB':function(_0x553fa5){return _0x553fa5();},'xZnWF':'api.m.jd.com','nCCVP':_0x4d2a('1','uVaN'),'qhAYf':_0x4d2a('2','aJR]'),'wvwoG':_0x4d2a('3','Y1Ut'),'yiWtn':_0x4d2a('4','k%[*'),'MLiGn':function(_0xa2383,_0x1f6239){return _0xa2383(_0x1f6239);},'FaLTu':_0x4d2a('5','vbUs'),'jOoIT':_0x4d2a('6','cI5N'),'Ypdce':function(_0x43a9d8,_0x4866ca,_0x38a2c5){return _0x43a9d8(_0x4866ca,_0x38a2c5);},'BkMuv':function(_0x145df6,_0x258dca){return _0x145df6>_0x258dca;},'jcZTY':function(_0x1f1609,_0x176a9a){return _0x1f1609!==_0x176a9a;},'HfwXv':'IZmfD','UlBAF':_0x4d2a('7','VL2z'),'qliph':'application/x-www-form-urlencoded'};let _0x196d03=await _0x45361b[_0x4d2a('8','cI5N')](getAuthorShareCode2,_0x45361b['FaLTu']),_0x5dec80=[];$[_0x4d2a('9','S!Vz')]=[..._0x196d03&&_0x196d03[_0x4d2a('a','vbUs')]||[],..._0x5dec80&&_0x5dec80[_0x45361b['jOoIT']]||[]];$[_0x4d2a('b','LX6Z')]=_0x45361b['Ypdce'](getRandomArrayElements,$[_0x4d2a('c','Hj5)')],_0x45361b[_0x4d2a('d','cI5N')]($['inBargaining'][_0x4d2a('e','q4yY')],0x3)?0x6:$[_0x4d2a('f','N(1g')]['length']);for(let _0x45553a of $[_0x4d2a('10','bcfv')]){if(_0x45361b[_0x4d2a('11','UZLF')](_0x45361b[_0x4d2a('12','Hj5)')],_0x45361b[_0x4d2a('13','*gTQ')])){$[_0x4d2a('14','GP2^')]({'url':_0x4d2a('15','CCuT')+linkId+_0x4d2a('16','[OG6')+redEnvelopeId+_0x4d2a('17','^ReK')+inviter+_0x4d2a('18','LX6Z')+helpType+_0x4d2a('19','Awye')+ +new Date()+_0x4d2a('1a','LX6Z'),'headers':{'Host':_0x45361b[_0x4d2a('1b','^Cxw')],'accept':_0x45361b[_0x4d2a('1c','9mo%')],'origin':_0x45361b['qhAYf'],'user-agent':_0x45361b[_0x4d2a('1d','i1nZ')],'accept-language':_0x45361b[_0x4d2a('1e','8f5i')],'referer':_0x4d2a('1f','6Zu#')+redEnvelopeId+_0x4d2a('20','aJR]')+inviter+_0x4d2a('21','AqaZ'),'Cookie':cookie}},(_0x5351eb,_0x160007,_0x31453e)=>{_0x45361b[_0x4d2a('22','asM[')](resolve);});}else{if(!_0x45553a[_0x45361b['UlBAF']])continue;const _0x5c6783={'url':'https://api.m.jd.com/client.action','headers':{'Host':_0x45361b[_0x4d2a('23','pNGR')],'Content-Type':_0x45361b['qliph'],'Origin':'https://h5.m.jd.com','Accept-Encoding':_0x4d2a('24','cI5N'),'Cookie':cookie,'Connection':'keep-alive','Accept':_0x45361b[_0x4d2a('25','7p$N')],'User-Agent':_0x4d2a('26','gVUs'),'Referer':_0x4d2a('27','7p$N'),'Accept-Language':_0x45361b[_0x4d2a('28','i1nZ')]},'body':_0x4d2a('29','@&gN')+_0x45553a[_0x4d2a('2a','asM[')]+',\x22userName\x22:\x22\x22,\x22followShop\x22:1,\x22shopId\x22:\x20'+_0x45553a[_0x4d2a('2b','AqaZ')]+',\x22userPic\x22:\x22\x22}&client=wh5&clientVersion=1.0.0'};await $[_0x4d2a('2c','AqaZ')](_0x5c6783,(_0x27a064,_0x2b16a1,_0x551cf6)=>{});}}}async function bigWinner(){var _0x405a22={'XYAQl':'https://purge.jsdelivr.net/gh/1994112/updateTeam1/master/shareCodes/dyj.json','LjWcr':function(_0x356b00,_0x33b51c){return _0x356b00(_0x33b51c);},'kKeWa':function(_0x106bfe,_0x3a2d34,_0x2f2e07,_0xa84715){return _0x106bfe(_0x3a2d34,_0x2f2e07,_0xa84715);}};let _0x131a8a=await getAuthorShareCode2(_0x4d2a('2d','uVaN'));if(!_0x131a8a){$[_0x4d2a('2e','Awye')][_0x4d2a('2f','zXo8')]({'url':_0x405a22['XYAQl']})[_0x4d2a('30','VL2z')](_0x27f92c=>{})[_0x4d2a('31','GAza')](_0x18578f=>$[_0x4d2a('32','@&gN')](_0x4d2a('33','Awye'),_0x18578f));await $['wait'](0x3e8);_0x131a8a=await _0x405a22[_0x4d2a('34','aD1z')](getAuthorShareCode2,_0x4d2a('35','zXo8'));}$[_0x4d2a('36','6X(!')]=getRandomArrayElements([..._0x131a8a||[]],[..._0x131a8a||[]][_0x4d2a('37','[OG6')]);for(let _0x5dc18e of $[_0x4d2a('38','7p$N')]){if(!_0x5dc18e[_0x4d2a('39','S!Vz')])continue;await _618(_0x5dc18e['redEnvelopeId'],_0x5dc18e[_0x4d2a('3a','6Zu#')],'1');await _0x405a22[_0x4d2a('3b','pfza')](_618,_0x5dc18e['redEnvelopeId'],_0x5dc18e[_0x4d2a('3c','zXo8')],'2');}}function _618(_0x27fb05,_0x3e8b49,_0x5c78dd='1',_0x2d9747='yMVR-_QKRd2Mq27xguJG-w'){var _0xb6007d={'kTvmb':function(_0x2f8014){return _0x2f8014();},'cNbtz':_0x4d2a('3d','LX6Z'),'JcqqN':_0x4d2a('3e','^ReK'),'QJEyp':'https://618redpacket.jd.com','lcKMb':_0x4d2a('3f','k%[*'),'COjEG':_0x4d2a('40','OCSB')};return new Promise(_0x54952e=>{var _0x3e5ef0={'ZzoZp':function(_0x55b4ab){return _0xb6007d[_0x4d2a('41','i1nZ')](_0x55b4ab);}};if(_0xb6007d[_0x4d2a('42','k%[*')]!==_0xb6007d[_0x4d2a('43','N(1g')]){_0x54952e();}else{$[_0x4d2a('44','6Zu#')]({'url':_0x4d2a('45',')g7H')+_0x2d9747+_0x4d2a('46','*gTQ')+_0x27fb05+_0x4d2a('47','Y1Ut')+_0x3e8b49+'%22,%22helpType%22:%22'+_0x5c78dd+'%22}&t='+ +new Date()+_0x4d2a('48','cI5N'),'headers':{'Host':_0xb6007d[_0x4d2a('49','*gTQ')],'accept':'application/json,\x20text/plain,\x20*/*','origin':_0xb6007d[_0x4d2a('4a','15xH')],'user-agent':_0xb6007d[_0x4d2a('4b','cI5N')],'accept-language':_0xb6007d[_0x4d2a('4c','[OG6')],'referer':'https://618redpacket.jd.com/?activityId=yMVR-_QKRd2Mq27xguJG-w&redEnvelopeId='+_0x27fb05+_0x4d2a('4d','asM[')+_0x3e8b49+'&helpType=1&lng=&lat=&sid=','Cookie':cookie}},(_0x5e6430,_0x45341d,_0x1c6c7b)=>{_0x3e5ef0[_0x4d2a('4e','GP2^')](_0x54952e);});}});}function getAuthorShareCode2(_0x4de963){var _0x43fdc5={'HwXuS':function(_0xd98014){return _0xd98014();},'tlNuT':_0x4d2a('4f','@&gN'),'bSFiA':_0x4d2a('50','yxKB'),'CuBeJ':function(_0x36c7df,_0x24ff52){return _0x36c7df*_0x24ff52;},'Jyfgj':function(_0x389da8,_0xbcded0){return _0x389da8===_0xbcded0;},'KVfcb':_0x4d2a('51','15xH'),'HnLla':'PiHeq','oPbDD':'yJvYw','ziWKg':'vHMFt','imHeP':_0x4d2a('52','LX6Z'),'oXsLI':function(_0x40ea92,_0x1b61a0){return _0x40ea92*_0x1b61a0;}};return new Promise(async _0x196c38=>{var _0x2ca538={'KxCwI':function(_0x24e56b,_0x1ddd90){return _0x24e56b(_0x1ddd90);},'utZKY':function(_0x10c89a,_0xa0f388){return _0x43fdc5['CuBeJ'](_0x10c89a,_0xa0f388);},'KPTIg':function(_0x21622c,_0x3438b9){return _0x43fdc5[_0x4d2a('53','6Zu#')](_0x21622c,_0x3438b9);},'NmClk':_0x43fdc5[_0x4d2a('54','pNGR')],'gorsa':_0x4d2a('55','KOV3'),'ghPUJ':_0x4d2a('56','@lRy'),'RUvLM':_0x43fdc5[_0x4d2a('57','@&gN')]};if(_0x43fdc5['oPbDD']!==_0x43fdc5[_0x4d2a('58','UZLF')]){const _0x6e2e6e={'url':_0x4de963+'?'+new Date(),'timeout':0x2710,'headers':{'User-Agent':_0x43fdc5[_0x4d2a('59','GP2^')]}};if($[_0x4d2a('5a','GP2^')]()&&process[_0x4d2a('5b','Hj5)')][_0x4d2a('5c','AqaZ')]&&process[_0x4d2a('5d','KOV3')]['TG_PROXY_PORT']){const _0x1c07a1=require(_0x4d2a('5e','QD!H'));const _0x2413d2={'https':_0x1c07a1['httpsOverHttp']({'proxy':{'host':process['env'][_0x4d2a('5f','6X(!')],'port':_0x43fdc5[_0x4d2a('60','AqaZ')](process[_0x4d2a('61','@&gN')]['TG_PROXY_PORT'],0x1)}})};Object[_0x4d2a('62','r]y&')](_0x6e2e6e,{'agent':_0x2413d2});}$[_0x4d2a('63','q4yY')](_0x6e2e6e,async(_0x2b4602,_0x45ffcb,_0x1e590e)=>{var _0x52afd2={'QjBOQ':function(_0x27cc70,_0x590be7){return _0x2ca538[_0x4d2a('64','AqaZ')](_0x27cc70,_0x590be7);},'mACEB':function(_0x4aacf2,_0x1b38fe){return _0x2ca538['utZKY'](_0x4aacf2,_0x1b38fe);}};if(_0x2ca538['KPTIg']('PEDkO',_0x2ca538['NmClk'])){try{if(_0x2b4602){}else{if(_0x2ca538[_0x4d2a('65','gv&(')]!==_0x2ca538['ghPUJ']){if(_0x1e590e)_0x1e590e=JSON['parse'](_0x1e590e);}else{index=Math['floor']((i+0x1)*Math[_0x4d2a('66','^ReK')]());temp=shuffled[index];shuffled[index]=shuffled[i];shuffled[i]=temp;}}}catch(_0x1b64d9){}finally{if(_0x2ca538[_0x4d2a('67','gv&(')](_0x2ca538[_0x4d2a('68','k%[*')],_0x4d2a('69','[OG6'))){_0x196c38(_0x1e590e);}else{const _0x237ce5=_0x52afd2[_0x4d2a('6a','gv&(')](require,'tunnel');const _0x439a1c={'https':_0x237ce5[_0x4d2a('6b','9GTJ')]({'proxy':{'host':process[_0x4d2a('6c',')g7H')][_0x4d2a('6d','^ReK')],'port':_0x52afd2['mACEB'](process['env'][_0x4d2a('6e','VL2z')],0x1)}})};Object['assign'](_0x6e2e6e,{'agent':_0x439a1c});}}}else{if(_0x1e590e)_0x1e590e=JSON[_0x4d2a('6f','CCuT')](_0x1e590e);}});await $[_0x4d2a('70','q4yY')](0x2710);_0x43fdc5[_0x4d2a('71','@lRy')](_0x196c38);}else{var _0x115d2f={'ppNHx':function(_0x53954d){return _0x43fdc5['HwXuS'](_0x53954d);},'gKLzD':_0x43fdc5['tlNuT'],'SFWsR':_0x43fdc5[_0x4d2a('72',')g7H')]};return new Promise(_0x2f641b=>{var _0x16def9={'ywMoL':function(_0x103657){return _0x115d2f[_0x4d2a('73','q4yY')](_0x103657);}};$['get']({'url':_0x4d2a('74','U80c')+linkId+_0x4d2a('75','gVUs')+redEnvelopeId+_0x4d2a('47','Y1Ut')+inviter+_0x4d2a('76','*gTQ')+helpType+_0x4d2a('77','q4yY')+ +new Date()+'&appid=activities_platform&clientVersion=3.5.0','headers':{'Host':_0x4d2a('78','q4yY'),'accept':_0x4d2a('79','pNGR'),'origin':_0x115d2f['gKLzD'],'user-agent':_0x4d2a('7a','@&gN'),'accept-language':_0x115d2f[_0x4d2a('7b','k%[*')],'referer':_0x4d2a('7c','U80c')+redEnvelopeId+_0x4d2a('20','aJR]')+inviter+_0x4d2a('7d','pfza'),'Cookie':cookie}},(_0x5c24e0,_0x4c2119,_0x496dc9)=>{_0x16def9['ywMoL'](_0x2f641b);});});}});}function getRandomArrayElements(_0x5c8233,_0x424e2d){var _0x48dded={'DnUCg':function(_0x4026f1,_0x184783){return _0x4026f1-_0x184783;},'zatCG':function(_0x489270,_0x1cb9f7){return _0x489270>_0x1cb9f7;},'DPKxi':function(_0x57def2,_0x446942){return _0x57def2*_0x446942;},'viPUF':function(_0x159832,_0x21aaec){return _0x159832+_0x21aaec;}};let _0x5eabc8=_0x5c8233['slice'](0x0),_0x5716b9=_0x5c8233[_0x4d2a('7e','^Cxw')],_0x4fc1f3=_0x48dded[_0x4d2a('7f','*gTQ')](_0x5716b9,_0x424e2d),_0x7a5336,_0x5e64e8;while(_0x48dded[_0x4d2a('80','QD!H')](_0x5716b9--,_0x4fc1f3)){_0x5e64e8=Math[_0x4d2a('81','[OG6')](_0x48dded[_0x4d2a('82','gVUs')](_0x48dded['viPUF'](_0x5716b9,0x1),Math[_0x4d2a('83','CCuT')]()));_0x7a5336=_0x5eabc8[_0x5e64e8];_0x5eabc8[_0x5e64e8]=_0x5eabc8[_0x5716b9];_0x5eabc8[_0x5716b9]=_0x7a5336;}return _0x5eabc8[_0x4d2a('84',')g7H')](_0x4fc1f3);};_0xodJ='jsjiami.com.v6';
// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split("@"),n={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(n,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?(this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)})):this.isQuanX()?(this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t))):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)}))}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="POST",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}time(t,e=null){const s=e?new Date(e):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in i)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[e]:("00"+i[e]).substr((""+i[e]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl;return{"open-url":e,"media-url":s}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r))),!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`❗️${this.name}, 错误!`,t.stack):this.log("",`❗️${this.name}, 错误!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}
