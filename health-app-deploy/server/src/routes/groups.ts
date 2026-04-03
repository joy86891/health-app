import express from 'express';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import * as Crypto from 'crypto';

const router = express.Router();

/**
 * 获取用户ID（优先 x-user-id，其次 x-device-id）
 */
async function getUserId(req: express.Request, client: any): Promise<{ userId: number | null; error?: string }> {
  const userIdHeader = req.headers['x-user-id'] as string;
  const deviceId = req.headers['x-device-id'] as string;

  if (userIdHeader) {
    return { userId: parseInt(userIdHeader, 10) };
  }

  if (deviceId) {
    const { data: user } = await client
      .from('users')
      .select('id')
      .eq('device_id', deviceId)
      .single();
    
    if (user) {
      return { userId: user.id };
    }
  }

  return { userId: null, error: '请先登录' };
}

/**
 * 创建群组
 * POST /api/v1/groups
 * Body: { customCode?: string }
 */
router.post('/', async (req, res) => {
  try {
    const client = getSupabaseClient();
    const { userId, error } = await getUserId(req, client);

    if (!userId) {
      return res.status(401).json({ error: error || '请先登录' });
    }

    // 获取用户信息
    const { data: user } = await client
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 检查用户是否已在群组中（目前每人只能加入一个群组）
    const { data: existingMembership } = await client
      .from('group_members')
      .select('*, groups(*)')
      .eq('user_id', userId)
      .single();

    if (existingMembership) {
      return res.status(400).json({ 
        error: '您已加入群组，请先退出当前群组',
        group: existingMembership.groups 
      });
    }

    // 生成随机邀请码（内部使用，前端不再使用）
    const code = Crypto.randomBytes(4).toString('hex').toUpperCase();

    // 生成固定群号（4位数字，永不变）
    let groupNumber: string;
    let attempts = 0;
    while (attempts < 100) {
      groupNumber = Math.floor(1000 + Math.random() * 9000).toString();
      const { data: existingNumber } = await client
        .from('groups')
        .select('id')
        .eq('group_number', groupNumber)
        .single();
      if (!existingNumber) break;
      attempts++;
    }
    if (attempts >= 100) {
      return res.status(500).json({ error: '生成群号失败，请重试' });
    }

    // 创建群组
    const { data: group, error: createError } = await client
      .from('groups')
      .insert({ code, group_number: groupNumber!, created_by: userId })
      .select()
      .single();

    if (createError) {
      console.error('创建群组失败:', createError);
      return res.status(500).json({ error: '创建群组失败' });
    }

    // 将用户加入群组（作为群主）
    await client
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: userId,
        role: 'owner',
      });

    res.json({ success: true, data: group });
  } catch (error) {
    console.error('创建群组失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 加入群组
 * POST /api/v1/groups/join
 * Body: { code: string }
 */
router.post('/join', async (req, res) => {
  try {
    const { groupNumber } = req.body;
    const client = getSupabaseClient();
    
    // 调试日志
    console.log('[加入群组] 请求参数:', { groupNumber, userId: req.headers['x-user-id'], deviceId: req.headers['x-device-id'] });
    
    const { userId, error } = await getUserId(req, client);

    if (!userId) {
      console.log('[加入群组] 用户未登录:', error);
      return res.status(401).json({ error: error || '请先登录' });
    }

    if (!groupNumber) {
      return res.status(400).json({ error: '请输入群号' });
    }

    console.log('[加入群组] 用户ID:', userId, '群号:', groupNumber);

    // 获取用户信息
    const { data: user } = await client
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 检查用户是否已在群组中
    const { data: existingMembership } = await client
      .from('group_members')
      .select('*, groups(*)')
      .eq('user_id', userId)
      .single();

    if (existingMembership) {
      console.log('[加入群组] 用户已在群组中:', existingMembership);
      return res.status(400).json({ 
        error: '您已加入群组，请先退出当前群组',
        group: existingMembership.groups 
      });
    }

    // 查找群组（使用固定群号）
    const { data: group, error: groupError } = await client
      .from('groups')
      .select('*')
      .eq('group_number', groupNumber.toString())
      .single();

    if (groupError || !group) {
      return res.status(404).json({ error: '群组不存在或群号错误' });
    }

    // 检查群组成员数量
    const { count } = await client
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', group.id);

    const maxMembers = group.max_members || 150;
    if (count && count >= maxMembers) {
      return res.status(400).json({ error: '群组人数已满' });
    }

    // 将用户加入群组
    const { error: joinError } = await client
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: userId,
        role: 'member',
      });

    if (joinError) {
      console.error('加入群组失败:', joinError);
      return res.status(500).json({ error: '加入群组失败' });
    }

    // 发送系统消息
    await client
      .from('group_messages')
      .insert({
        group_id: group.id,
        user_id: userId,
        content: `${user.name} 加入了群组`,
        type: 'system',
      });

    res.json({ success: true, data: group });
  } catch (error) {
    console.error('加入群组失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 更新群组名称
 * PUT /api/v1/groups/name
 * Body: { name: string }
 */
router.put('/name', async (req, res) => {
  try {
    const { name } = req.body;
    const client = getSupabaseClient();
    const { userId, error } = await getUserId(req, client);

    if (!userId) {
      return res.status(401).json({ error: error || '请先登录' });
    }

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: '请输入群组名称' });
    }

    if (name.length > 50) {
      return res.status(400).json({ error: '群组名称不能超过50个字符' });
    }

    // 获取用户的群组成员信息
    const { data: membership } = await client
      .from('group_members')
      .select('*, groups(*)')
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return res.status(400).json({ error: '未加入群组' });
    }

    // 只有群主可以修改群组名称
    if (membership.role !== 'owner') {
      return res.status(403).json({ error: '只有群组创建人可以修改群组名称' });
    }

    // 更新群组名称
    const { error: updateError } = await client
      .from('groups')
      .update({ name: name.trim() })
      .eq('id', membership.group_id);

    if (updateError) {
      console.error('更新群组名称失败:', updateError);
      return res.status(500).json({ error: '更新群组名称失败' });
    }

    res.json({ success: true, data: { name: name.trim() } });
  } catch (error) {
    console.error('更新群组名称失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 退出群组
 * DELETE /api/v1/groups/leave
 */
router.delete('/leave', async (req, res) => {
  try {
    const client = getSupabaseClient();
    const { userId, error } = await getUserId(req, client);

    if (!userId) {
      return res.status(401).json({ error: error || '请先登录' });
    }

    // 获取用户的群组成员信息
    const { data: membership } = await client
      .from('group_members')
      .select('*, groups(*), users(name)')
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return res.status(400).json({ error: '未加入群组' });
    }

    const group = membership.groups as any;
    const user = membership.users as any;

    // 发送退出系统消息
    await client
      .from('group_messages')
      .insert({
        group_id: membership.group_id,
        user_id: userId,
        content: `${user?.name || '用户'} 退出了群组`,
        type: 'system',
      });

    // 删除成员记录
    await client
      .from('group_members')
      .delete()
      .eq('id', membership.id);

    // 如果是群主退出，需要处理群主转移或解散群组
    if (group && group.created_by === userId) {
      // 查找群组其他成员
      const { data: otherMembers } = await client
        .from('group_members')
        .select('user_id')
        .eq('group_id', group.id)
        .order('joined_at', { ascending: true })
        .limit(1);

      if (otherMembers && otherMembers.length > 0) {
        // 将群主转给最早的成员
        await client
          .from('groups')
          .update({ created_by: otherMembers[0].user_id })
          .eq('id', group.id);
        
        // 更新新群主的角色
        await client
          .from('group_members')
          .update({ role: 'owner' })
          .eq('user_id', otherMembers[0].user_id)
          .eq('group_id', group.id);
      } else {
        // 没有其他成员，删除群组
        await client
          .from('group_messages')
          .delete()
          .eq('group_id', group.id);
        await client
          .from('groups')
          .delete()
          .eq('id', group.id);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('退出群组失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 踢出群组成员
 * DELETE /api/v1/groups/members/:targetUserId
 */
router.delete('/members/:targetUserId', async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const client = getSupabaseClient();
    const { userId, error } = await getUserId(req, client);

    if (!userId) {
      return res.status(401).json({ error: error || '请先登录' });
    }

    // 获取操作者的群组成员信息
    const { data: operatorMembership } = await client
      .from('group_members')
      .select('*, groups(*)')
      .eq('user_id', userId)
      .single();

    if (!operatorMembership) {
      return res.status(400).json({ error: '未加入群组' });
    }

    // 只有群主可以踢人
    if (operatorMembership.role !== 'owner') {
      return res.status(403).json({ error: '只有群组创建人可以踢出成员' });
    }

    // 不能踢自己
    if (parseInt(targetUserId) === userId) {
      return res.status(400).json({ error: '不能踢出自己，请使用退出群组功能' });
    }

    // 获取被踢成员信息
    const { data: targetMembership } = await client
      .from('group_members')
      .select('*, users(name)')
      .eq('user_id', targetUserId)
      .eq('group_id', operatorMembership.group_id)
      .single();

    if (!targetMembership) {
      return res.status(404).json({ error: '该成员不在群组中' });
    }

    const targetUser = targetMembership.users as any;

    // 发送系统消息
    await client
      .from('group_messages')
      .insert({
        group_id: operatorMembership.group_id,
        user_id: userId,
        content: `${targetUser?.name || '用户'} 已被移出群组`,
        type: 'system',
      });

    // 删除成员记录
    await client
      .from('group_members')
      .delete()
      .eq('id', targetMembership.id);

    res.json({ success: true });
  } catch (error) {
    console.error('踢出成员失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 获取群组信息
 * GET /api/v1/groups/current
 */
router.get('/current', async (req, res) => {
  try {
    const client = getSupabaseClient();
    const { userId, error } = await getUserId(req, client);

    if (!userId) {
      return res.json({ success: true, data: null, isLoggedIn: false });
    }

    // 获取用户的群组成员信息
    const { data: membership } = await client
      .from('group_members')
      .select('role, joined_at, groups(*)')
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return res.json({ success: true, data: null });
    }

    const group = membership.groups as any;

    // 获取群组成员列表
    const { data: members } = await client
      .from('group_members')
      .select('id, role, joined_at, users(id, name, avatar_url)')
      .eq('group_id', group.id);

    res.json({ 
      success: true, 
      data: {
        ...group,
        members: members || [],
        role: membership.role,
        isCreator: group?.created_by === userId,
      },
      isLoggedIn: true,
    });
  } catch (error) {
    console.error('获取群组信息失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 获取群组消息
 * GET /api/v1/groups/messages
 * Query: limit, excludeTypes (逗号分隔的消息类型，如 "workout_record,daily_summary")
 */
router.get('/messages', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const excludeTypes = (req.query.excludeTypes as string)?.split(',').filter(Boolean) || [];
    const client = getSupabaseClient();
    const { userId, error } = await getUserId(req, client);

    if (!userId) {
      return res.json({ success: true, data: [], isLoggedIn: false });
    }

    // 获取用户的群组
    const { data: membership } = await client
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return res.json({ success: true, data: [] });
    }

    // 构建查询
    let query = client
      .from('group_messages')
      .select('*')
      .eq('group_id', membership.group_id);

    // 如果有排除的消息类型，添加过滤条件
    if (excludeTypes.length > 0) {
      // Supabase 不支持 not.in，需要用 neq 逐个排除或者用 or
      // 这里使用 .not('type', 'in', excludeTypes)
      query = query.not('type', 'in', `(${excludeTypes.join(',')})`);
    }

    // 获取消息
    const { data: messages, error: msgError } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (msgError) {
      console.error('获取消息失败:', msgError);
      return res.status(500).json({ error: '获取消息失败' });
    }

    // 获取消息用户信息
    const userIds = [...new Set(messages?.map(m => m.user_id).filter(Boolean) || [])];
    const { data: users } = userIds.length > 0 ? await client
      .from('users')
      .select('id, name, avatar_url')
      .in('id', userIds) : { data: [] };

    const userMap = (users || []).reduce((acc, u) => {
      acc[u.id] = u;
      return acc;
    }, {} as Record<number, any>);

    const messagesWithUser = (messages || []).reverse().map(m => ({
      ...m,
      user: userMap[m.user_id] || { name: '系统' },
    }));

    res.json({ success: true, data: messagesWithUser });
  } catch (error) {
    console.error('获取消息失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 发送消息
 * POST /api/v1/groups/messages
 * Body: { content: string, type?: string, photoUrl?: string, workoutData?: object }
 */
router.post('/messages', async (req, res) => {
  try {
    const { content, type = 'text', photoUrl, workoutData } = req.body;
    const client = getSupabaseClient();
    const { userId, error } = await getUserId(req, client);

    if (!userId) {
      return res.status(401).json({ error: error || '请先登录' });
    }

    if (!content) {
      return res.status(400).json({ error: '消息内容不能为空' });
    }

    // 获取用户的群组
    const { data: membership } = await client
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return res.status(400).json({ error: '未加入群组' });
    }

    // 发送消息
    const messageData: any = {
      group_id: membership.group_id,
      user_id: userId,
      content,
      type,
    };

    if (photoUrl) {
      messageData.photo_url = photoUrl;
    }

    if (workoutData) {
      messageData.workout_data = workoutData;
    }

    const { data: message, error: insertError } = await client
      .from('group_messages')
      .insert(messageData)
      .select()
      .single();

    if (insertError) {
      console.error('发送消息失败:', insertError);
      return res.status(500).json({ error: '发送消息失败' });
    }

    // 获取用户名
    const { data: user } = await client
      .from('users')
      .select('name')
      .eq('id', userId)
      .single();

    res.json({ success: true, data: { ...message, user: { name: user?.name || '未知用户' } } });
  } catch (error) {
    console.error('发送消息失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 撤回消息
 * DELETE /api/v1/groups/messages/:messageId
 * 规则：只能撤回自己发送的消息，且在1分钟内
 */
router.delete('/messages/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const client = getSupabaseClient();
    const { userId, error } = await getUserId(req, client);

    if (!userId) {
      return res.status(401).json({ error: error || '请先登录' });
    }

    // 获取消息
    const { data: message, error: msgError } = await client
      .from('group_messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (msgError || !message) {
      return res.status(404).json({ error: '消息不存在' });
    }

    // 检查是否是自己的消息
    if (message.user_id !== userId) {
      return res.status(403).json({ error: '只能撤回自己发送的消息' });
    }

    // 检查是否在1分钟内
    const messageTime = new Date(message.created_at).getTime();
    const now = Date.now();
    const oneMinute = 60 * 1000;

    if (now - messageTime > oneMinute) {
      return res.status(400).json({ error: '只能撤回1分钟内发送的消息' });
    }

    // 删除消息
    const { error: deleteError } = await client
      .from('group_messages')
      .delete()
      .eq('id', messageId);

    if (deleteError) {
      console.error('撤回消息失败:', deleteError);
      return res.status(500).json({ error: '撤回消息失败' });
    }

    res.json({ success: true, message: '消息已撤回' });
  } catch (error) {
    console.error('撤回消息失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 获取群组日历数据（群内所有人的打卡记录）
 * GET /api/v1/groups/calendar
 * Query: year, month
 */
router.get('/calendar', async (req, res) => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const client = getSupabaseClient();
    const { userId, error } = await getUserId(req, client);

    if (!userId) {
      return res.json({ success: true, data: { members: [], records: [], totalStats: [] }, isLoggedIn: false });
    }

    // 获取用户的群组
    const { data: membership } = await client
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return res.json({ success: true, data: { members: [], records: [], totalStats: [] } });
    }

    // 获取群组成员
    const { data: members } = await client
      .from('group_members')
      .select('user_id, users(id, name)')
      .eq('group_id', membership.group_id);

    if (!members || members.length === 0) {
      return res.json({ success: true, data: { members: [], records: [], totalStats: [] } });
    }

    // 获取所有成员的用户ID（转换为字符串）
    const userIdStrings = members
      .map(m => String((m.users as any)?.id || m.user_id))
      .filter(id => id && id !== 'undefined');

    // 构建月份日期范围
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

    console.log('获取群组日历数据:', { userIdStrings, startDate, endDate });

    // 获取群组所有成员的运动记录（本月）
    const userIdNumbers = userIdStrings.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    
    let records: any[] = [];
    let recordsError: any = null;
    
    if (userIdNumbers.length > 0) {
      const result = await client
        .from('workout_records')
        .select('*')
        .in('user_id', userIdNumbers)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });
      
      records = result.data || [];
      recordsError = result.error;
      
      if (!recordsError && records.length === 0) {
        const strResult = await client
          .from('workout_records')
          .select('*')
          .in('user_id', userIdStrings)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: true });
        
        if (strResult.data && strResult.data.length > 0) {
          records = strResult.data;
        }
      }
    }

    if (recordsError) {
      console.error('获取群组日历数据失败:', recordsError);
      return res.status(500).json({ error: '获取日历数据失败' });
    }

    // 获取所有时间的打卡统计（用于总排行）
    let allTimeRecords: any[] = [];
    if (userIdNumbers.length > 0) {
      const allTimeResult = await client
        .from('workout_records')
        .select('user_id, date, duration, calories')
        .in('user_id', userIdNumbers);
      
      allTimeRecords = allTimeResult.data || [];
    }

    // 构建用户映射
    const memberMap = members.reduce((acc, m) => {
      const user = m.users as any;
      if (user && user.id) {
        acc[String(user.id)] = { id: user.id, name: user.name };
        acc[user.id] = { id: user.id, name: user.name };
      }
      return acc;
    }, {} as Record<string | number, { id: number; name: string }>);

    // 为记录添加用户信息
    const recordsWithUser = (records || []).map(r => {
      // 处理 photo_urls：确保它是数组格式
      let photoUrls = r.photo_urls;
      if (typeof photoUrls === 'string') {
        try {
          photoUrls = JSON.parse(photoUrls);
        } catch (e) {
          // 如果解析失败，尝试其他格式
          if (photoUrls.startsWith('[') && photoUrls.endsWith(']')) {
            // PostgreSQL 数组格式：[url1 url2]
            photoUrls = photoUrls.slice(1, -1).split(' ').filter((u: string) => u.trim());
          } else {
            photoUrls = [];
          }
        }
      }
      
      return {
        ...r,
        photo_urls: photoUrls,
        user: memberMap[r.user_id] || { name: '未知用户' },
      };
    });

    // 计算总打卡排行
    const totalStatsMap = new Map<number, { count: number; totalDuration: number; totalCalories: number }>();
    allTimeRecords.forEach(r => {
      const uid = parseInt(String(r.user_id), 10);
      if (!totalStatsMap.has(uid)) {
        totalStatsMap.set(uid, { count: 0, totalDuration: 0, totalCalories: 0 });
      }
      const stat = totalStatsMap.get(uid)!;
      stat.count++; // 这里记录的是打卡次数，不是天数
      stat.totalDuration += r.duration || 0;
      stat.totalCalories += r.calories || 0;
    });

    // 计算每个用户唯一打卡天数
    const userDatesMap = new Map<number, Set<string>>();
    allTimeRecords.forEach(r => {
      const uid = parseInt(String(r.user_id), 10);
      if (!userDatesMap.has(uid)) {
        userDatesMap.set(uid, new Set());
      }
      userDatesMap.get(uid)!.add(r.date);
    });

    // 构建总打卡排行数据
    const totalStats = members
      .map(m => {
        const user = m.users as any;
        const uid = user?.id;
        const stat = totalStatsMap.get(uid) || { count: 0, totalDuration: 0, totalCalories: 0 };
        const dates = userDatesMap.get(uid) || new Set();
        return {
          id: uid,
          name: user?.name || '未知用户',
          totalDays: dates.size, // 总打卡天数
          totalCount: stat.count, // 总打卡次数
          totalDuration: stat.totalDuration,
          totalCalories: stat.totalCalories,
        };
      })
      .sort((a, b) => {
        if (b.totalDays !== a.totalDays) return b.totalDays - a.totalDays;
        if (b.totalDuration !== a.totalDuration) return b.totalDuration - a.totalDuration;
        return b.totalCalories - a.totalCalories;
      });

    console.log('群组日历数据结果:', { 
      memberCount: members.length, 
      recordCount: recordsWithUser.length,
      totalStatsCount: totalStats.length 
    });

    res.json({ 
      success: true, 
      data: { 
        members: members.map(m => {
          const user = m.users as any;
          return { id: user?.id, name: user?.name };
        }).filter((m): m is { id: number; name: string } => m.id !== undefined && m.id !== null),
        records: recordsWithUser,
        totalStats,
      } 
    });
  } catch (error) {
    console.error('获取群组日历数据失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 获取群组成员的运动记录
 * GET /api/v1/groups/members/:userId/records
 */
router.get('/members/:targetUserId/records', async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const client = getSupabaseClient();
    const { userId, error } = await getUserId(req, client);

    if (!userId) {
      return res.status(401).json({ error: error || '请先登录' });
    }

    // 获取当前用户的群组
    const { data: membership } = await client
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return res.status(400).json({ error: '未加入群组' });
    }

    // 验证目标用户是否在同群组
    const { data: targetMembership } = await client
      .from('group_members')
      .select('*, users(name)')
      .eq('user_id', targetUserId)
      .eq('group_id', membership.group_id)
      .single();

    if (!targetMembership) {
      return res.status(403).json({ error: '无权查看该用户记录' });
    }

    // 获取用户的运动记录
    const { data: records, error: recordsError } = await client
      .from('workout_records')
      .select('*')
      .eq('user_id', targetUserId)
      .order('date', { ascending: false })
      .limit(30);

    if (recordsError) {
      console.error('获取运动记录失败:', recordsError);
      return res.status(500).json({ error: '获取运动记录失败' });
    }

    const targetUser = targetMembership.users as any;
    res.json({ success: true, data: records || [], userName: targetUser?.name });
  } catch (error) {
    console.error('获取运动记录失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router;
