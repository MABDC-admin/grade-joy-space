import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UnreadCounts {
  classwork: number;
  announcements: number;
  byClass: Record<string, { classwork: number; announcements: number }>;
}

export function useUnreadContent() {
  const { user, isStudent } = useAuth();
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({
    classwork: 0,
    announcements: 0,
    byClass: {},
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isStudent) {
      setLoading(false);
      return;
    }

    fetchUnreadCounts();

    // Subscribe to realtime changes
    const classworkChannel = supabase
      .channel('classwork-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'classwork_items' }, () => {
        fetchUnreadCounts();
      })
      .subscribe();

    const announcementChannel = supabase
      .channel('announcement-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, () => {
        fetchUnreadCounts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(classworkChannel);
      supabase.removeChannel(announcementChannel);
    };
  }, [user, isStudent]);

  const fetchUnreadCounts = async () => {
    if (!user) return;

    try {
      // Get user's enrolled classes
      const { data: memberships } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('student_id', user.id);

      if (!memberships || memberships.length === 0) {
        setUnreadCounts({ classwork: 0, announcements: 0, byClass: {} });
        setLoading(false);
        return;
      }

      const classIds = memberships.map((m) => m.class_id);

      // Get read items
      const { data: readItems } = await supabase
        .from('notification_reads')
        .select('content_id, content_type')
        .eq('user_id', user.id);

      const readClassworkIds = new Set(
        readItems?.filter((r) => r.content_type === 'classwork').map((r) => r.content_id) || []
      );
      const readAnnouncementIds = new Set(
        readItems?.filter((r) => r.content_type === 'announcement').map((r) => r.content_id) || []
      );

      // Get all classwork and announcements for enrolled classes
      const { data: classworkItems } = await supabase
        .from('classwork_items')
        .select('id, class_id')
        .in('class_id', classIds);

      const { data: announcements } = await supabase
        .from('announcements')
        .select('id, class_id')
        .in('class_id', classIds);

      // Calculate unread counts
      const byClass: Record<string, { classwork: number; announcements: number }> = {};
      let totalClasswork = 0;
      let totalAnnouncements = 0;

      classIds.forEach((classId) => {
        const unreadClasswork = (classworkItems || []).filter(
          (item) => item.class_id === classId && !readClassworkIds.has(item.id)
        ).length;
        const unreadAnnouncements = (announcements || []).filter(
          (item) => item.class_id === classId && !readAnnouncementIds.has(item.id)
        ).length;

        byClass[classId] = { classwork: unreadClasswork, announcements: unreadAnnouncements };
        totalClasswork += unreadClasswork;
        totalAnnouncements += unreadAnnouncements;
      });

      setUnreadCounts({
        classwork: totalClasswork,
        announcements: totalAnnouncements,
        byClass,
      });
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (contentId: string, contentType: 'classwork' | 'announcement') => {
    if (!user) return;

    await supabase.from('notification_reads').upsert({
      user_id: user.id,
      content_id: contentId,
      content_type: contentType,
    });

    fetchUnreadCounts();
  };

  return { unreadCounts, loading, markAsRead, refetch: fetchUnreadCounts };
}
