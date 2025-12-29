import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface RealtimePayload {
  new: {
    id: string;
    title?: string;
    content?: string;
    class_id: string;
    type?: string;
  };
}

export function useRealtimeNotifications() {
  const { user, isStudent } = useAuth();
  const navigate = useNavigate();
  const enrolledClassIdsRef = useRef<string[]>([]);

  const fetchEnrolledClasses = useCallback(async () => {
    if (!user || !isStudent) return [];
    
    const { data } = await supabase
      .from('class_members')
      .select('class_id')
      .eq('student_id', user.id);
    
    return data?.map(m => m.class_id) || [];
  }, [user, isStudent]);

  const getClassName = useCallback(async (classId: string) => {
    const { data } = await supabase
      .from('classes')
      .select('name')
      .eq('id', classId)
      .maybeSingle();
    
    return data?.name || 'your class';
  }, []);

  useEffect(() => {
    if (!user || !isStudent) return;

    let classworkChannel: ReturnType<typeof supabase.channel> | null = null;
    let announcementChannel: ReturnType<typeof supabase.channel> | null = null;

    const setupChannels = async () => {
      const classIds = await fetchEnrolledClasses();
      enrolledClassIdsRef.current = classIds;

      if (classIds.length === 0) return;

      // Listen for new classwork items
      classworkChannel = supabase
        .channel('realtime-classwork')
        .on<RealtimePayload['new']>(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'classwork_items',
          },
          async (payload) => {
            const newItem = payload.new;
            
            // Only notify if it's for an enrolled class
            if (!enrolledClassIdsRef.current.includes(newItem.class_id)) return;
            
            const className = await getClassName(newItem.class_id);
            const isAssignment = newItem.type === 'assignment';
            
            toast(
              isAssignment ? '📝 New Assignment' : '📚 New Material',
              {
                description: `${newItem.title || 'New content'} in ${className}`,
                action: {
                  label: 'View',
                  onClick: () => navigate(
                    isAssignment 
                      ? `/assignment/${newItem.id}` 
                      : `/material/${newItem.id}`
                  ),
                },
                duration: 8000,
              }
            );
          }
        )
        .subscribe();

      // Listen for new announcements
      announcementChannel = supabase
        .channel('realtime-announcements')
        .on<RealtimePayload['new']>(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'announcements',
          },
          async (payload) => {
            const newAnnouncement = payload.new;
            
            // Only notify if it's for an enrolled class
            if (!enrolledClassIdsRef.current.includes(newAnnouncement.class_id)) return;
            
            const className = await getClassName(newAnnouncement.class_id);
            const preview = newAnnouncement.content 
              ? newAnnouncement.content.slice(0, 50) + (newAnnouncement.content.length > 50 ? '...' : '')
              : 'New announcement';
            
            toast(
              '📢 New Announcement',
              {
                description: `${preview} in ${className}`,
                action: {
                  label: 'View',
                  onClick: () => navigate(`/class/${newAnnouncement.class_id}`),
                },
                duration: 8000,
              }
            );
          }
        )
        .subscribe();
    };

    setupChannels();

    return () => {
      if (classworkChannel) supabase.removeChannel(classworkChannel);
      if (announcementChannel) supabase.removeChannel(announcementChannel);
    };
  }, [user, isStudent, fetchEnrolledClasses, getClassName, navigate]);

  // Re-fetch enrolled classes when they might have changed
  const refreshEnrolledClasses = useCallback(async () => {
    enrolledClassIdsRef.current = await fetchEnrolledClasses();
  }, [fetchEnrolledClasses]);

  return { refreshEnrolledClasses };
}
