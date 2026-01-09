'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { testAcumaticaConnection } from '@/actions/integrations/acumatica/connection';

export default function DebugPage() {
  const [result, setResult] = useState<string>('');

  const handleTest = async () => {
    try {
      setResult('Testing...');

      const testResult = await testAcumaticaConnection({
        instanceUrl: 'https://islandparts.acumatica.com/',
        apiVersion: '24.200.001',
        companyId: 'DYER',
        username: 'NicoleRonchetti',
        password: 'Nicole@01',
      });

      setResult(JSON.stringify(testResult, null, 2));
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="p-8">
      <Card>
        <CardHeader>
          <CardTitle>Acumatica Integration Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleTest}>Test Server Action</Button>

          {result && (
            <pre className="bg-muted/60 p-4 rounded overflow-auto border border-border">
              {result}
            </pre>
          )}

          <div className="space-y-2 text-sm">
            <h3 className="font-semibold">Checklist:</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>ENCRYPTION_KEY set in .env.local</li>
              <li>Database migration run (npx prisma migrate dev)</li>
              <li>Prisma client regenerated (npx prisma generate)</li>
              <li>Dev server restarted</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
