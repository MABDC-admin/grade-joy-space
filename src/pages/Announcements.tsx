import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Megaphone, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { CreateAnnouncementDialog } from '@/components/announcements/CreateAnnouncementDialog';

interface Announcement {
  id: string;
  content: string;
  created_at: string;
  class_id: string;
  class_name: string;
  author: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export default function Announcements() {
  const { user, isAdmin, isTeacher } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, [user]);

  const fetchAnnouncements = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Get user's classes
      let classIds: string[] = [];
      
      if (isAdmin) {
        const { data } = await supabase.from('classes').select('id');
        classIds = data?.map(c => c.id) || [];
      } else if (isTeacher) {
        const { data: teacherClasses } = await supabase
          .from('class_teachers')
          .select('class_id')
          .eq('teacher_id', user.id);
        const { data: createdClasses } = await supabase
          .from('classes')
          .select('id')
          .eq('created_by', user.id);
        
        classIds = [
          ...(teacherClasses?.map(c => c.class_id) || []),
          ...(createdClasses?.map(c => c.id) || []),
        ];
      } else {
        const { data: memberClasses } = await supabase
          .from('class_members')
          .select('class_id')
          .eq('student_id', user.id);
        classIds = memberClasses?.map(c => c.class_id) || [];
      }

      if (classIds.length === 0) {
        setAnnouncements([]);
        setLoading(false);
        return;
      }

      // Fetch announcements
      const { data: announcementsData } = await supabase
        .from('announcements')
        .select(`
          id,
          content,
          created_at,
          class_id,
          author_id,
          classes (name)
        `)
        .in('class_id', classIds)
        .order('created_at', { ascending: false });

      if (!announcementsData) {
        setAnnouncements([]);
        setLoading(false);
        return;
      }

      // Fetch author profiles
      const authorIds = [...new Set(announcementsData.map(a => a.author_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', authorIds);

      const profileMap = new Map(
        profiles?.map(p => [p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url }])
      );

      setAnnouncements(
        announcementsData.map((a: any) => ({
          id: a.id,
          content: a.content,
          created_at: a.created_at,
          class_id: a.class_id,
          class_name: a.classes?.name || 'Unknown Class',
          author: a.author_id ? profileMap.get(a.author_id) || null : null,
        }))
      );
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'T';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const canCreate = isAdmin || isTeacher;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium">Announcements</h1>
          <p className="text-sm text-muted-foreground">
            View all announcements from your classes
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-full bg-muted rounded" />
                  <div className="h-3 w-2/3 bg-muted rounded" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : announcements.length > 0 ? (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id} className="p-4">
              <div className="flex gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={announcement.author?.avatar_url || ''} />
                  <AvatarFallback>
                    {getInitials(announcement.author?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">
                      {announcement.author?.full_name || 'Teacher'}
                    </span>
                    <span className="text-sm text-muted-foreground">•</span>
                    <span className="text-sm text-primary font-medium">
                      {announcement.class_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-foreground/80 whitespace-pre-wrap">
                    {announcement.content}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center py-16">
          <Megaphone className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 font-display text-lg font-medium">No announcements</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Announcements from your classes will appear here
          </p>
        </Card>
      )}

      <CreateAnnouncementDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
        onCreated={fetchAnnouncements}
      />
    </div>
  );
}
