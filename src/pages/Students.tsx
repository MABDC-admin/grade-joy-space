import { Card } from '@/components/ui/card';
import { Users } from 'lucide-react';

export default function Students() {
  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="font-display text-2xl font-medium">Students</h1>
        <p className="text-sm text-muted-foreground">
          View and manage students across your classes
        </p>
      </div>

      <Card className="flex flex-col items-center justify-center py-16">
        <Users className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 font-display text-lg font-medium">Student Directory</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a class to view its enrolled students
        </p>
      </Card>
    </div>
  );
}
