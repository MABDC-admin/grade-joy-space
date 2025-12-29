import { Card } from '@/components/ui/card';
import { Megaphone } from 'lucide-react';

export default function Announcements() {
  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="font-display text-2xl font-medium">Announcements</h1>
        <p className="text-sm text-muted-foreground">
          View all announcements from your classes
        </p>
      </div>

      <Card className="flex flex-col items-center justify-center py-16">
        <Megaphone className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 font-display text-lg font-medium">No announcements</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Announcements from your classes will appear here
        </p>
      </Card>
    </div>
  );
}
