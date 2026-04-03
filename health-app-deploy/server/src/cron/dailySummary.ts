import cron from 'node-cron';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 获取昨日的日期字符串 YYYY-MM-DD
 */
function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

/**
 * 格式化日期为中文格式
 */
function formatDateChinese(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}年${month}月${day}日`;
}

/**
 * 发送每日总结消息到所有群组
 */
async function sendDailySummary() {
  console.log('[Daily Summary] 开始发送每日总结...');
  
  try {
    const client = getSupabaseClient();
    const yesterday = getYesterdayDate();
    
    // 获取所有群组
    const { data: groups, error: groupsError } = await client
      .from('groups')
      .select('id, name');
    
    if (groupsError) {
      console.error('[Daily Summary] 获取群组失败:', groupsError);
      return;
    }
    
    if (!groups || groups.length === 0) {
      console.log('[Daily Summary] 没有群组');
      return;
    }
    
    // 对每个群组发送总结
    for (const group of groups) {
      // 通过 group_members 表获取群组成员的用户ID
      const { data: memberships, error: membersError } = await client
        .from('group_members')
        .select('user_id, users(id, name)')
        .eq('group_id', group.id);
      
      if (membersError) {
        console.error('[Daily Summary] 获取群组成员失败:', membersError);
        continue;
      }
      
      if (!memberships || memberships.length === 0) {
        console.log(`[Daily Summary] 群组 ${group.id} 没有成员`);
        continue;
      }
      
      // 提取用户ID列表
      const userIds = memberships
        .map(m => {
          const user = m.users as any;
          return user?.id;
        })
        .filter(id => id !== undefined && id !== null);
      
      // 创建用户ID到用户名的映射
      const userIdMap = memberships.reduce((acc, m) => {
        const user = m.users as any;
        if (user?.id) {
          acc[String(user.id)] = user.name || '未知用户';
        }
        return acc;
      }, {} as Record<string, string>);
      
      if (userIds.length === 0) {
        console.log(`[Daily Summary] 群组 ${group.id} 没有有效用户ID`);
        continue;
      }
      
      // 获取昨日打卡记录 - 使用数字类型和字符串类型都尝试
      let records: any[] = [];
      
      // 先尝试用数字ID查询
      const { data: numericRecords, error: recordsError1 } = await client
        .from('workout_records')
        .select('*')
        .in('user_id', userIds)
        .eq('date', yesterday);
      
      if (!recordsError1 && numericRecords && numericRecords.length > 0) {
        records = numericRecords;
      } else {
        // 再尝试用字符串ID查询
        const { data: stringRecords, error: recordsError2 } = await client
          .from('workout_records')
          .select('*')
          .in('user_id', userIds.map(String))
          .eq('date', yesterday);
        
        if (recordsError2) {
          console.error('[Daily Summary] 获取记录失败:', recordsError2);
          continue;
        }
        records = stringRecords || [];
      }
      
      // 统计打卡人数
      const uniqueUserIds = new Set(records?.map(r => r.user_id) || []);
      const checkInCount = uniqueUserIds.size;
      
      // 收集所有照片
      const allPhotos: { url: string; userName: string; type: string; duration: number }[] = [];
      records?.forEach(record => {
        const userName = userIdMap[String(record.user_id)] || '未知用户';
        const urls = record.photo_urls || (record.photo_url ? [record.photo_url] : []);
        urls.forEach((url: string) => {
          if (url) {
            allPhotos.push({
              url,
              userName,
              type: record.type,
              duration: record.duration,
            });
          }
        });
      });
      
      // 如果没有打卡记录，跳过该群组
      if (checkInCount === 0) {
        console.log(`[Daily Summary] 群组 ${group.id}(${group.name}) 昨日无人打卡，跳过`);
        continue;
      }
      
      // 发送总结消息
      const content = `${formatDateChinese(yesterday)} 群内 ${checkInCount} 人完成了运动打卡，请大家继续加油！`;
      
      const { error: messageError } = await client
        .from('group_messages')
        .insert({
          group_id: group.id,
          user_id: null, // 系统消息
          content,
          type: 'daily_summary',
          workout_data: {
            date: yesterday,
            checkInCount,
            photos: allPhotos,
            totalRecords: records?.length || 0,
          },
        });
      
      if (messageError) {
        console.error(`[Daily Summary] 群组 ${group.id} 发送消息失败:`, messageError);
      } else {
        console.log(`[Daily Summary] 群组 ${group.id}(${group.name}) 发送成功: ${checkInCount}人打卡, ${allPhotos.length}张照片`);
      }
    }
    
    console.log('[Daily Summary] 发送完成');
  } catch (error) {
    console.error('[Daily Summary] 发送异常:', error);
  }
}

/**
 * 启动每日总结定时任务
 * 每天早上9点执行
 */
export function startDailySummaryCron() {
  // 每天9点执行: 0 9 * * *
  // 测试用每分钟: * * * * *
  const task = cron.schedule('0 9 * * *', sendDailySummary, {
    timezone: 'Asia/Shanghai',
  });
  
  console.log('[Cron] 每日总结定时任务已启动 (每天9:00)');
  
  return task;
}

/**
 * 手动触发每日总结（用于测试）
 */
export async function triggerDailySummaryManually() {
  console.log('[Daily Summary] 手动触发');
  await sendDailySummary();
}
