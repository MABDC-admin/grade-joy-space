import { Card, CardContent } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';

export default function Classwork() {
  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="font-display text-2xl font-medium">Classwork</h1>
        <p className="text-sm text-muted-foreground">
          View all your assignments and materials across classes
        </p>
      </div>

      <Card className="flex flex-col items-center justify-center py-16">
        <BookOpen className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 font-display text-lg font-medium">All caught up!</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a class from the dashboard to view classwork
        </p>
      </Card>
    </div>
  );
}
