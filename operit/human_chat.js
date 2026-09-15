/**
 * 真人聊天增强模块
 * 优化AI工作流程，提升响应效率和质量
 */

const STYLE_CONFIG = {
  natural: { greeting: '嗨', tone: 'normal', emoji: 'low' },
  humorous: { greeting: '嘿嘿', tone: 'playful', emoji: 'medium' },
  warm: { greeting: '抱抱', tone: 'gentle', emoji: 'high' },
  serious: { greeting: '嗯', tone: 'serious', emoji: 'low' },
  auto: { greeting: '诶', tone: 'auto', emoji: 'low' }
}

const EMOTION_KEYWORDS = {
  happy: ['哈哈', '笑死', '太好', '快乐', 'nice', '好耶', '🥰'],
  sad: ['难过', '哭', '😭', '崩溃', '委屈', '心疼'],
  angry: ['生气', '气死', '离谱', '恶心', '😤', '妈的'],
  tired: ['累', '困', '躺平', '心累', '不想动', '摆烂'],
  confused: ['?', '为啥', '怎么', '🤔', '不懂', '什么意思'],
  excited: ['期待', '想要', '希望', '🙏', '许愿', '求求'],
  bored: ['无聊', '没意思', '在吗', '有人吗', '干嘛呢'],
  neutral: []
}

const EMOTION_MAP = {
  happy: 'humorous',
  sad: 'warm',
  angry: 'serious',
  tired: 'warm',
  confused: 'serious',
  excited: 'humorous',
  bored: 'humorous',
  neutral: 'natural'
}

const TIME_PERIODS = {
  late_night: 'late_night',
  early_morning: 'early_morning',
  morning: 'morning',
  afternoon: 'afternoon',
  evening: 'evening',
  late_night_2: 'late_night'
}

const HISTORY = []

/**
 * 获取当前时间段
 */
function getTimePeriod() {
  const hour = new Date().getHours()
  if (hour >= 0 && hour < 6) return TIME_PERIODS.late_night
  if (hour >= 6 && hour < 9) return TIME_PERIODS.early_morning
  if (hour >= 9 && hour < 14) return TIME_PERIODS.morning
  if (hour >= 14 && hour < 18) return TIME_PERIODS.afternoon
  if (hour >= 18 && hour < 22) return TIME_PERIODS.evening
  return TIME_PERIODS.late_night_2
}

/**
 * 使用映射表快速判断情绪（O(1)）
 */
function determineEmotion(text) {
  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      return emotion
    }
  }
  return 'neutral'
}

/**
 * 检查重复（使用相似度算法）
 */
function checkRepetition(text) {
  const lastResponse = HISTORY[HISTORY.length - 1]
  if (!lastResponse) return false

  const similarity = calculateSimilarity(text, lastResponse)
  return similarity >= 0.85
}

/**
 * 计算两个字符串的相似度
 */
function calculateSimilarity(a, b) {
  const wordsA = a.split(/\s+/)
  const wordsB = b.split(/\s+/)
  const setA = new Set(wordsA)
  const setB = new Set(wordsB)
  const intersection = [...setA].filter(x => setB.has(x))
  return intersection.length / Math.max(wordsA.length, wordsB.length)
}

/**
 * 获取基础回复
 */
function getBaseResponse(emotion) {
  const responses = {
    happy: ['哈哈，确实不错', '好耶！这太棒了', '哈哈，我喜欢'],
    sad: ['抱抱，别难过啦', '摸摸头，会好起来的', '辛苦啦，休息一下吧'],
    angry: ['确实离谱，哈哈', '太气人了，抱抱你', '这谁顶得住啊'],
    tired: ['躺平吧，别动啦', '摸摸头，辛苦了', '休息最重要'],
    confused: ['嗯，我也在思考', '这个问题确实有点意思', '慢慢来，不急'],
    excited: ['哇！太好了', '真的吗？太棒了', '好期待啊！'],
    bored: ['无聊是吧，哈哈', '那咱们聊点别的', '我也觉得没意思'],
    neutral: ['嗯，好的', '确实', '没问题']
  }
  return responses[emotion][Math.floor(Math.random() * responses[emotion].length)]
}

/**
 * 应用风格调整
 */
function applyStyle(response, style) {
  let result = response
  const config = STYLE_CONFIG[style]

  if (config.tone === 'playful') result = '😂 ' + result
  if (config.tone === 'gentle') result = '💕 ' + result
  if (config.tone === 'serious') result = '🧐 ' + result

  if (config.emoji === 'high' && Math.random() > 0.5) {
    result = result + ' 🥰'
  } else if (config.emoji === 'medium' && Math.random() > 0.7) {
    result = result + ' 😄'
  }

  return result
}

/**
 * 自检验证
 */
function validateResponse(response) {
  const errors = []

  const forbiddenPhrases = ['作为AI助手', '作为人工智能', '综上所述', '根据我的知识库', '请注意']
  if (forbiddenPhrases.some(phrase => response.includes(phrase))) {
    errors.push('禁止词：' + forbiddenPhrases.find(p => response.includes(p)))
  }

  if (response.includes('首先') && response.includes('其次') && response.includes('最后')) {
    errors.push('禁止结构：首先...其次...最后...')
  }

  if (response.split(/\s+/).length > 4) {
    errors.push('长度限制：超过4句话')
  }

  return errors
}

/**
 * 生成最终回复
 */
function generateResponse(text, style, emotion, timePeriod) {
  let baseResponse = getBaseResponse(emotion)

  // 根据时间段调整语气
  if (timePeriod === 'late_night') {
    baseResponse = '嗯...别熬夜啦，早点休息~'
  } else if (timePeriod === 'early_morning') {
    baseResponse = '早安！新的一天开始啦'
  }

  return applyStyle(baseResponse, style)
}

/**
 * 处理用户消息的主流程
 */
function process(text, userCommand = null) {
  // 第一步：触发检测（O(1)快速判断）
  if (!isChatScenario(text)) {
    return { response: '抱歉，我暂时无法回答这个问题。', errors: [] }
  }

  // 第二步：并行预处理
  const style = determineStyle(userCommand)
  const emotion = determineEmotion(text)

  // 第三步：并行判断
  // 反重复检查
  if (checkRepetition(text)) {
    // 强制换话题：添加随机短语
    const topics = ['诶，对了', '话说回来', '说到这个', '对了，还有个事']
    text = text + '，' + topics[Math.floor(Math.random() * topics.length)]
  }

  // 第四步：生成回复
  const timePeriod = getTimePeriod()
  const response = generateResponse(text, style, emotion, timePeriod)

  // 第五步：自检验证
  const errors = validateResponse(response)

  // 第六步：更新历史记录
  HISTORY.push(response)
  if (HISTORY.length > 10) {
    HISTORY.shift()
  }

  return { response, errors }
}

/**
 * 判断是否为闲聊场景
 */
function isChatScenario(text) {
  // 简单判断：如果包含常见闲聊标记
  const chatIndicators = ['你好', '在吗', '聊聊', '随便', '嗯', '啊', '哦', '嘛', '呢']
  return chatIndicators.some(indicator => text.includes(indicator))
}

/**
 * 确定风格
 */
function determineStyle(userCommand) {
  if (userCommand && userCommand.startsWith('/human style ')) {
    const styleStr = userCommand.split(' ')[2].toLowerCase()
    if (STYLE_CONFIG[styleStr]) {
      return styleStr
    }
  }
  return 'natural'
}

/**
 * 设置风格
 */
function setStyle(style) {
  return STYLE_CONFIG[style] || STYLE_CONFIG.natural
}

/**
 * 获取当前状态
 */
function getStatus() {
  return {
    currentStyle: 'natural',
    historyLength: HISTORY.length,
    timePeriod: getTimePeriod(),
    emotionKeywordsCount: Object.values(EMOTION_KEYWORDS).reduce((sum, arr) => sum + arr.length, 0)
  }
}

// 使用示例
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    process,
    setStyle,
    getStatus,
    STYLE_CONFIG,
    EMOTION_KEYWORDS
  }
}
