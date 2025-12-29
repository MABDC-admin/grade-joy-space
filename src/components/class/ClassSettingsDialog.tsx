import { useState, useRef, ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Check, RefreshCw, Upload, Image, Palette } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ClassSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classData: {
    id: string;
    name: string;
    section?: string | null;
    subject?: string | null;
    description?: string | null;
    class_code: string;
    color?: string | null;
    banner_url?: string | null;
  };
  onUpdate: () => void;
}

const colorOptions = [
  { name: 'Green', value: 'green' },
  { name: 'Blue', value: 'blue' },
  { name: 'Purple', value: 'purple' },
  { name: 'Red', value: 'red' },
  { name: 'Orange', value: 'orange' },
  { name: 'Teal', value: 'teal' },
];

export function ClassSettingsDialog({ open, onOpenChange, classData, onUpdate }: ClassSettingsDialogProps) {
  const [formData, setFormData] = useState({
    name: classData.name,
    section: classData.section || '',
    subject: classData.subject || '',
    description: classData.description || '',
    color: classData.color || 'green',
  });
  const [codeCopied, setCodeCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [bannerUrl, setBannerUrl] = useState(classData.banner_url || '');
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(classData.class_code);
    setCodeCopied(true);
    toast.success('Class code copied!');
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleResetCode = async () => {
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { error } = await supabase
      .from('classes')
      .update({ class_code: newCode })
      .eq('id', classData.id);

    if (error) {
      toast.error('Failed to reset class code');
    } else {
      toast.success('Class code has been reset');
      onUpdate();
    }
  };

  const handleBannerUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploadingBanner(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `${classData.id}/banner.${fileExt}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('class-materials')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('class-materials')
        .getPublicUrl(filePath);

      const newBannerUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      
      const { error: updateError } = await supabase
        .from('classes')
        .update({ banner_url: newBannerUrl })
        .eq('id', classData.id);

      if (updateError) throw updateError;

      setBannerUrl(newBannerUrl);
      toast.success('Banner updated successfully');
      onUpdate();
    } catch (error) {
      console.error('Error uploading banner:', error);
      toast.error('Failed to upload banner');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('classes')
      .update({
        name: formData.name,
        section: formData.section || null,
        subject: formData.subject || null,
        description: formData.description || null,
        color: formData.color,
      })
      .eq('id', classData.id);

    if (error) {
      toast.error('Failed to save settings');
    } else {
      toast.success('Settings saved');
      onUpdate();
      onOpenChange(false);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Class Settings</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="invite">Invite</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Class Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="section">Section</Label>
                <Input
                  id="section"
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  placeholder="e.g., Period 1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g., Mathematics"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="About this class..."
                rows={3}
              />
            </div>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Theme Color
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      formData.color === color.value
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div
                      className={`h-8 rounded-md bg-gradient-to-r ${
                        color.value === 'green' ? 'from-emerald-500 to-teal-600' :
                        color.value === 'blue' ? 'from-blue-500 to-indigo-600' :
                        color.value === 'purple' ? 'from-purple-500 to-pink-600' :
                        color.value === 'red' ? 'from-red-500 to-rose-600' :
                        color.value === 'orange' ? 'from-orange-500 to-amber-600' :
                        'from-teal-500 to-cyan-600'
                      }`}
                    />
                    <span className="text-xs mt-1 block">{color.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                Banner Image
              </Label>
              <div className="relative">
                {bannerUrl ? (
                  <div className="relative rounded-lg overflow-hidden">
                    <img
                      src={bannerUrl}
                      alt="Class banner"
                      className="w-full h-32 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => bannerInputRef.current?.click()}
                        disabled={uploadingBanner}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Change
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => bannerInputRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors"
                    disabled={uploadingBanner}
                  >
                    {uploadingBanner ? (
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Upload banner image</span>
                      </>
                    )}
                  </button>
                )}
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBannerUpload}
                  className="hidden"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="invite" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Class Code</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-4 py-3 bg-muted rounded-lg font-mono text-xl tracking-widest text-center">
                  {classData.class_code}
                </div>
                <Button variant="outline" size="icon" onClick={handleCopyCode}>
                  {codeCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="icon" onClick={handleResetCode}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this code with students to let them join the class.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
