'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { testEmailConfiguration } from '@/app/actions/email'
import { getEmailConfigStatus } from '@/app/actions/email-config'
import { Mail, CheckCircle2, XCircle, Loader2, Send, AlertTriangle, ExternalLink } from 'lucide-react'

interface EmailConfigStatus {
  configured: boolean
  apiKeyPresent: boolean
  fromEmail: string
  replyToEmail?: string
  missingConfig: string[]
}

export function EmailSettings() {
  const [configStatus, setConfigStatus] = useState<EmailConfigStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [testEmail, setTestEmail] = useState('')
  const [testingSending, setTestSending] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null)

  useEffect(() => {
    loadEmailConfig()
  }, [])

  async function loadEmailConfig() {
    try {
      setLoading(true)
      const result = await getEmailConfigStatus()
      if (result.success && result.data) {
        setConfigStatus(result.data)
      } else {
        console.error('Failed to load email config:', result.error)
      }
    } catch (error) {
      console.error('Error loading email config:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleTestEmail() {
    if (!testEmail) {
      setTestResult({ success: false, error: 'Please enter an email address' })
      return
    }

    setTestSending(true)
    setTestResult(null)

    try {
      const result = await testEmailConfiguration(testEmail)
      setTestResult(result)
    } catch (error: any) {
      setTestResult({ success: false, error: error.message || 'Failed to send test email' })
    } finally {
      setTestSending(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            <CardTitle>Email Configuration</CardTitle>
          </div>
          <CardDescription>
            Configure and test email service integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          <CardTitle>Email Configuration</CardTitle>
        </div>
        <CardDescription>
          Configure and test email service integration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border-2 bg-card">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {configStatus?.configured ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-700 dark:text-green-400">
                      Email Service Configured
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="font-semibold text-red-700 dark:text-red-400">
                      Email Service Not Configured
                    </span>
                  </>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {configStatus?.configured
                  ? 'Your email service is properly set up and ready to send emails.'
                  : 'Email service requires configuration to send emails.'}
              </p>
            </div>
          </div>

          {/* Configuration Details */}
          <div className="grid gap-4 p-4 rounded-lg border bg-muted/30">
            <div className="grid gap-2">
              <Label className="text-sm font-medium">API Key Status</Label>
              <div className="flex items-center gap-2">
                {configStatus?.apiKeyPresent ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700 dark:text-green-400">
                      Configured
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-700 dark:text-red-400">
                      Not Configured
                    </span>
                  </>
                )}
              </div>
            </div>

            <Separator />

            <div className="grid gap-2">
              <Label className="text-sm font-medium">From Email</Label>
              <p className="text-sm font-mono bg-background px-3 py-2 rounded border">
                {configStatus?.fromEmail || 'Not set'}
              </p>
            </div>

            {configStatus?.replyToEmail && (
              <>
                <Separator />
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Reply-To Email</Label>
                  <p className="text-sm font-mono bg-background px-3 py-2 rounded border">
                    {configStatus.replyToEmail}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Missing Configuration Warning */}
          {!configStatus?.configured && configStatus?.missingConfig && configStatus.missingConfig.length > 0 && (
            <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                <div className="space-y-2">
                  <p className="font-semibold">Missing Configuration:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {configStatus.missingConfig.map((key) => (
                      <li key={key}>{key}</li>
                    ))}
                  </ul>
                  <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-800">
                    <p className="text-sm font-semibold mb-1">Setup Instructions:</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Sign up for a free account at <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="font-medium underline inline-flex items-center gap-1">Resend <ExternalLink className="h-3 w-3" /></a></li>
                      <li>Get your API key from the dashboard</li>
                      <li>Add <code className="bg-orange-100 dark:bg-orange-900 px-1 py-0.5 rounded">RESEND_API_KEY</code> to your environment variables</li>
                      <li>Restart your development server</li>
                    </ol>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Test Email Section */}
          <Separator />

          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-1">Test Email Configuration</h4>
              <p className="text-sm text-muted-foreground">
                Send a test email to verify your configuration is working correctly.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="testEmail">Test Email Address</Label>
              <div className="flex gap-2">
                <Input
                  id="testEmail"
                  type="email"
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  disabled={!configStatus?.configured || testingSending}
                />
                <Button
                  onClick={handleTestEmail}
                  disabled={!configStatus?.configured || !testEmail || testingSending}
                  className="shrink-0"
                >
                  {testingSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Test
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Test Result */}
            {testResult && (
              <Alert className={testResult.success ? 'border-green-200 bg-green-50 dark:bg-green-950/20' : 'border-red-200 bg-red-50 dark:bg-red-950/20'}>
                {testResult.success ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800 dark:text-green-200">
                      <p className="font-semibold">Test email sent successfully!</p>
                      <p className="text-sm mt-1">
                        Check your inbox at {testEmail} for the test email.
                      </p>
                    </AlertDescription>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800 dark:text-red-200">
                      <p className="font-semibold">Failed to send test email</p>
                      <p className="text-sm mt-1">{testResult.error}</p>
                    </AlertDescription>
                  </>
                )}
              </Alert>
            )}
          </div>

          {/* Email Features */}
          <Separator />

          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-1">Email Features</h4>
              <p className="text-sm text-muted-foreground">
                Current email capabilities in ARFlow
              </p>
            </div>

            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium text-sm">Invoice Email Sharing</p>
                  <p className="text-xs text-muted-foreground">
                    Send invoices to customers with payment links via email
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
