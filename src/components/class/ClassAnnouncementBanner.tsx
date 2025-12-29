import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Megaphone, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface Announcement {
  id: string;
  content: string;
  created_at: string;
  author: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface ClassAnnouncementBannerProps {
  classId: string;
}

export function ClassAnnouncementBanner({ classId }: ClassAnnouncementBannerProps) {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetchLatestAnnouncement();
  }, [classId]);

  const fetchLatestAnnouncement = async () => {
    const { data } = await supabase
      .from('announcements')
      .select(`
        id,
        content,
        created_at,
        author_id
      `)
      .eq('class_id', classId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      // Fetch author profile separately
      let authorProfile = null;
      if (data.author_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('user_id', data.author_id)
          .single();
        authorProfile = profile;
      }

      setAnnouncement({
        ...data,
        author: authorProfile,
      });
    }
  };

  if (!announcement || dismissed) return null;

  const getInitials = (name: string | null) => {
    if (!name) return 'T';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const truncatedContent = announcement.content.length > 150 
    ? `${announcement.content.slice(0, 150)}...` 
    : announcement.content;

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/10 rounded-full">
          <Megaphone className="h-4 w-4 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Avatar className="h-6 w-6">
              <AvatarImage src={announcement.author?.avatar_url || ''} />
              <AvatarFallback className="text-xs">
                {getInitials(announcement.author?.full_name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">
              {announcement.author?.full_name || 'Teacher'}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
            </span>
          </div>
          
          <p className="text-sm text-foreground/80">
            {expanded ? announcement.content : truncatedContent}
          </p>
          
          {announcement.content.length > 150 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 h-auto p-0 text-primary"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>Show less <ChevronUp className="h-4 w-4 ml-1" /></>
              ) : (
                <>Show more <ChevronDown className="h-4 w-4 ml-1" /></>
              )}
            </Button>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
