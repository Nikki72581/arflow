"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DocumentType } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateDocumentTypeSettings } from "@/app/actions/document-type-settings";
import { useToast } from "@/hooks/use-toast";
import { Loader2, GripVertical } from "lucide-react";

interface DocumentTypeSetting {
  id: string;
  organizationId: string;
  documentType: DocumentType;
  enabled: boolean;
  displayName: string;
  displayOrder: number;
}

interface DocumentTypeSettingsFormProps {
  initialSettings: DocumentTypeSetting[];
}

const DEFAULT_DISPLAY_NAMES: Record<DocumentType, string> = {
  INVOICE: "Invoice",
  QUOTE: "Quote",
  ORDER: "Order",
  CREDIT_MEMO: "Credit Memo",
  DEBIT_MEMO: "Debit Memo",
};

const MAIN_DOCUMENT_TYPES: DocumentType[] = [
  DocumentType.INVOICE,
  DocumentType.QUOTE,
  DocumentType.ORDER,
];

export function DocumentTypeSettingsForm({ initialSettings }: DocumentTypeSettingsFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Ensure all main document types are represented
  const ensureAllTypes = (settings: DocumentTypeSetting[]): DocumentTypeSetting[] => {
    const existingTypes = new Set(settings.map(s => s.documentType));
    const missingTypes = MAIN_DOCUMENT_TYPES.filter(type => !existingTypes.has(type));

    const newSettings = [...settings];
    missingTypes.forEach((type, index) => {
      newSettings.push({
        id: `temp-${type}`,
        organizationId: settings[0]?.organizationId || "",
        documentType: type,
        enabled: true,
        displayName: DEFAULT_DISPLAY_NAMES[type],
        displayOrder: settings.length + index,
      });
    });

    return newSettings.sort((a, b) => a.displayOrder - b.displayOrder);
  };

  const [settings, setSettings] = useState<DocumentTypeSetting[]>(
    ensureAllTypes(initialSettings)
  );

  const handleToggle = (documentType: DocumentType) => {
    setSettings(prev =>
      prev.map(s =>
        s.documentType === documentType ? { ...s, enabled: !s.enabled } : s
      )
    );
  };

  const handleDisplayNameChange = (documentType: DocumentType, displayName: string) => {
    setSettings(prev =>
      prev.map(s =>
        s.documentType === documentType ? { ...s, displayName } : s
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDocumentTypeSettings(
        settings.map(s => ({
          documentType: s.documentType,
          enabled: s.enabled,
          displayName: s.displayName,
          displayOrder: s.displayOrder,
        }))
      );

      toast({
        title: "Settings saved",
        description: "Document type settings have been updated successfully.",
      });

      router.refresh();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = (documentType: DocumentType) => {
    setSettings(prev =>
      prev.map(s =>
        s.documentType === documentType
          ? { ...s, displayName: DEFAULT_DISPLAY_NAMES[documentType] }
          : s
      )
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Type Configuration</CardTitle>
        <CardDescription>
          Enable or disable document types and customize how they appear in your application.
          Changes will affect all users in your organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {settings
            .filter(s => MAIN_DOCUMENT_TYPES.includes(s.documentType))
            .map((setting) => (
              <div
                key={setting.documentType}
                className="flex items-center gap-4 p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-center gap-2 flex-1">
                  <GripVertical className="h-5 w-5 text-muted-foreground/50" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <Switch
                        id={`toggle-${setting.documentType}`}
                        checked={setting.enabled}
                        onCheckedChange={() => handleToggle(setting.documentType)}
                      />
                      <Label
                        htmlFor={`toggle-${setting.documentType}`}
                        className="text-base font-medium cursor-pointer"
                      >
                        {DEFAULT_DISPLAY_NAMES[setting.documentType]}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2 ml-11">
                      <Label
                        htmlFor={`display-${setting.documentType}`}
                        className="text-sm text-muted-foreground whitespace-nowrap"
                      >
                        Display as:
                      </Label>
                      <Input
                        id={`display-${setting.documentType}`}
                        value={setting.displayName}
                        onChange={(e) =>
                          handleDisplayNameChange(setting.documentType, e.target.value)
                        }
                        disabled={!setting.enabled}
                        className="max-w-xs"
                        placeholder={DEFAULT_DISPLAY_NAMES[setting.documentType]}
                      />
                      {setting.displayName !== DEFAULT_DISPLAY_NAMES[setting.documentType] && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReset(setting.documentType)}
                          disabled={!setting.enabled}
                        >
                          Reset
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
