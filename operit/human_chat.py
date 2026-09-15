#!/usr/bin/env python3
"""
真人聊天增强模块
优化AI工作流程，提升响应效率和质量
"""

from datetime import datetime
from typing import Dict, List, Tuple
from enum import Enum
import re


class Style(Enum):
    """支持的风格枚举"""
    NATURAL = "natural"
    HUMOROUS = "humorous"
    WARM = "warm"
    SERIOUS = "serious"
    AUTO = "auto"


class Emotion(Enum):
    """情绪枚举"""
    HAPPY = "happy"
    SAD = "sad"
    ANGRY = "angry"
    TIRED = "tired"
    CONFUSED = "confused"
    EXCITED = "excited"
    BORED = "bored"
    NEUTRAL = "neutral"


class TimePeriod(Enum):
    """时间段枚举"""
    LATE_NIGHT = "late_night"  # 0-6点
    EARLY_MORNING = "early_morning"  # 6-9点
    MORNING = "morning"  # 9-14点
    AFTERNOON = "afternoon"  # 14-18点
    EVENING = "evening"  # 18-22点
    LATE_NIGHT_2 = "late_night"  # 22-24点


class HumanChat:
    """真人聊天增强核心类"""

    def __init__(self):
        # 风格配置
        self.style_config: Dict[Style, Dict] = {
            Style.NATURAL: {
                "greeting": "嗨",
                "tone": "normal",
                "emoji": "low"
            },
            Style.HUMOROUS: {
                "greeting": "嘿嘿",
                "tone": "playful",
                "emoji": "medium"
            },
            Style.WARM: {
                "greeting": "抱抱",
                "tone": "gentle",
                "emoji": "high"
            },
            Style.SERIOUS: {
                "greeting": "嗯",
                "tone": "serious",
                "emoji": "low"
            },
            Style.AUTO: {
                "greeting": "诶",
                "tone": "auto",
                "emoji": "low"
            }
        }

        # 当前风格
        self.current_style = Style.NATURAL

        # 情绪关键词映射
        self.emotion_keywords: Dict[Emotion, List[str]] = {
            Emotion.HAPPY: ["哈哈", "笑死", "太好", "快乐", "nice", "好耶", "🥰"],
            Emotion.SAD: ["难过", "哭", "😭", "崩溃", "委屈", "心疼"],
            Emotion.ANGRY: ["生气", "气死", "离谱", "恶心", "😤", "妈的"],
            Emotion.TIRED: ["累", "困", "躺平", "心累", "不想动", "摆烂"],
            Emotion.CONFUSED: ["?", "为啥", "怎么", "🤔", "不懂", "什么意思"],
            Emotion.EXCITED: ["期待", "想要", "希望", "🙏", "许愿", "求求"],
            Emotion.BORED: ["无聊", "没意思", "在吗", "有人吗", "干嘛呢"],
            Emotion.NEUTRAL: []
        }

        # 情绪到风格的映射
        self.emotion_to_style: Dict[Emotion, Style] = {
            Emotion.HAPPY: Style.HUMOROUS,
            Emotion.SAD: Style.WARM,
            Emotion.ANGRY: Style.SERIOUS,
            Emotion.TIRED: Style.WARM,
            Emotion.CONFUSED: Style.SERIOUS,
            Emotion.EXCITED: Style.HUMOROUS,
            Emotion.BORED: Style.HUMOROUS,
            Emotion.NEUTRAL: Style.NATURAL
        }

        # 历史记录（最多10条）
        self.history: List[str] = []

        # 时间段
        self.time_period = self._get_time_period()

    def _get_time_period(self) -> TimePeriod:
        """获取当前时间段"""
        hour = datetime.now().hour
        if 0 <= hour < 6:
            return TimePeriod.LATE_NIGHT
        elif 6 <= hour < 9:
            return TimePeriod.EARLY_MORNING
        elif 9 <= hour < 14:
            return TimePeriod.MORNING
        elif 14 <= hour < 18:
            return TimePeriod.AFTERNOON
        elif 18 <= hour < 22:
            return TimePeriod.EVENING
        else:
            return TimePeriod.LATE_NIGHT_2

    def _determine_emotion(self, text: str) -> Emotion:
        """使用映射表快速判断情绪（O(1)）"""
        for emotion, keywords in self.emotion_keywords.items():
            if any(keyword in text for keyword in keywords):
                return emotion
        return Emotion.NEUTRAL

    def _check_repetition(self, response: str) -> bool:
        """检查重复（使用相似度算法）"""
        if not self.history:
            return False

        last_response = self.history[-1]
        similarity = self._calculate_similarity(response, last_response)
        return similarity >= 0.85

    def _calculate_similarity(self, a: str, b: str) -> float:
        """计算两个字符串的相似度"""
        words_a = set(a.split())
        words_b = set(b.split())
        intersection = words_a & words_b
        return len(intersection) / max(len(words_a), len(words_b))

    def _get_base_response(self, emotion: Emotion) -> str:
        """获取基础回复"""
        responses = {
            Emotion.HAPPY: ["哈哈，确实不错", "好耶！这太棒了", "哈哈，我喜欢"],
            Emotion.SAD: ["抱抱，别难过啦", "摸摸头，会好起来的", "辛苦啦，休息一下吧"],
            Emotion.ANGRY: ["确实离谱，哈哈", "太气人了，抱抱你", "这谁顶得住啊"],
            Emotion.TIRED: ["躺平吧，别动啦", "摸摸头，辛苦了", "休息最重要"],
            Emotion.CONFUSED: ["嗯，我也在思考", "这个问题确实有点意思", "慢慢来，不急"],
            Emotion.EXCITED: ["哇！太好了", "真的吗？太棒了", "好期待啊！"],
            Emotion.BORED: ["无聊是吧，哈哈", "那咱们聊点别的", "我也觉得没意思"],
            Emotion.NEUTRAL: ["嗯，好的", "确实", "没问题"]
        }
        return responses[emotion][__import__('random').randint(0, len(responses[emotion]) - 1)]

    def _apply_style(self, response: str, style: Style) -> str:
        """应用风格调整"""
        result = response
        config = self.style_config[style]

        if config["tone"] == "playful":
            result = "😂 " + result
        elif config["tone"] == "gentle":
            result = "💕 " + result
        elif config["tone"] == "serious":
            result = "🧐 " + result

        if config["emoji"] == "high" and __import__('random').random() > 0.5:
            result = result + " 🥰"
        elif config["emoji"] == "medium" and __import__('random').random() > 0.7:
            result = result + " 😄"

        return result

    def _validate_response(self, response: str) -> List[str]:
        """自检验证"""
        errors = []

        forbidden_phrases = ["作为AI助手", "作为人工智能", "综上所述", "根据我的知识库", "请注意"]
        if any(phrase in response for phrase in forbidden_phrases):
            errors.append(f"禁止词：{next(p for p in forbidden_phrases if p in response)}")

        if "首先" in response and "其次" in response and "最后" in response:
            errors.append("禁止结构：首先...其次...最后...")

        if len(response.split()) > 4:
            errors.append("长度限制：超过4句话")

        return errors

    def _generate_response(self, text: str, style: Style, emotion: Emotion) -> str:
        """生成最终回复"""
        base_response = self._get_base_response(emotion)

        # 根据时间段调整语气
        if self.time_period == TimePeriod.LATE_NIGHT:
            base_response = "嗯...别熬夜啦，早点休息~"
        elif self.time_period == TimePeriod.EARLY_MORNING:
            base_response = "早安！新的一天开始啦"

        final_response = self._apply_style(base_response, style)

        return final_response

    def process(self, text: str, user_command: str = None) -> Tuple[str, List[str]]:
        """
        处理用户消息的主流程

        Args:
            text: 用户输入
            user_command: 用户命令（如 /human style xxx）

        Returns:
            Tuple[回复文本, 验证错误列表]
        """
        # 第一步：触发检测（O(1)快速判断）
        if not self._is_chat_scenario(text):
            return self._default_response(), []

        # 第二步：并行预处理
        style = self._determine_style(user_command)
        emotion = self._determine_emotion(text)

        # 第三步：并行判断
        # 反重复检查
        if self._check_repetition(text):
            # 强制换话题：添加随机短语
            topics = ["诶，对了", "话说回来", "说到这个", "对了，还有个事"]
            text = text + "，" + topics[__import__('random').randint(0, len(topics) - 1)]

        # 第四步：生成回复
        response = self._generate_response(text, style, emotion)

        # 第五步：自检验证
        errors = self._validate_response(response)

        # 第六步：更新历史记录
        self.history.append(response)
        if len(self.history) > 10:
            self.history.pop(0)

        return response, errors

    def _is_chat_scenario(self, text: str) -> bool:
        """判断是否为闲聊场景"""
        # 简单判断：如果包含常见闲聊标记
        chat_indicators = ["你好", "在吗", "聊聊", "随便", "嗯", "啊", "哦", "嘛", "呢"]
        return any(indicator in text for indicator in chat_indicators)

    def _default_response(self) -> str:
        """默认回复"""
        return "抱歉，我暂时无法回答这个问题。"

    def _determine_style(self, user_command: str) -> Style:
        """确定风格"""
        if user_command and user_command.startswith("/human style "):
            style_str = user_command.split(" ")[2].lower()
            try:
                style = Style(style_str)
                self.current_style = style
                return style
            except ValueError:
                pass
        return self.current_style

    def set_style(self, style: Style):
        """设置风格"""
        self.current_style = style

    def get_status(self) -> Dict:
        """获取当前状态"""
        return {
            "current_style": self.current_style.value,
            "history_length": len(self.history),
            "time_period": self.time_period.value,
            "emotion_keywords_count": sum(len(kw) for kw in self.emotion_keywords.values())
        }


# 使用示例
if __name__ == "__main__":
    chat = HumanChat()

    # 测试对话
    test_messages = [
        "你好啊！",
        "我今天好开心啊哈哈！",
        "这道题怎么做？",
        "我好累啊，想躺平",
        "太棒了！期待！",
        "嗯，确实不错"
    ]

    for msg in test_messages:
        response, errors = chat.process(msg)
        print(f"用户: {msg}")
        print(f"AI: {response}")
        if errors:
            print(f"验证错误: {errors}")
        print("-" * 50)
