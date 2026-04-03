import express from 'express';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { calculateCalories } from '@/utils/calories';

const router = express.Router();

/**
 * 获取用户ID（优先 x-user-id，其次 x-device-id）
 */
async function getUserId(req: express.Request, client: any): Promise<string> {
  const userIdHeader = req.headers['x-user-id'] as string;
  const deviceId = req.headers['x-device-id'] as string;

  if (userIdHeader) {
    return String(userIdHeader);
  }

  if (deviceId) {
    const { data: user } = await client
      .from('users')
      .select('id')
      .eq('device_id', deviceId)
      .single();
    
    return user ? String(user.id) : deviceId;
  }

  return '';
}

/**
 * 创建运动记录
 * POST /api/v1/workouts
 * Body: { date: string, duration: number, type: string, photoUrl?: string, photoUrls?: string[] }
 */
router.post('/', async (req, res) => {
  try {
    const { date, duration, type, photoUrl, photoUrls } = req.body;
    const client = getSupabaseClient();
    const userId = await getUserId(req, client);

    if (!date || !duration || !type || !userId) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    // 检查当天是否已有打卡记录（每人每天只能打卡一次）
    const { data: existingRecord } = await client
      .from('workout_records')
      .select('id')
      .eq('user_id', userId)
      .eq('date', date)
      .single();

    if (existingRecord) {
      return res.status(400).json({ error: '今日已打卡，每人每天只能打卡一次' });
    }
    
    // 优先使用photoUrls数组，否则使用photoUrl
    const finalPhotoUrls = photoUrls && photoUrls.length > 0 ? photoUrls : (photoUrl ? [photoUrl] : []);
    
    // 计算卡路里消耗
    const calories = calculateCalories(type, duration);
    
    // 创建运动记录
    const { data, error } = await client
      .from('workout_records')
      .insert({
        user_id: userId,
        date,
        duration,
        type,
        photo_url: finalPhotoUrls[0] || null,
        photo_urls: finalPhotoUrls,
        calories,
      })
      .select()
      .single();

    if (error) {
      console.error('创建运动记录失败:', error);
      return res.status(500).json({ error: '创建运动记录失败' });
    }

    // 获取用户信息并发送群组消息
    const { data: user } = await client
      .from('users')
      .select('*')
      .eq('id', parseInt(userId, 10))
      .single();

    if (user) {
      // 获取用户的群组
      const { data: membership } = await client
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id)
        .single();

      if (membership) {
        // 发送群组消息，包含运动详情
        await client
          .from('group_messages')
          .insert({
            group_id: membership.group_id,
            user_id: user.id,
            content: `${user.name} 完成了今日运动打卡`,
            type: 'workout_record',
            workout_data: {
              type,
              duration,
              photoUrl: finalPhotoUrls[0] || null,
              photoUrls: finalPhotoUrls,
              date,
              calories,
            },
          });
      }
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('创建运动记录异常:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 查询所有运动记录
 * GET /api/v1/workouts
 */
router.get('/', async (req, res) => {
  try {
    const client = getSupabaseClient();
    const userId = await getUserId(req, client);

    if (!userId) {
      return res.status(400).json({ error: '缺少用户标识' });
    }

    const { data, error } = await client
      .from('workout_records')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      console.error('查询运动记录失败:', error);
      return res.status(500).json({ error: '查询运动记录失败' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('查询运动记录异常:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 按日期查询运动记录
 * GET /api/v1/workouts/date/:date
 */
router.get('/date/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const client = getSupabaseClient();
    const userId = await getUserId(req, client);

    if (!userId) {
      return res.status(400).json({ error: '缺少用户标识' });
    }

    const { data, error } = await client
      .from('workout_records')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date);

    if (error) {
      console.error('查询运动记录失败:', error);
      return res.status(500).json({ error: '查询运动记录失败' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('查询运动记录异常:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 更新运动记录
 * PUT /api/v1/workouts/:id
 * Body: { date?: string, duration?: number, type?: string }
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, duration, type } = req.body;
    const client = getSupabaseClient();
    const userId = await getUserId(req, client);

    if (!userId) {
      return res.status(400).json({ error: '缺少用户标识' });
    }

    const updateData: any = {};
    if (date) updateData.date = date;
    if (duration) updateData.duration = duration;
    if (type) updateData.type = type;
    
    // 如果duration或type发生变化，重新计算卡路里
    if (duration || type) {
      const finalDuration = duration || (await client
        .from('workout_records')
        .select('duration, type')
        .eq('id', id)
        .single()).data?.duration;
      
      const finalType = type || (await client
        .from('workout_records')
        .select('type')
        .eq('id', id)
        .single()).data?.type;
      
      if (finalDuration && finalType) {
        updateData.calories = calculateCalories(finalType, finalDuration);
      }
    }

    const { data, error } = await client
      .from('workout_records')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('更新运动记录失败:', error);
      return res.status(500).json({ error: '更新运动记录失败' });
    }

    if (!data) {
      return res.status(404).json({ error: '运动记录不存在' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('更新运动记录异常:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 删除运动记录
 * DELETE /api/v1/workouts/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClient();
    const userId = await getUserId(req, client);

    if (!userId) {
      return res.status(400).json({ error: '缺少用户标识' });
    }

    // 1. 先获取运动记录信息（用于删除对应的群组消息）
    const { data: workoutRecord } = await client
      .from('workout_records')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!workoutRecord) {
      return res.status(404).json({ error: '运动记录不存在' });
    }

    // 2. 删除运动记录
    const { error } = await client
      .from('workout_records')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('删除运动记录失败:', error);
      return res.status(500).json({ error: '删除运动记录失败' });
    }

    // 3. 删除群组消息中对应的打卡通知
    // 查找用户所在的群组
    const { data: membership } = await client
      .from('group_members')
      .select('group_id')
      .eq('user_id', parseInt(userId, 10))
      .single();

    if (membership) {
      const userIntId = parseInt(userId, 10);
      const groupId = membership.group_id;
      const dateStr = workoutRecord.date;
      
      // 方案：先查询所有该用户的 workout_record 消息，再在 JS 中过滤日期匹配的
      const { data: userMessages, error: queryError } = await client
        .from('group_messages')
        .select('id, workout_data')
        .eq('group_id', groupId)
        .eq('user_id', userIntId)
        .eq('type', 'workout_record');

      if (!queryError && userMessages && userMessages.length > 0) {
        // 过滤出日期匹配的消息
        const idsToDelete = userMessages
          .filter((m: any) => m.workout_data?.date === dateStr)
          .map((m: any) => m.id);
        
        if (idsToDelete.length > 0) {
          const { error: deleteError } = await client
            .from('group_messages')
            .delete()
            .in('id', idsToDelete);
          
          if (deleteError) {
            console.error('删除workout_record消息失败:', deleteError);
          } else {
            console.log(`已删除用户 ${userIntId} 日期 ${dateStr} 的 ${idsToDelete.length} 条 workout_record 消息`);
          }
        }
      }

      // 检查当天是否还有其他用户的运动记录，如果没有则删除 daily_summary
      const { data: remainingRecords } = await client
        .from('workout_records')
        .select('id')
        .eq('date', dateStr);

      if (!remainingRecords || remainingRecords.length === 0) {
        // 当天没有任何运动记录，删除 daily_summary 消息
        const { data: summaryMessages } = await client
          .from('group_messages')
          .select('id, workout_data')
          .eq('group_id', groupId)
          .eq('type', 'daily_summary');

        if (summaryMessages && summaryMessages.length > 0) {
          const summaryIdsToDelete = summaryMessages
            .filter((m: any) => m.workout_data?.date === dateStr)
            .map((m: any) => m.id);

          if (summaryIdsToDelete.length > 0) {
            const { error: summaryError } = await client
              .from('group_messages')
              .delete()
              .in('id', summaryIdsToDelete);

            if (summaryError) {
              console.error('删除daily_summary消息失败:', summaryError);
            } else {
              console.log(`已删除日期 ${dateStr} 的 ${summaryIdsToDelete.length} 条 daily_summary 消息`);
            }
          }
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('删除运动记录异常:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 清理孤立的群组消息
 * POST /api/v1/workouts/cleanup-orphaned-messages
 * 删除没有对应运动记录的 workout_record 和 daily_summary 消息
 */
router.post('/cleanup-orphaned-messages', async (req, res) => {
  try {
    const client = getSupabaseClient();
    const results = {
      deletedWorkoutRecords: 0,
      deletedDailySummaries: 0,
      errors: [] as string[],
    };

    // 1. 获取所有运动记录的日期和用户组合
    const { data: allWorkoutRecords } = await client
      .from('workout_records')
      .select('id, user_id, date');

    // 创建有效记录的 Set（用于快速查找）
    const validRecords = new Set<string>();
    const validDates = new Set<string>();
    
    if (allWorkoutRecords) {
      allWorkoutRecords.forEach((r: any) => {
        validRecords.add(`${r.user_id}_${r.date}`);
        validDates.add(r.date);
      });
    }

    // 2. 获取所有 workout_record 类型的群组消息
    const { data: allWorkoutMessages } = await client
      .from('group_messages')
      .select('id, user_id, workout_data')
      .eq('type', 'workout_record');

    if (allWorkoutMessages && allWorkoutMessages.length > 0) {
      // 找出孤立的消息
      const orphanedIds: number[] = [];
      
      allWorkoutMessages.forEach((msg: any) => {
        const date = msg.workout_data?.date;
        const userId = msg.user_id;
        
        if (!date || !validRecords.has(`${userId}_${date}`)) {
          orphanedIds.push(msg.id);
        }
      });

      // 删除孤立消息
      if (orphanedIds.length > 0) {
        const { error: deleteError } = await client
          .from('group_messages')
          .delete()
          .in('id', orphanedIds);

        if (deleteError) {
          results.errors.push(`删除workout_record消息失败: ${deleteError.message}`);
        } else {
          results.deletedWorkoutRecords = orphanedIds.length;
          console.log(`清理了 ${orphanedIds.length} 条孤立的 workout_record 消息`);
        }
      }
    }

    // 3. 获取所有 daily_summary 类型的群组消息
    const { data: allSummaryMessages } = await client
      .from('group_messages')
      .select('id, workout_data')
      .eq('type', 'daily_summary');

    if (allSummaryMessages && allSummaryMessages.length > 0) {
      // 找出孤立的 daily_summary 消息
      const orphanedSummaryIds: number[] = [];
      
      allSummaryMessages.forEach((msg: any) => {
        const date = msg.workout_data?.date;
        
        if (!date || !validDates.has(date)) {
          orphanedSummaryIds.push(msg.id);
        }
      });

      // 删除孤立消息
      if (orphanedSummaryIds.length > 0) {
        const { error: deleteError } = await client
          .from('group_messages')
          .delete()
          .in('id', orphanedSummaryIds);

        if (deleteError) {
          results.errors.push(`删除daily_summary消息失败: ${deleteError.message}`);
        } else {
          results.deletedDailySummaries = orphanedSummaryIds.length;
          console.log(`清理了 ${orphanedSummaryIds.length} 条孤立的 daily_summary 消息`);
        }
      }
    }

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('清理孤立消息异常:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router;
