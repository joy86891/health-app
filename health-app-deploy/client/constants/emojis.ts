/**
 * 表情配置
 * 使用 @expo/vector-icons 图标
 */

export interface EmojiItem {
  id: string;
  name: string;
  icon: string;  // FontAwesome6 图标名称
}

// 表情列表（运动打卡主题）
export const EMOJI_IMAGES: EmojiItem[] = [
  // 开心系列
  { id: 'happy', name: '开心', icon: 'face-smile' },
  { id: 'laugh', name: '大笑', icon: 'face-laugh-beam' },
  { id: 'cool', name: '酷', icon: 'glasses' },
  { id: 'love', name: '喜欢', icon: 'heart' },
  
  // 点赞系列
  { id: 'thumb', name: '点赞', icon: 'thumbs-up' },
  { id: 'clap', name: '鼓掌', icon: 'hands-clapping' },
  { id: 'fire', name: '厉害', icon: 'fire' },
  { id: 'star', name: '加油', icon: 'hand-fist' },
  
  // 运动系列
  { id: 'run', name: '运动', icon: 'person-running' },
  { id: 'muscle', name: '强壮', icon: 'dumbbell' },
  { id: 'medal', name: '荣誉', icon: 'medal' },
  { id: 'trophy', name: '冠军', icon: 'trophy' },
  
  // 情绪系列
  { id: 'think', name: '思考', icon: 'lightbulb' },
  { id: 'surprise', name: '惊讶', icon: 'star' },
  { id: 'cry', name: '感动', icon: 'heart-crack' },
  { id: 'shy', name: '害羞', icon: 'face-blush' },
];

// 快捷回复表情（用于消息列表显示）
export const QUICK_EMOJIS = EMOJI_IMAGES.slice(0, 8);
