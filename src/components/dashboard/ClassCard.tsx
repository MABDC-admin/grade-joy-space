import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, FileText, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface ClassCardProps {
  id: string;
  name: string;
  section?: string | null;
  subject?: string | null;
  teacherName?: string;
  teacherAvatar?: string | null;
  studentCount?: number;
  assignmentCount?: number;
  color?: string;
  classCode?: string;
}

const colorVariants: Record<string, string> = {
  green: 'class-card-gradient-green',
  blue: 'class-card-gradient-blue',
  orange: 'class-card-gradient-orange',
  purple: 'class-card-gradient-purple',
  teal: 'class-card-gradient-teal',
};

export function ClassCard({
  id,
  name,
  section,
  subject,
  teacherName,
  teacherAvatar,
  studentCount = 0,
  assignmentCount = 0,
  color = 'green',
  classCode,
}: ClassCardProps) {
  const navigate = useNavigate();
  const gradientClass = colorVariants[color] || colorVariants.green;

  return (
    <Card 
      className="group cursor-pointer overflow-hidden shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
      onClick={() => navigate(`/class/${id}`)}
    >
      {/* Header with gradient */}
      <div className={cn('relative h-24 p-4', gradientClass)}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="truncate font-display text-lg font-medium text-white">
              {name}
            </h3>
            {section && (
              <p className="truncate text-sm text-white/80">{section}</p>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-white/80 hover:bg-white/10 hover:text-white"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View class</DropdownMenuItem>
              <DropdownMenuItem>Copy class code</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Teacher avatar - positioned at bottom right of header */}
        <div className="absolute -bottom-6 right-4">
          <Avatar className="h-14 w-14 border-2 border-card shadow-md">
            <AvatarImage src={teacherAvatar || undefined} />
            <AvatarFallback className="bg-secondary text-secondary-foreground">
              {teacherName?.charAt(0) || 'T'}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 pt-3">
        {subject && (
          <p className="text-sm text-muted-foreground">{subject}</p>
        )}
        {teacherName && (
          <p className="mt-1 text-sm font-medium">{teacherName}</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t px-4 py-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span>{assignmentCount} Assignments</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{studentCount} Students</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
