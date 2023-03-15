const functions = require("firebase-functions");
const axios = require('axios');
const qs = require('qs')
// // Create and deploy your first functions
// // https://firebase.google.com/docs/functions/get-started
//

const cors = require('cors')({
  origin: true
});

const LUNCH_CATEGORY_TABLE = new Map(Object.entries({
  "한식": 0,
  "양식": 1,
  "중식": 2,
  "일식": 3,
  "만원": 105,
  "밥": 201,
  "빵": 202,
  "면": 203,
  "덮밥": 204,
  "튀김": 205,
  "국물": 206,
  "돈까스": 207,
  "떡": 208,
  "100m": 306,
  "200m": 307,
  "300m": 308,
  "코엑스": 399,
  "선릉": 398,
  "포스코": 398,
  "회식": 500,
}))

const LUNCH_MENUS = [
  {
    name: '호신각',
    categories: [2, 105, 203, 306]
  },
  {
    name: '장정정',
    categories: [3, 201, 204, 307]
  },
  {
    name: '삼성집',
    categories: [0, 105, 201, 308]
  },
  {
    name: '오봉집',
    categories: [0, 201, 308, 500]
  },
  {
    name: '잔슨빌',
    categories: [0, 201, 206, 308, 500]
  },
  {
    name: '교대밀밭',
    categories: [3, 201, 203, 205, 207, 308]
  },
  {
    name: '남다른감자탕',
    categories: [0, 105, 201, 206, 308, 500]
  },
  {
    name: '삼백플러스',
    categories: [0, 105, 201, 307]
  },
  {
    name: '보름쇠',
    categories: [0, 201, 307, 500]
  },
  {
    name: '바른식탁',
    categories: [0, 201, 306]
  },
  {
    name: '부타이1막',
    categories: [3, 201, 203, 205, 207, 307]
  },
  {
    name: '동경규동',
    categories: [3, 201, 204, 206, 306]
  },
  {
    name: '기소야',
    categories: [3, 201, 204, 207, 306]
  },
  {
    name: '더차이홍',
    categories: [2, 105, 201, 203, 306]
  },
  {
    name: '버거킹',
    categories: [1, 105, 202]
  },
  {
    name: '제임스_인생맛집',
    categories: []
  },
  {
    name: '고씨네떡볶이',
    categories: [0, 208]
  },
  {
    name: '헤더오마카세',
    categories: []
  },
  {
    name: '옐로트렁크',
    categories: [1, 105, 202, 307]
  },
  {
    name: '썸머맛집',
    categories: []
  },
  {
    name: '편의점',
    categories: [105, 306]
  },
  {
    name: '모구모구돈부리',
    categories: [3, 201, 204, 207, 307]
  },
  {
    name: '석기정돌솥부대찌개',
    categories: [0, 105, 201, 206, 307]
  },
  {
    name: '차이797',
    categories: [2, 203, 307, 500]
  },
  {
    name: '에그슬럿',
    categories: [1, 202, 307, 399]
  }
]

const LUNCH_PROBABILITIES_TABLE = []

global.LUNCH_IAM = {
  timestamp: "",
  members: []
}



const initialize_lunchiam = () => {
  const nowDate = new Date().getDate()
  if (global.LUNCH_IAM.timestamp != nowDate) {
    global.LUNCH_IAM.timestamp = nowDate
    global.LUNCH_IAM.members = []
  }
}

const COMMAND_TYPES = new Map(Object.entries({
  "점심": [1, 2, 3, 4, 5, 6, 7],
  "번역": [10],
  "사용법": [8],
  "기타": [9, 11, 12, 13]
}))


const COMMAND_LIST = new Map(Object.entries({
  "추천": 1,
  "점메추": 1,
  "뭐먹지": 1,
  "추가": 2,
  "제거": 3,
  "삭제": 3,
  "목록": 4,
  "리스트": 4,
  "나": 5,
  "노노": 6,
  "점따": 6,
  "누구": 7,
  "도움": 8,
  "안녕": 8,
  "헬프": 8,
  "하이": 8,
  "뽑기": 9,
  "영한": 10,
  "한영": 10,
  "한중": 10,
  "중한": 10,
  "한태": 10,
  "태한": 10,
  "환율": 11,
  "코인": 12,
  "주식": 13,
}))

const COMMAND_LIST_EN = new Map(Object.entries({
  "pick": 1,
  "add": 2,
  "remove": 3,
  "delete": 3,
  "list": 4,
  "i": 5,
  "no": 6,
  "who": 7,
  "help": 8,
  "hi": 8,
  "roulette": 9,
  "e2k": 10,
  "k2e": 10,
  "k2z": 10,
  "z2k": 10,
  "k2t": 10,
  "t2k": 10,
  "currency": 11,
  "coin": 12,
  "stock": 13,
}))

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}


const extractCommands = (rawStr, recipientId) => {
  let commands = rawStr.trim();
  let isCommand = true
  const botId = process.env.LUNCHBOT_ID
  if (recipientId === botId) {
    // Mention 제거
    if (commands.startsWith("<at>")) {
      commands = commands.split('>')[2].trim()
    }
    // ! 제거
    if (commands.startsWith("!")) {
      commands = commands.slice(1)
    }
    // 빈커맨드일 경우 help
    if (commands.length == 0) {
      commands = 'help'
    }
  } else {
    // ! 제거
    if (commands.startsWith("!")) {
      commands = commands.slice(1)
    }
    // 빈 커맨드일 경우 커맨드 아님
    if (commands.length == 0) {
      isCommand = false
    }
  }

  return { commands, isCommand }
}

const getAuth = async () => {
  const obj = new URLSearchParams();
  obj.append('client_id', process.env.TEAMS_CLIENT_ID);
  obj.append('client_secret', process.env.TEAMS_CLIENT_SECRET);
  obj.append('grant_type', 'client_credentials');
  obj.append('scope', 'https://api.botframework.com/.default');
  const authRes = await axios({
    url: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    method: 'GET',
    responseType: 'json',
    headers: {
      'Content-Type': "application/x-www-form-urlencoded"
    },
    data: obj
  });
  const token = authRes.data.access_token
  functions.logger.debug("Token!", { res: authRes, token: token });
  return token
}

const getMembers = async (serviceUrl, conversationId, token) => {
  const memberRes = await axios({
    url: `${serviceUrl}v3/conversations/${conversationId}/members`,
    method: 'GET',
    responseType: 'json',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
  return memberRes.data.map((m) => m.givenName)
}

const LANGUAGE_CODE_TABLE = new Map(Object.entries({
  "영한": 100, "e2k": 100,
  "한영": 101, "k2e": 101,
  "한중": 102, "k2z": 102, 
  "중한": 103, "z2k": 103,
  "한태": 104, "k2t": 104,
  "태한": 105, "t2k": 105,
}))

const languageCode = (mode) => {
  let source = "ko"
  let target = "en"
  switch (mode) {
    case 100:
      source = "en"
      target = "ko"
      break;
    case 101:
      source = "ko"
      target = "en"
      break;
    case 102:
      source = "ko"
      target = "zh-CN"
      break;
    case 103:
      source = "zh-CN"
      target = "ko"
      break;
    case 104:
      source = "ko"
      target = "th"
      break;
    case 105:
      source = "th"
      target = "ko"
      break;
    default:
      break;
  }
  return { source, target }
}

const callTranslate = async (src, mode) => {
  const obj = new URLSearchParams();
  const { source, target } = languageCode(LANGUAGE_CODE_TABLE.get(mode))
  obj.append('source', source);
  obj.append('target', target);
  obj.append('text', src);
  const translateRes = await axios({
    method: "POST",
    url: "https://openapi.naver.com/v1/papago/n2mt",
    data: obj,
    responseType: 'json',
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID,
      "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET
    }
  })
  const res = translateRes.data.message?.result?.translatedText
  functions.logger.debug("TranslateRes!", { res: translateRes, translated: res });
  return res
} 

const CURRENCY_TABLE = new Map(Object.entries({
  "달러": "USD",
  "불": "USD",
  "엔": "JPY",
  "파운드": "GBP",
  "호주달러": "AUD",
  "동": "VND",
  "홍콩달러": "HKD",
  "대만원": "TWD",
  "대만달러": "TWD",
  "엔화": "JPY",
  "위안": "CNY",
  "유로": "EUR",
  "바트": "THB",
  "밧": "THB",
  "루피": "INR",
  "캐나다달러": "CAD",
  "스위스프랑": "CHF",
  "프랑": "CHF",
  "루블": "RUB",
  "싱가포르달러": "SGD",
}))

const getCurrency = async (targetCurrency) => {
  const targetCurrencyCode = CURRENCY_TABLE.get(targetCurrency)
  if (!targetCurrencyCode) return -1
  const res = await axios({
    url: process.env.NAVER_CURRENCY_CRAWL_SITE,
    method: 'GET',
    params: {
      marketindexCd:  `FX_${targetCurrencyCode}KRW`
    },
    responseType: 'xml'
  })

  const currencyData = +res.data.split("<p class=\"no_today\">")[1].split("</p>")[0].trim().split("\n")[2].trim().split("</span>").map((s) => s.split(">")[1]).join("").replaceAll(',', '')
  functions.logger.debug("CurrencyRes!", { currencyRes: currencyData });
  return currencyData
}

const ECONOMY_SITE = "https://finance.naver.com/sise/"
const STOCK_SITE = "https://finance.naver.com/item/main.naver"

global.STOCK_CODE = {
  lastUpdate: -1,
  codesMap: null
}

const getStockCode = async () => {
  const res = await axios({
    method: 'GET',
    responseType: 'arraybuffer',
    responseEncoding: 'binary',
    url: 'https://www.ktb.co.kr/trading/popup/itemPop.jspx',
  })
  const utf8data = new TextDecoder('euc-kr').decode(res.data)
  const stockCodes = utf8data.split("<select name='StockS'>")[1].split("</select>").split('\n')
  const resMap = new Map()
  stockCodes.forEach((s) => {
    const code = s.split('"')[1]
    const name = s.split('>')[1].split('</')[0].trim()
    resMap.set(name, code)
  })
  return resMap
}

const getStock = async (stock) => {
  let targetStockCode = "000000"
  if (/[0-9]{6}/.test(stock)) {
    if ([...global.STOCK_CODE.codesMap.values()].some((s) => s === stock))
      targetStockCode = stock
    else
      return 0
  } else {
    targetStockCode = global.STOCK_CODE.codesMap.get(stock)
    if (!targetStockCode) return 0
  }
  const res = await axios({
    method: "GET",
    url: STOCK_SITE,
    params: {
      code: targetStockCode
    },
    responseType: 'arraybuffer',
    responseEncoding: 'binary'
  })
  
  const stockData = new TextDecoder('euc-kr').decode(res.data).replaceAll("\n", "")?.split("<dl class=\"blind\">")[1]?.split("</dl>")[0]?.trim()?.split("</dd>")[3]?.split("<dd>")[1]
  const formattedStockData = stockData.replace("퍼센트", "%)</span>")
    .replace("상승", "<span style=\"color: #FF8888\">▲")
    .replace("하락", "<span style=\"color: #8888FF\">▼")
    .replace("플러스", "(+")
    .replace("마이너스", "(-")
    .replace("보합", "<span>〓 (")
    //.replaceAll(" ", "")
  return formattedStockData
}

const UPBIT_API = "https://api.upbit.com/v1/ticker"

const COIN_TABLE = new Map(Object.entries({
  "BTC": "BTC",
  "비트": "BTC",
  "비트코인": "BTC",
  "ETH": "ETH",
  "이더리움": "ETH",
  "이더": "ETH",
  "XRP": "XRP",
  "리플": "XRP",
  "DOGE": "DOGE",
  "도지": "DOGE",
  "도지코인": "DOGE",
  "ADA": "ADA",
  "에이다": "ADA",
  "ONT": "ONT",
  "온톨로지": "ONT",
  "코박토큰": "CBK",
  "코박": "CBK",
  "CBK": "CBK",
}))

const getCoin = async (targetCoin) => {
  const targetCoinCode = COIN_TABLE.get(targetCoin)
  if (!targetCoinCode) return -1
  const res = await axios({
    method: 'GET',
    url: UPBIT_API,
    params: {
      markets: `KRW-${targetCoinCode}`
    },
    responseType: 'json'
  })
  const coinValue = res.data[0].trade_price
  return coinValue
}

const callGPT = async (message) => {
  const res = await axios({
    method: 'POST',
    url: 'https://api.openai.com/v1/chat/completions',
    headers: {
      Authorization: `Bearer ${process.env.CHATGPT_API_KEY}`,
      'Content-Type': "application/json"
    },
    responseType: 'json',
    data: {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: message
        }
      ]
    }
  })
  const resMessageChoices = res.data.choices
  functions.logger.debug("GPT!", { req: message, choices: resMessageChoices });
  const targetChoice = resMessageChoices[Math.floor(Math.random() * resMessageChoices.length)]
  return targetChoice.message.content.replaceAll("\n", "<br/>")
}

exports.helloWorld = functions.https.onRequest(async (request, response) => {
  response.set('Access-Control-Allow-Origin', '*');
  cors(request, response, async () => {
    const req = request.body
    const conversationId = req.conversation.id;
    const serviceUrl = req.serviceUrl;

    // 메세지 타입만 판독
    if (req.type !== "message")
      return response.send({ "success": true })
    functions.logger.debug("Message!", { req })

    // Command string parse
    const { commands, isCommand } = extractCommands(String(req.text), req.recipient?.id)
    if (!isCommand)
      return response.send({ "success": true })

    const userName = String(req.from.name)
    const arguments = commands.split(' ')
    const command_key = COMMAND_LIST.get(arguments[0]) || COMMAND_LIST_EN.get(arguments[0])
    let respondText = ''
    switch (command_key) {
      case 1:
        // 추천 로직
        if (arguments.length === 1) {
          // 전체 랜덤 추천 로직
          const lunchMenus = LUNCH_MENUS.map((m) => m.name)
          const menu = lunchMenus[Math.floor(Math.random() * lunchMenus.length)]
          respondText = `오늘 추천 식당은 <b>"${menu}"</b> 입니다!!<p><p/>가고싶으면 나 를 입력해주세요`
        } else {
          // 카테고리 랜덤 추천 로직
          const categoryCode = LUNCH_CATEGORY_TABLE.get(arguments[1])
          if (categoryCode === undefined) {
            respondText = '해당 카테고리는 아직 없습니다.'
            break;
          }
          const targetMenus = LUNCH_MENUS.filter((m) => m.categories.includes(categoryCode)).map((m) => m.name)
          if (!targetMenus) {
            respondText = '해당 카테고리는 아직 없습니다.'
            break;
          }
          const menu = targetMenus[Math.floor(Math.random() * targetMenus.length)]
          respondText = `오늘 추천 식당은 <b>"${menu}"</b> 입니다!!<p><p/>가고싶으면 나 를 입력해주세요`
        }
        break;
      case 2:
        // 추가 로직
        if (arguments.length >= 2) {
          functions.logger.info("추가요청", { arguments: arguments.slice(1).join(' ') })
          respondText = `<b>"${arguments.slice(1).join(' ')}"</b> 추가하겠습니다:) 감사합니다`
        } else {
          respondText = '식당 이름을 입력 해야합니다.'
        }
        break;
      case 3:
        // 삭제 로직
        if (arguments.length >= 2) {
          functions.logger.info("삭제요청", { arguments: arguments.slice(1).join(' ') })
          respondText = `<b>"${arguments.slice(1).join(' ')}"</b> 삭제해달라 해보겠습니다:) 감사합니다`
        } else {
          respondText = '식당 이름을 입력 해야합니다.'
        }
        break;
      case 4:
        // 목록 로직
        respondText = `식당 목록: ${LUNCH_MENUS.map((m) => m.name).join(', ')}`
        break;
      case 5:
        // 점심 같이 먹을 사람 로직
        initialize_lunchiam()
        global.LUNCH_IAM.members = [...new Set([...global.LUNCH_IAM.members, userName])]
        respondText = `같이 먹으러가요!! 현재: ${global.LUNCH_IAM.members.join(', ')}`
        break;
      case 6:
        // 점심 같이 안 먹을 사람 로직
        initialize_lunchiam()
        global.LUNCH_IAM.members = global.LUNCH_IAM.members.filter((r) => r !== userName)
        respondText = `ㅠㅠ 현재: ${global.LUNCH_IAM.members.join(', ')}`
        break;
      case 7:
        // 누가 같이 먹는지 로직
        initialize_lunchiam()
        respondText = `같이 먹으러가요! ${global.LUNCH_IAM.members.join(', ')}`
        break;
      case 8:
        // help
        let helpTxt = ""
        COMMAND_TYPES.forEach((v, k) => {
          const targetCommands = []
          COMMAND_LIST.forEach((v1, k1) => {
            if (v.includes(v1)) {
              targetCommands.push(k1)
            }
          })
          helpTxt += `<p>[${k}]: ${targetCommands.join(", ")}</p>`
        })
        respondText = `기능별 명령어는 다음과 같습니다: <p>${helpTxt}</p>`
        break;
      case 9:
        // 뽑기
        if (arguments.length < 2) {
          respondText = "사용법: 뽑기 arg1 arg2 arg3 ....<br/> 또는 뽑기 ."
        } else {
          if (arguments[1] === '.') {
            const token = await getAuth()
            const members = await getMembers(serviceUrl, conversationId, token)
            const selectedValue = members[Math.floor(Math.random() * members.length)]
            respondText = `"<b>${selectedValue}</b>" 당첨!!!`
          } else {
            const selectedValue = arguments[Math.floor(Math.random() * arguments.length)]
            respondText = `"<b>${selectedValue}</b>" 당첨!!!`
          }
        }
        
        break;
      case 10:
        // 번역 로직
        respondText = await callTranslate(arguments.slice(1).join(' ').slice(0, 1000), arguments[0]) // max 1000 단어
        break;
      case 11:
        //환율 로직
        if (arguments.length == 2) {
          const currencyType = arguments[1].replace(/[0-9\.]/g, "")
          const defaultAmountUnit = ["엔", "엔화", "동"].some((s) => s === currencyType) ? 100 : 1
          const amount = +(arguments[1].replace(/[^0-9\.]/g, "") || defaultAmountUnit)
          let currencyUnit = await getCurrency(currencyType)
          if (currencyUnit < 0) {
            // 코인로직
            currencyUnit = await getCoin(currencyType)
            if (currencyUnit < 0) {
              respondText = `지원하지 않는 화폐/코인입니다.<br/>화폐/코인 리스트: ${[...CURRENCY_TABLE.keys(), ...COIN_TABLE.keys()].join(', ')}`
              break;
            }
          }
          const currencyRes = amount / defaultAmountUnit * currencyUnit
          respondText = `현재: ${amount}${currencyType} = ${numberWithCommas(parseInt(currencyRes))}원`
        } else {
          respondText = '"환율 달러 또는 환율 1달러" 라고 입력해보세요.'
        }
        break;
      case 12:
        // 코인 로직
        if (arguments.length == 2) {
          const currencyType = arguments[1].replace(/[0-9\.]/g, "")
          const amount = +(arguments[1].replace(/[^0-9\.]/g, "") || 1)
          let currencyUnit = await getCoin(currencyType)
          if (currencyUnit < 0) {
            respondText = `지원하지 않는 코인입니다.<br/>코인리스트: ${[...COIN_TABLE.keys()].join(', ')}`
            break;
          }
          const currencyRes = amount / defaultAmountUnit * currencyUnit
          respondText = `현재: ${amount}${currencyType} = ${numberWithCommas(parseInt(currencyRes))}원`
        } else {
          respondText = '코인 BTC 또는 코인 1비트코인" 라고 입력해보세요.'
        }
        break;
      case 13:
        // 주식 로직
        if (arguments.length == 2) {
          const now = new Date().getDate()
          if (now != global.STOCK_CODE.lastUpdate) {
            global.STOCK_CODE.codesMap = await getStockCode()
            global.STOCK_CODE.lastUpdate = now
          }
          const stockData = await getStock(arguments[1])
          if (!stockData) {
            respondText = '해당 코드명/주식명을 찾을 수 없습니다.'
          } else {
            respondText = `${arguments[1]}: ${stockData}`
          }

        } else {
          respondText = "사용법: 주식 <코드명> or <주식명>"
        }
        break;
      default:
        // 기타 로직
        const loveSentences = arguments.filter((a) => a.indexOf("좋아") >= 0)
        if (loveSentences.length > 0) {
          // 이스터에그
          if (loveSentences.length === 1) {
            respondText = Math.random() > 0.2 ? "저도 좋아요" : "저는 싫어요"
          } else {
            const token = await getAuth()
            const members = await getMembers(serviceUrl, conversationId, token)
            const sampleResponses = [
              "다 좋아요",
              "다 싫어요", 
              "고르기 쉽지않네요",
              `${members[Math.floor(Math.random() * members.length)]}에게 물어보세요.`,
              `${Math.floor(Math.random() * loveSentences.length) + 1}번째가 좋아요.`,
              `${Math.floor(Math.random() * loveSentences.length) + 1}번째는 싫어요.`,
            ]
            const probabilitiesCDF = [0.3, 0.35, 0.5, 0.7, 0.9, 1.0]
            const dice = Math.random()
            const diceIdx = probabilitiesCDF.findIndex((item) => item > dice)
            respondText = sampleResponses[diceIdx]
          }
          
        } else {
          // Chat GPT 3.5 Call
          respondText = await callGPT(commands)
          //functions.logger.info("커맨드요청", { arguments })
          //respondText = "아직 그런 말은 알아들을 수 없어요."
        }
        
        break;
    }

    // 답장
    if (respondText) {
      const token = await getAuth();
      const actionRes = await axios({
        url: `${serviceUrl}v3/conversations/${conversationId}/activities`,
        method: 'POST',
        responseType: 'json',
        data: {
          type: "message",
          text: respondText
        },
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      functions.logger.debug("Action!", { actionRes });
    }
    response.send({ "success": true });
  });
});
